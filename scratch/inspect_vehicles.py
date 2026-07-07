import os
import json

vehicles_dir = 'src/data/vehicles'
for filename in os.listdir(vehicles_dir):
    if filename.endswith('.json'):
        filepath = os.path.join(vehicles_dir, filename)
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                data = json.load(f)
            ma = data.get('marketAvailability', 'Unknown')
            slug = data.get('slug', filename)
            trims = data.get('trims', [])
            prices = [t.get('price_EUR') for t in trims]
            print(f"{slug}: {ma} | Trims: {prices}")
        except Exception as e:
            print(f"Error reading {filename}: {e}")
