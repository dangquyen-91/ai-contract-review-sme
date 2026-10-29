// Refresh a bundled directory; application requests never depend on this API.
const fs = require('node:fs');
const path = require('node:path');

async function main() {
  const source = 'https://provinces.open-api.vn/api/v2/?depth=2';
  const response = await fetch(source, { signal: AbortSignal.timeout(20000) });
  if (!response.ok) throw new Error(`Directory download failed: ${response.status}`);
  const rows = await response.json();
  if (!Array.isArray(rows) || rows.length !== 34) throw new Error('Expected the post-2025 list of 34 provinces');
  const wardCodes = new Set();
  const provinces = rows.map(province => ({
    code: String(province.code).padStart(2, '0'),
    name: province.name,
    wards: province.wards.map(ward => {
      const code = String(ward.code).padStart(5, '0');
      if (wardCodes.has(code) || typeof ward.name !== 'string' || !ward.name.trim()) throw new Error('Invalid or duplicate ward');
      wardCodes.add(code);
      return { code, name: ward.name };
    }),
  }));
  if (wardCodes.size !== 3321) throw new Error(`Expected 3321 wards; got ${wardCodes.size}. Review administrative changes before updating.`);
  const retrievedAt = process.argv[2] ?? new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date());
  if (!/^\d{4}-\d{2}-\d{2}$/.test(retrievedAt)) throw new Error('Invalid snapshot date');
  const directory = { source, retrievedAt, administrativeLevels: 2, provinces };
  const target = path.join(__dirname, '../src/data/vietnam-addresses.json');
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, JSON.stringify(directory) + '\n', 'utf8');
  console.log(`Saved ${provinces.length} provinces and ${wardCodes.size} wards; snapshot ${retrievedAt}.`);
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
