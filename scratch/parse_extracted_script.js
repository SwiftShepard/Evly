import fs from 'fs';

const filePath = 'c:/Users/Valentin/Desktop/Evly/scratch/lh_extracted_script.js';
const jsContent = fs.readFileSync(filePath, 'utf8');

// The file contains window.WIZ_global_data = { ... };
// Let's try to extract the JSON string.
const startIdx = jsContent.indexOf('window.WIZ_global_data = ');
if (startIdx !== -1) {
  const jsonStart = startIdx + 'window.WIZ_global_data = '.length;
  // It ends before the next script tag or semicolon, let's find the closing semicolon
  const jsonEnd = jsContent.indexOf('};', jsonStart);
  if (jsonEnd !== -1) {
    const jsonStr = jsContent.substring(jsonStart, jsonEnd + 1);
    try {
      const data = JSON.parse(jsonStr);
      console.log("Successfully parsed window.WIZ_global_data!");
      console.log("Keys in data:", Object.keys(data));
      
      // Let's search inside data for any lighthouse results
      // Sometimes it is nested deep or stringified. Let's do a recursive search.
      const searchForLighthouse = (obj, path = '') => {
        if (!obj) return;
        if (typeof obj === 'string') {
          if (obj.includes('total-blocking-time') || obj.includes('speed-index')) {
            console.log(`Found reference in string at path: ${path} (length: ${obj.length})`);
            if (obj.length < 500) {
              console.log("Content:", obj);
            } else {
              // Try to parse the string as JSON
              try {
                const parsed = JSON.parse(obj);
                console.log(`Successfully parsed nested JSON at ${path}!`);
                inspectLighthouseResult(parsed);
              } catch (e) {
                console.log(`Could not parse nested JSON at ${path}`);
              }
            }
          }
        } else if (typeof obj === 'object') {
          for (const key of Object.keys(obj)) {
            searchForLighthouse(obj[key], path ? `${path}.${key}` : key);
          }
        }
      };
      
      searchForLighthouse(data);
      
    } catch (e) {
      console.error("Error parsing JSON:", e);
    }
  }
}

function inspectLighthouseResult(lh) {
  // Let's print out the audits and scores if they exist
  // Lighthouse JSON has: audits, categories, environment, timing, etc.
  console.log("Lighthouse keys:", Object.keys(lh));
  if (lh.requestedUrl) console.log("Requested URL:", lh.requestedUrl);
  if (lh.fetchTime) console.log("Fetch Time:", lh.fetchTime);
  
  if (lh.categories) {
    console.log("Categories:");
    for (const catId of Object.keys(lh.categories)) {
      console.log(`- ${catId}: ${lh.categories[catId].score * 100}`);
    }
  }
  
  if (lh.audits) {
    console.log("Key Audits:");
    const keyAudits = [
      'total-blocking-time',
      'speed-index',
      'first-contentful-paint',
      'largest-contentful-paint',
      'cumulative-layout-shift',
      'color-contrast',
      'font-display',
      'render-blocking-resources',
      'dom-size'
    ];
    for (const auditId of keyAudits) {
      if (lh.audits[auditId]) {
        const audit = lh.audits[auditId];
        console.log(`- ${auditId}: score=${audit.score}, numericValue=${audit.numericValue}, displayValue=${audit.displayValue}`);
        if (audit.details && audit.details.items) {
          console.log(`  Details items count: ${audit.details.items.length}`);
          if (audit.details.items.length > 0) {
            console.log(`  First item:`, JSON.stringify(audit.details.items[0], null, 2));
          }
        }
      }
    }
  }
}
