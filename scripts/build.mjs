// Assembles src/ into public/. Plain concatenation + esbuild minification; no bundler semantics,
// because the app relies on classic-script globals (inline handlers call top-level functions).
import { build, transform } from 'esbuild';
import { createHash } from 'node:crypto';
import { cp, mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = (...p) => join(root, 'src', ...p);
const out = (...p) => join(root, 'public', ...p);
const minify = !process.argv.includes('--dev');
const minifyCss = minify && !process.argv.includes('--keep-css');

const hashOf = (text) => createHash('sha256').update(text).digest('hex').slice(0, 10);
const numbered = async (dir, ext) =>
  (await readdir(src(dir))).filter((f) => /^\d\d-.+/.test(f) && f.endsWith(ext)).sort();

async function concat(dir, ext, joiner) {
  const files = await numbered(dir, ext);
  const parts = await Promise.all(files.map((f) => readFile(src(dir, f), 'utf8')));
  return parts.join(joiner);
}

async function emit(publicPath, text, loader) {
  const code = (loader === 'css' ? minifyCss : minify) ? (await transform(text, { loader, minify: true, legalComments: 'none' })).code : text;
  const name = publicPath.replace(/(\.\w+)$/, `.${hashOf(code)}$1`);
  await mkdir(dirname(out(name)), { recursive: true });
  await writeFile(out(name), code);
  return `/${name}`;
}

await rm(out(), { recursive: true, force: true });
await mkdir(out(), { recursive: true });

// Classic scripts, in file order. Each layer after 01 is an IIFE, so joining them with ";" is safe.
const refs = {
  '/assets/app.css': await emit('assets/app.css', await concat('css', '.css', '\n'), 'css'),
  '/assets/app.js': await emit('assets/app.js', await concat('js', '.js', ';\n'), 'js'),
  '/assets/vendor/ollama.js': await emit('assets/vendor/ollama.js', await readFile(src('vendor', 'ollama.js'), 'utf8'), 'js'),
  '/assets/beta-banner.js': await emit('assets/beta-banner.js', await readFile(src('js', 'beta-banner.js'), 'utf8'), 'js'),
  '/assets/analytics-init.js': await emit('assets/analytics-init.js', await readFile(src('js', 'analytics-init.js'), 'utf8'), 'js'),
};

let html = await readFile(src('index.html'), 'utf8');
for (const [from, to] of Object.entries(refs)) {
  if (!html.includes(from)) throw new Error(`index.html does not reference ${from}`);
  html = html.replaceAll(from, to);
}
await writeFile(out('index.html'), html);

try { await cp(src('static'), out(), { recursive: true }); } catch (e) { if (e.code !== 'ENOENT') throw e; }
console.log(Object.values(refs).join('\n'));
