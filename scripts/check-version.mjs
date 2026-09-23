import { readFileSync } from 'node:fs';
const manifest = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
if (!/^\d+\.\d+\.\d+$/.test(manifest.version)) throw new Error('A versão em package.json deve seguir X.Y.Z.');
console.log(`Versão global: v${manifest.version}`);
