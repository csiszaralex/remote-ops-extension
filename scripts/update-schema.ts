import * as fs from 'fs';
import * as path from 'path';
import * as z from 'zod'; // A natív Zod importálása

// A require továbbra is a legbiztonságosabb a modul-kavarodás elkerülésére
const ConfigSchemaModule = require('../src/configSchema');
const RemoteOpsSettingsSchema =
  ConfigSchemaModule.RemoteOpsSettingsSchema || ConfigSchemaModule.default?.RemoteOpsSettingsSchema;

if (!RemoteOpsSettingsSchema) {
  console.error('❌ Hiba: Nem sikerült betölteni a sémát az src/configSchema.ts-ből.');
  process.exit(1);
}

console.log('Séma betöltve, generálás natív Zod v4-gyel...');

// 1. JSON Schema generálása (NATÍV ZOD v4)
// A 'target' opcióval beállítjuk a verziót, ami a VS Code-nak kell
const jsonSchema = z.toJSONSchema(RemoteOpsSettingsSchema, {
  target: 'draft-07',
});

// A generált objektum gyökerében ott kell lennie a 'properties'-nek
const properties = (jsonSchema as any).properties;

if (!properties) {
  console.error("❌ HIBA: A generált JSON séma nem tartalmaz 'properties' mezőt.");
  console.log('Dump:', JSON.stringify(jsonSchema, null, 2));
  process.exit(1);
}

// 2. package.json beolvasása és frissítése
const packageJsonPath = path.join(__dirname, '..', 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));

if (!packageJson.contributes) packageJson.contributes = {};
if (!packageJson.contributes.configuration)
  packageJson.contributes.configuration = { title: 'Remote Ops' };

packageJson.contributes.configuration.properties = properties;

// 3. Visszaírás
fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));

console.log('✅ SIKER: package.json frissítve (Zod Native)!');
