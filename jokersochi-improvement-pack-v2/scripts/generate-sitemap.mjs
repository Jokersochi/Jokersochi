import { globby } from 'globby';
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const BASE_URL = process.env.SITE_URL || 'http://localhost:4173';

const files = await globby(['dist/**/*.html', '!dist/**/404.html']);
const urls = files.map(f => {
  const path = f.replace(/^dist/, '').replace(/index\.html$/, '');
  return `${BASE_URL}${path}`;
});

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `<url><loc>${u}</loc></url>`).join('\n')}
</urlset>`;

await writeFile(resolve('dist', 'sitemap.xml'), xml);
console.log('Sitemap generated: dist/sitemap.xml');
