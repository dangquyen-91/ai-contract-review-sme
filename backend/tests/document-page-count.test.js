const { execFileSync } = require('child_process');
const path = require('path');

function runConversionFixture(fail) {
  // Run outside Jest's VM so the real MuPDF ESM module can parse the fixture PDF.
  const script = `
    const assert = require('assert/strict'), fs = require('fs'), path = require('path');
    const child = require('child_process');
    let temporaryDirectory;
    child.execFile = (executable, args, options, callback) => {
      assert.equal(executable, 'fixture-libreoffice');
      assert.equal(options.windowsHide, true); assert.equal(options.timeout, 60000);
      assert.ok(args.includes('--headless')); assert.ok(args.includes('pdf:writer_pdf_Export'));
      temporaryDirectory = args[args.indexOf('--outdir') + 1];
      assert.equal(path.dirname(args.at(-1)), temporaryDirectory);
      assert.equal(fs.readFileSync(args.at(-1)).toString(), 'DOCX fixture');
      assert.ok(args[0].startsWith('-env:UserInstallation=file:'));
      if (${JSON.stringify(fail)}) return callback(new Error('Converter unavailable'));
      const pages = Array.from({ length: 12 }, (_, index) => index + 3);
      const objects = [
        '<< /Type /Catalog /Pages 2 0 R >>',
        '<< /Type /Pages /Count 12 /Kids [' + pages.map(id => id + ' 0 R').join(' ') + '] >>',
        ...pages.map(() => '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << >> >>')
      ];
      let pdf = '%PDF-1.4\\n', offsets = [0];
      objects.forEach((value, index) => { offsets.push(Buffer.byteLength(pdf)); pdf += (index + 1) + ' 0 obj\\n' + value + '\\nendobj\\n'; });
      const start = Buffer.byteLength(pdf);
      pdf += 'xref\\n0 ' + (objects.length + 1) + '\\n0000000000 65535 f \\n' + offsets.slice(1).map(offset => String(offset).padStart(10, '0') + ' 00000 n \\n').join('');
      pdf += 'trailer\\n<< /Size ' + (objects.length + 1) + ' /Root 1 0 R >>\\nstartxref\\n' + start + '\\n%%EOF';
      fs.writeFileSync(path.join(temporaryDirectory, 'contract.pdf'), pdf); callback(null);
    };
    const { countDocxPages } = require('./dist/services/contract/documentPageCount.service');
    (async () => {
      try { const count = await countDocxPages(Buffer.from('DOCX fixture')); assert.equal(count, 12); assert.equal(${JSON.stringify(fail)}, false); }
      catch (error) { assert.equal(${JSON.stringify(fail)}, true); assert.equal(error.statusCode, 503); assert.equal(error.code, 'REVIEW_PAGE_COUNT_UNAVAILABLE'); }
      assert.equal(fs.existsSync(temporaryDirectory), false);
      console.log('PASS');
    })().catch(error => { console.error(error); process.exitCode = 1; });
  `;
  return execFileSync(process.execPath, ['-e', script], { cwd: path.resolve(__dirname, '..'), timeout: 30000, windowsHide: true, env: { ...process.env, NODE_ENV: 'test', MONGODB_URI: 'mongodb://127.0.0.1/unused', JWT_ACCESS_SECRET: 'fixture', JWT_REFRESH_SECRET: 'fixture', DATA_ENCRYPTION_KEY: Buffer.alloc(32, 7).toString('base64'), LIBREOFFICE_PATH: 'fixture-libreoffice' } }).toString();
}
test('DOCX conversion uses isolated files, counts the real PDF pages and cleans up', () => { expect(runConversionFixture(false)).toContain('PASS'); });
test('unavailable DOCX conversion reports an explicit error and removes temporary documents', () => { expect(runConversionFixture(true)).toContain('PASS'); });
