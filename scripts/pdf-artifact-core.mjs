import { createHash } from 'node:crypto';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';

export async function validateGenericPdf(
  input,
  { exactPages, maxPages = 100 } = {},
) {
  const buffer = Buffer.isBuffer(input) ? input : Buffer.from(input);
  const checks = [];
  const add = (id, valid, detail) => checks.push({ id, valid, detail });
  add(
    'pdf-signature',
    buffer.subarray(0, 5).toString('ascii') === '%PDF-',
    'file starts with a PDF signature',
  );
  add('non-empty', buffer.length >= 500, `${buffer.length} bytes`);

  let pages = 0;
  try {
    const task = getDocument({
      data: new Uint8Array(buffer),
      isEvalSupported: false,
      useWorkerFetch: false,
    });
    const document = await task.promise;
    pages = document.numPages;
    await document.destroy();
    add('pdfjs-parse', true, `${pages} page(s)`);
  } catch (error) {
    add('pdfjs-parse', false, error.message);
  }
  add('positive-page-count', pages > 0, `${pages} page(s)`);
  add('maximum-page-count', pages <= maxPages, `${pages}/${maxPages}`);
  if (exactPages !== undefined) {
    add('exact-page-count', pages === exactPages, `${pages}/${exactPages}`);
  }
  return {
    valid: checks.every((check) => check.valid),
    pageCount: pages,
    size: buffer.length,
    sha256: createHash('sha256').update(buffer).digest('hex'),
    checks,
  };
}
