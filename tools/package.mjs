// Собирает standalone/cargo-landing.html — один файл, открывается двойным кликом (шрифты, картинки, код внутри).
import { build } from 'vite';
import fs from 'node:fs';
import path from 'node:path';

const tmp = 'standalone/.build';
await build({
  logLevel: 'warn',
  build: {
    outDir: tmp,
    emptyOutDir: true,
    assetsInlineLimit: 100_000_000, // шрифты и картинки из CSS → data:
    cssCodeSplit: false,
    modulePreload: false,
    rollupOptions: { output: { codeSplitting: false } },
  },
});

let html = fs.readFileSync(`${tmp}/index.html`, 'utf8');
const asset = (f) => fs.readFileSync(path.join(tmp, 'assets', f), 'utf8');
html = html.replace(/<link rel="stylesheet"[^>]*href="\.\/assets\/([^"]+)"[^>]*>/g, (_, f) => `<style>\n${asset(f)}\n</style>`);
html = html.replace(/<script type="module"[^>]*src="\.\/assets\/([^"]+)"[^>]*><\/script>/g, (_, f) => `<script type="module">\n${asset(f).replace(/<\/script/gi, '<\\/script')}\n</script>`);

// картинки из public/img (на них ссылаются HTML и CSS) → data:
const mime = { jpg: 'image/jpeg', png: 'image/png', svg: 'image/svg+xml', webp: 'image/webp' };
html = html.replace(/(?:\.\.\/|\.\/|\/)?img\/([a-z0-9-]+)\.(jpg|png|svg|webp)/g, (_, name, ext) => {
  const b64 = fs.readFileSync(`public/img/${name}.${ext}`).toString('base64');
  return `data:${mime[ext]};base64,${b64}`;
});

fs.mkdirSync('standalone', { recursive: true });
fs.writeFileSync('standalone/cargo-landing.html', html);
fs.rmSync(tmp, { recursive: true, force: true });
console.log('standalone/cargo-landing.html', (html.length / 1024).toFixed(0) + ' KB');
