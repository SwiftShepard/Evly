const { chromium } = require('@playwright/test');

(async () => {
  console.log("Launching browser...");
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => {
    console.log(`BROWSER CONSOLE [${msg.type()}]: ${msg.text()}`);
  });
  
  page.on('pageerror', err => {
    console.error(`BROWSER ERROR: ${err.message}`);
    console.error(err.stack);
  });
  
  console.log("Navigating to http://localhost:4321/comparer/ ...");
  try {
    await page.goto('http://localhost:4321/comparer/', { waitUntil: 'networkidle' });
    console.log("Navigation finished. Waiting 2 seconds...");
    await page.waitForTimeout(2000);
  } catch (e) {
    console.error("Navigation failed:", e);
  }
  
  await browser.close();
  console.log("Done.");
})();
