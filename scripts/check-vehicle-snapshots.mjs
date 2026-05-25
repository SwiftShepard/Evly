import fs from "node:fs";
import path from "node:path";

const vehiclesDir = "src/data/vehicles";
const snapshotPath = "tests/snapshots/vehicles-specs.json";
const updateFlag = process.argv.includes("--update");

// 1. Gather current specs
if (!fs.existsSync(vehiclesDir)) {
  console.error(`Error: Vehicles directory not found at ${vehiclesDir}`);
  process.exit(1);
}

const files = fs.readdirSync(vehiclesDir).filter(f => f.endsWith(".json"));
const currentSpecs = [];

for (const file of files) {
  const filepath = path.join(vehiclesDir, file);
  try {
    const data = JSON.parse(fs.readFileSync(filepath, "utf8"));
    currentSpecs.push({
      slug: data.slug || path.basename(file, ".json"),
      brand: data.brand,
      model: data.model,
      power_kW: data.power_kW,
      usableCapacity_kWh: data.usableCapacity_kWh,
      wltp_min_km: data.wltp_min_km,
      wltp_max_km: data.wltp_max_km,
      configurations_count: data.configurations ? data.configurations.length : 0,
      configuration_ids: data.configurations ? data.configurations.map(c => c.id).sort() : []
    });
  } catch (e) {
    console.error(`Error parsing JSON in ${file}:`, e.message);
    process.exit(1);
  }
}

// Sort alphabetically by slug for deterministic snapshots
currentSpecs.sort((a, b) => a.slug.localeCompare(b.slug));

// Ensure target directory exists if we need to update
const snapshotDir = path.dirname(snapshotPath);
if (!fs.existsSync(snapshotDir)) {
  fs.mkdirSync(snapshotDir, { recursive: true });
}

// 2. Handle update option
if (updateFlag) {
  fs.writeFileSync(snapshotPath, JSON.stringify(currentSpecs, null, 2), "utf8");
  console.log(`Successfully updated snapshot at ${snapshotPath} with ${currentSpecs.length} vehicles.`);
  process.exit(0);
}

// 3. Compare with snapshot
if (!fs.existsSync(snapshotPath)) {
  console.error(`Error: Snapshot file does not exist at ${snapshotPath}.`);
  console.error("Run this script with '--update' to generate the initial snapshot:");
  console.error("  node scripts/check-vehicle-snapshots.mjs --update");
  process.exit(1);
}

let snapshotSpecs;
try {
  snapshotSpecs = JSON.parse(fs.readFileSync(snapshotPath, "utf8"));
} catch (e) {
  console.error(`Error parsing snapshot file at ${snapshotPath}:`, e.message);
  process.exit(1);
}

// Perform deep comparison
const currentMap = new Map(currentSpecs.map(s => [s.slug, s]));
const snapshotMap = new Map(snapshotSpecs.map(s => [s.slug, s]));

const added = [];
const removed = [];
const modified = [];

// Find added and modified
for (const [slug, current] of currentMap.entries()) {
  const snapshot = snapshotMap.get(slug);
  if (!snapshot) {
    added.push(slug);
  } else {
    // Compare fields
    const changes = [];
    const fields = ["brand", "model", "power_kW", "usableCapacity_kWh", "wltp_min_km", "wltp_max_km", "configurations_count"];
    
    for (const field of fields) {
      if (current[field] !== snapshot[field]) {
        changes.push({
          field,
          oldVal: snapshot[field],
          newVal: current[field]
        });
      }
    }
    
    // Compare configurations lists
    const currentConfigs = current.configuration_ids.join(",");
    const snapshotConfigs = snapshot.configuration_ids.join(",");
    if (currentConfigs !== snapshotConfigs) {
      changes.push({
        field: "configuration_ids",
        oldVal: snapshot.configuration_ids,
        newVal: current.configuration_ids
      });
    }

    if (changes.length > 0) {
      modified.push({ slug, changes });
    }
  }
}

// Find removed
for (const slug of snapshotMap.keys()) {
  if (!currentMap.has(slug)) {
    removed.push(slug);
  }
}

// 4. Report differences
if (added.length > 0 || removed.length > 0 || modified.length > 0) {
  console.error("regression check failed: Changes detected in vehicle database.");
  
  if (added.length > 0) {
    console.error("\nAdded vehicles:");
    for (const slug of added) {
      console.error(`  + ${slug}`);
    }
  }
  
  if (removed.length > 0) {
    console.error("\nRemoved vehicles:");
    for (const slug of removed) {
      console.error(`  - ${slug}`);
    }
  }
  
  if (modified.length > 0) {
    console.error("\nModified vehicles:");
    for (const item of modified) {
      console.error(`  * ${item.slug}:`);
      for (const change of item.changes) {
        if (change.field === "configuration_ids") {
          console.error(`    - configuration_ids changed from [${change.oldVal.join(", ")}] to [${change.newVal.join(", ")}]`);
        } else {
          console.error(`    - ${change.field} changed from ${change.oldVal} to ${change.newVal}`);
        }
      }
    }
  }
  
  console.error("\nIf these changes are intentional, update the snapshot file using:");
  console.error("  node scripts/check-vehicle-snapshots.mjs --update");
  process.exit(1);
}

console.log("regression check passed: Vehicle specs match snapshot.");
process.exit(0);
