import fs from 'fs';
import vm from 'vm';

const filePath = 'c:/Users/Valentin/Desktop/Evly/scratch/lh_script_16.js';
const jsContent = fs.readFileSync(filePath, 'utf8');

// We define the callback function in the context
const context = {
  dataReceived: null,
  AF_initDataCallback: function(options) {
    context.dataReceived = options;
  }
};

vm.createContext(context);
vm.runInContext(jsContent, context);

if (context.dataReceived && context.dataReceived.data) {
  console.log("Successfully ran callback and received data!");
  // The report string is located in the data array: data[4][1][9]
  // Let's print data structure keys or lengths
  const reportString = context.dataReceived.data[4][1][9];
  console.log("Report string length:", reportString.length);
  
  const lh = JSON.parse(reportString);
  console.log("Lighthouse Report parsed successfully!");
  
  const cc = lh.audits['color-contrast'];
  console.log("\nContrast score:", cc.score);
  if (cc.details && cc.details.items) {
    console.log(`Found ${cc.details.items.length} contrast failures:`);
    cc.details.items.forEach((item, idx) => {
      console.log(`${idx + 1}. Selector: ${item.node.selector}`);
      console.log(`   Text: "${item.node.nodeLabel}"`);
      console.log(`   Explanation: ${item.explanation}`);
    });
  }
  
  // Let's also look at the TBT and Speed Index details to see what suggestions it has
  console.log("\n--- PERFORMANCE DETAIL ---");
  const performanceAudits = [
    'total-blocking-time',
    'speed-index',
    'bootup-time',
    'mainthread-work-breakdown',
    'first-contentful-paint',
    'largest-contentful-paint'
  ];
  performanceAudits.forEach(auditId => {
    const audit = lh.audits[auditId];
    if (audit) {
      console.log(`\n* ${audit.title} (${auditId})`);
      console.log(`  Score: ${audit.score}`);
      console.log(`  Value: ${audit.displayValue || audit.numericValue}`);
      if (audit.details && audit.details.items && audit.details.items.length > 0) {
        console.log(`  Details items:`);
        audit.details.items.slice(0, 3).forEach(item => {
          console.log(`    -`, JSON.stringify(item));
        });
      }
    }
  });

  // Let's write the parsed JSON report to a clean file for reference
  fs.writeFileSync('c:/Users/Valentin/Desktop/Evly/scratch/lh_report_clean.json', JSON.stringify(lh, null, 2));
  console.log("\nSaved clean JSON report to scratch/lh_report_clean.json");
} else {
  console.log("No data received from callback.");
}
