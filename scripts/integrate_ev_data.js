import fs from 'fs';
import path from 'path';

const resultsPath = 'scratch/ev_scraping_results.json';
const chargeCSVPath = 'scratch/bjorn_charge.csv';

if (!fs.existsSync(resultsPath)) {
  console.error('Error: ev_scraping_results.json not found. Run sync_ev_data.js first.');
  process.exit(1);
}

const { crossRef } = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

// Load charge data to build charging curves
const chargeCSVText = fs.readFileSync(chargeCSVPath, 'utf8');
const chargeLines = chargeCSVText.split(/\r?\n/);
const chargeHeaders = parseCSVLine(chargeLines[0]).map(h => h.trim());
const chargeData = [];
for (let i = 1; i < chargeLines.length; i++) {
  const line = chargeLines[i].trim();
  if (!line) continue;
  const values = parseCSVLine(line).map(v => v.trim());
  const row = {};
  chargeHeaders.forEach((h, idx) => {
    row[h] = values[idx] !== undefined ? values[idx] : '';
  });
  chargeData.push(row);
}

function parseTemperature(tempStr) {
  if (!tempStr) return null;
  const match = tempStr.match(/(-?\d+)/);
  return match ? parseInt(match[1]) : null;
}

let updatedCount = 0;

for (const match of crossRef) {
  const filePath = `src/data/vehicles/${match.slug}.json`;
  if (!fs.existsSync(filePath)) {
    console.warn(`Warning: File ${filePath} not found, skipping.`);
    continue;
  }
  
  const jsonData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  let modified = false;

  // 1. Autonomie autoroute à 130 km/h (la chaîne EV)
  if (match.lce) {
    if (!jsonData.realRange) jsonData.realRange = {};
    if (jsonData.realRange.highway_130_km !== match.lce.rangeReal) {
      jsonData.realRange.highway_130_km = match.lce.rangeReal;
      modified = true;
    }
  }

  // 2. Autonomie autoroute à 120 km/h (Bjørn Nyland)
  if (match.bjornRange) {
    if (!jsonData.realRange) jsonData.realRange = {};
    const range120 = parseInt(match.bjornRange.range_km);
    if (!isNaN(range120) && jsonData.realRange.highway_120_km !== range120) {
      jsonData.realRange.highway_120_km = range120;
      modified = true;
    }
  }

  // 3. Challenge 1000 km (Bjørn Nyland)
  if (match.bjorn1000k) {
    const timeParts = match.bjorn1000k.time.split(':');
    if (timeParts.length === 2) {
      const totalTime_minutes = parseInt(timeParts[0]) * 60 + parseInt(timeParts[1]);
      const avgSpeed = parseFloat(match.bjorn1000k.avg_speed.replace(',', '.'));
      const avgConso = parseFloat(match.bjorn1000k.consumption_Wh_km.replace(/\s/g, ''));
      const temp = parseTemperature(match.bjorn1000k.temp);
      
      const newChallenge = {
        sourceId: "nyland",
        totalTime_minutes: !isNaN(totalTime_minutes) ? totalTime_minutes : null,
        averageSpeed_kmh: !isNaN(avgSpeed) ? avgSpeed : null,
        averageConsumption_Wh_km: !isNaN(avgConso) ? avgConso : null,
        chargingStops: jsonData.thousandKmChallenge ? jsonData.thousandKmChallenge.chargingStops : null,
        averageTemperature_C: temp,
        testDate: match.bjorn1000k.date || null,
        videoUrl: jsonData.thousandKmChallenge ? jsonData.thousandKmChallenge.videoUrl : null,
        confidence: "tested"
      };

      // Simple deep equality check
      if (JSON.stringify(jsonData.thousandKmChallenge) !== JSON.stringify(newChallenge)) {
        jsonData.thousandKmChallenge = newChallenge;
        modified = true;
      }
    }
  }

  // 4. Courbe de charge SoC & Puissance Pic/Moyenne
  if (match.charge && match.charge.column) {
    const curvePoints = [];
    const targetSocs = [10, 20, 30, 40, 50, 60, 70, 80, 90];
    
    // Add SoC 0 point if we have it or construct from first rows
    let maxPower = 0;
    targetSocs.forEach(soc => {
      const row = chargeData.find(r => parseInt(r['SoC']) === soc);
      if (row && row[match.charge.column]) {
        const power = Math.round(parseFloat(row[match.charge.column]));
        if (!isNaN(power)) {
          curvePoints.push({ soc, power });
          if (power > maxPower) maxPower = power;
        }
      }
    });

    if (curvePoints.length >= 2) {
      // Sort points by SoC
      curvePoints.sort((a, b) => a.soc - b.soc);
      
      // Ensure we have a point at 0% or start of charge if needed (fallback/standard)
      if (curvePoints[0].soc > 0) {
        curvePoints.unshift({ soc: 0, power: Math.round(curvePoints[0].power * 0.8) });
      }
      if (curvePoints[curvePoints.length - 1].soc < 100) {
        curvePoints.push({ soc: 100, power: Math.round(curvePoints[curvePoints.length - 1].power * 0.1) });
      }

      if (JSON.stringify(jsonData.chargingCurve) !== JSON.stringify(curvePoints)) {
        jsonData.chargingCurve = curvePoints;
        modified = true;
      }

      // Check Zod schema consistency: chargingDC.peakPower_kW must be >= maxPower / 1.05
      if (!jsonData.chargingDC) jsonData.chargingDC = {};
      const declaredPeak = jsonData.chargingDC.peakPower_kW || 0;
      if (maxPower > declaredPeak) {
        jsonData.chargingDC.peakPower_kW = maxPower;
        jsonData.chargingDC.confidence = "tested";
        modified = true;
      }
    }
  }

  if (modified) {
    jsonData.lastUpdated = new Date().toISOString().split('T')[0];
    // Add nyland and la-chaine-ev sources if not already present
    if (!jsonData.sources) jsonData.sources = [];
    if (!jsonData.sources.includes("nyland")) jsonData.sources.push("nyland");
    if (!jsonData.sources.includes("la-chaine-ev")) jsonData.sources.push("la-chaine-ev");
    
    fs.writeFileSync(filePath, JSON.stringify(jsonData, null, 2) + '\n');
    console.log(`Updated ${match.slug}.json`);
    updatedCount++;
  }
}

console.log(`Successfully integrated real-world data into ${updatedCount} vehicle fiches!`);
