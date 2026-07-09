import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const distDir = path.resolve('dist');
const htmlPath = path.join(distDir, 'index.html');
const html = await readFile(htmlPath, 'utf8');

function moveEntryModuleToBodyEnd(value) {
  const scriptPattern = /<script type="module" crossorigin src="([^"]+\.js)"><\/script>/;
  const match = value.match(scriptPattern);

  if (!match) return value;

  const [scriptTag] = match;
  return value
    .replace(scriptPattern, '')
    .replace('</body>', `  ${scriptTag}\n</body>`);
}

const stylesheetPattern = /<link rel="stylesheet"[^>]*href="([^"]+\.css)"[^>]*>/;
const match = html.match(stylesheetPattern);

if (!match) {
  const updatedHtml = moveEntryModuleToBodyEnd(html);
  await writeFile(htmlPath, updatedHtml);
  console.log('No build stylesheet found to inline; moved entry module if present.');
  process.exit(0);
}

const cssHref = match[1];
const cssPath = path.join(distDir, cssHref.replace(/^\//, ''));
const css = await readFile(cssPath, 'utf8');
const styleTag = `<style data-inline-build-css>${css}</style>`;
const updatedHtml = moveEntryModuleToBodyEnd(html.replace(stylesheetPattern, styleTag));

await writeFile(htmlPath, updatedHtml);
console.log(`Inlined ${cssHref} and moved entry module to body end in dist/index.html.`);
