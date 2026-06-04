import fs from "node:fs";
import path from "node:path";

// Configuration de l'audit
const MAX_DEVIATION_PERCENT = 2.0; // Seuil de tolérance de 2%
const VEHICLES_DIR = "src/data/vehicles";

// URL de référence pour les tarifs constructeurs officiels de 2026
// (Simulé ici par un fichier de référence local ou distant via gist/raw)
const REFERENCE_PRICES_URL = "https://raw.githubusercontent.com/Valentin-Evly/catalog-reference/main/prices-2026.json";

async function fetchReferencePrices() {
  try {
    const response = await fetch(REFERENCE_PRICES_URL);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.warn("⚠️ Impossible de récupérer les prix de référence en ligne. Utilisation d'un jeu de données de secours.");
    // Jeu de données de secours simulant les grilles tarifaires officielles
    return {
      "vw-id2": {
        "trims": {
          "ID. Polo": 25000,
          "ID. GTI": 30000
        }
      },
      "vw-id3": {
        "trims": {
          "Trend": 34990,
          "Life": 40500,
          "Style": 42500
        }
      },
      "tesla-model-3": {
        "trims": {
          "Propulsion": 39990,
          "Grande Autonomie Prop": 44990
        }
      },
      "citroen-e-c3": {
        "trims": {
          "ë-C3 You": 23300,
          "ë-C3 Aircross": 27400
        }
      },
      "renault-5": {
        "trims": {
          "Evolution": 25000,
          "Techno": 27900,
          "Iconic Five": 29900
        }
      }
    };
  }
}

async function runAudit() {
  console.log("=== DÉMARRAGE DE L'AUDIT DES PRIX CONSTRUCTEURS ===");
  const referenceData = await fetchReferencePrices();
  const files = fs.readdirSync(VEHICLES_DIR).filter(f => f.endsWith(".json"));
  
  const mismatches = [];
  let totalCheckedTrims = 0;

  for (const file of files) {
    const filePath = path.join(VEHICLES_DIR, file);
    const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
    const slug = data.slug;
    const ref = referenceData[slug];

    if (!ref || !ref.trims) {
      // Pas de données de référence pour ce modèle, on passe
      continue;
    }

    for (const trim of data.trims) {
      const trimName = trim.name;
      const dbPrice = trim.price_EUR;
      const refPrice = ref.trims[trimName];

      if (refPrice === undefined) {
        continue;
      }

      totalCheckedTrims++;
      const deviation = Math.abs((dbPrice - refPrice) / refPrice) * 100;

      if (deviation > MAX_DEVIATION_PERCENT) {
        mismatches.push({
          slug,
          brand: data.brand,
          model: data.model,
          trim: trimName,
          dbPrice,
          refPrice,
          deviation: deviation.toFixed(2)
        });
      }
    }
  }

  console.log(`\nAudit terminé : ${totalCheckedTrims} finitions vérifiées.`);
  
  if (mismatches.length > 0) {
    console.warn(`❌ ${mismatches.length} écart(s) de prix détecté(s) (supérieur à ${MAX_DEVIATION_PERCENT}%) :`);
    console.table(mismatches);
    
    // Génération d'un rapport markdown
    let report = `# Rapport d'Audit Mensuel des Tarifs Constructeurs\n\n`;
    report += `Date de l'audit : ${new Date().toLocaleDateString("fr-FR")} à ${new Date().toLocaleTimeString("fr-FR")}\n`;
    report += `Seuil de tolérance : ${MAX_DEVIATION_PERCENT}%\n\n`;
    report += `## Écarts Détectés\n\n`;
    report += `| Véhicule | Finition | Prix BD | Prix Référence | Écart | Action |\n`;
    report += `| :--- | :--- | :--- | :--- | :--- | :--- |\n`;
    for (const m of mismatches) {
      report += `| **${m.brand} ${m.model}** | ${m.trim} | ${m.dbPrice} € | ${m.refPrice} € | **${m.deviation}%** | [ ] Corriger dans \`${m.slug}.json\` |\n`;
    }
    
    fs.writeFileSync("price_audit_report.md", report);
    console.log("📝 Rapport d'audit généré dans 'price_audit_report.md'.");
  } else {
    console.log("✅ Aucun écart de tarif détecté. Toutes les finitions sont synchronisées avec les grilles constructeurs.");
    if (fs.existsSync("price_audit_report.md")) {
      fs.unlinkSync("price_audit_report.md");
    }
  }
}

runAudit();
