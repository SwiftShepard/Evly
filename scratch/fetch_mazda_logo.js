import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function fetchSvg(url, filename) {
  return new Promise((resolve, reject) => {
    const options = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    };
    https.get(url, options, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`Failed to fetch ${url}: Status ${res.statusCode}`));
        return;
      }
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        const dest = path.join(__dirname, '..', 'src', 'assets', 'logos', filename);
        fs.writeFileSync(dest, data);
        console.log(`Successfully saved ${filename} to ${dest}`);
        resolve();
      });
    }).on('error', reject);
  });
}

async function main() {
  const logosDir = path.join(__dirname, '..', 'src', 'assets', 'logos');
  if (!fs.existsSync(logosDir)) {
    fs.mkdirSync(logosDir, { recursive: true });
  }
  
  // Potential raw URLs for Mazda logo SVG
  const urls = [
    'https://raw.githubusercontent.com/tipstrade/node-vehicle-logos/master/assets/mazda.svg',
    'https://raw.githubusercontent.com/tipstrade/node-vehicle-logos/main/assets/mazda.svg',
    'https://raw.githubusercontent.com/cardog/cardog-icons/main/icons/mazda.svg',
    'https://raw.githubusercontent.com/cardog/cardog-icons/master/icons/mazda.svg',
    'https://raw.githubusercontent.com/simple-icons/simple-icons/develop/icons/mazda.svg'
  ];

  let success = false;
  for (const url of urls) {
    try {
      console.log(`Trying to fetch: ${url}`);
      await fetchSvg(url, 'mazda.svg');
      success = true;
      break;
    } catch (err) {
      console.error(`Error: ${err.message}`);
    }
  }

  if (!success) {
    console.error('All URLs failed. We might need to write a fallback placeholder.');
  }
}

main();
