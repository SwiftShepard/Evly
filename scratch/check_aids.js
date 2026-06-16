import fs from 'fs';
import path from 'path';

const dir = 'src/data/vehicles';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));

for (const file of files) {
  const content = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'));
  if (content.availableAids && content.availableAids.length > 0) {
    console.log(`${content.slug}:`, content.availableAids.map(aid => `${aid.label}=${aid.amount_EUR}`).join(', '));
  }
}
