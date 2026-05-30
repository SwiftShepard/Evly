import fs from 'fs';
import https from 'https';

const sheets = {
  range: 'https://docs.google.com/spreadsheets/d/1V6ucyFGKWuSQzvI8lMzvvWJHrBS82echMVJH37kwgjE/export?format=csv&gid=735351678',
  time1000k: 'https://docs.google.com/spreadsheets/d/1V6ucyFGKWuSQzvI8lMzvvWJHrBS82echMVJH37kwgjE/export?format=csv&gid=15442336',
  charge: 'https://docs.google.com/spreadsheets/d/1hpXNhRxaIM06OBIKM8R1rOvYXlHgrWNpjWmK6Ra1zZ8/export?format=csv&gid=1593904708'
};

function download(url, dest) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        // Handle redirect
        download(res.headers.location, dest).then(resolve).catch(reject);
        return;
      }
      if (res.statusCode !== 200) {
        reject(new Error(`Failed to download ${url}: ${res.statusCode}`));
        return;
      }
      const file = fs.createWriteStream(dest);
      res.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', reject);
  });
}

async function main() {
  try {
    console.log('Downloading Range Sheet...');
    await download(sheets.range, 'scratch/bjorn_range.csv');
    console.log('Downloading 1000km Time Sheet...');
    await download(sheets.time1000k, 'scratch/bjorn_1000k.csv');
    console.log('Downloading Charge Curve Sheet...');
    await download(sheets.charge, 'scratch/bjorn_charge.csv');
    console.log('All downloads completed successfully!');
  } catch (err) {
    console.error('Error during download:', err);
  }
}

main();
