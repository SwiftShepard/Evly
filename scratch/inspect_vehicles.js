import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const vehiclesDir = path.join(__dirname, '../src/data/vehicles');
const files = fs.readdirSync(vehiclesDir).filter(f => f.endsWith('.json'));

const incompleteVehicles = [];

for (const file of files) {
  const content = JSON.parse(fs.readFileSync(path.join(vehiclesDir, file), 'utf8'));
  const brand = content.brand;
  const model = content.model;
  const variant = content.variant;
  const trimCount = content.trims ? content.trims.length : 0;
  const configCount = content.configurations ? content.configurations.length : 0;
  
  if (trimCount <= 1 || configCount <= 1) {
    incompleteVehicles.push({
      brand,
      model,
      variant,
      file,
      trimCount,
      configCount
    });
  }
}

console.log("\n--- INCOMPLETE VEHICLES (trimCount <= 1 OR configCount <= 1) ---");
incompleteVehicles.sort((a,b) => a.brand.localeCompare(b.brand) || a.model.localeCompare(b.model)).forEach(v => {
  console.log(`${v.brand} ${v.model} (${v.variant}) [${v.file}]: trims=${v.trimCount}, configs=${v.configCount}`);
});
