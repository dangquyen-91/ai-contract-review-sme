import fs from 'node:fs';
import ts from 'typescript';

// Route handlers and proxies import the backend URL helper. Test loaders run each file in its own
// VM context with a fake `process.env`, so the real helper is inlined to read that same context.
const helper = ts.transpileModule(fs.readFileSync(new URL('../../lib/api/backend.ts', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const inlined = `((() => { const exports = {}; ${helper}; return exports; })())`;

export const withBackendHelper = (source) => source.replace(/require\(["']@\/lib\/api\/backend["']\)/g, inlined);
