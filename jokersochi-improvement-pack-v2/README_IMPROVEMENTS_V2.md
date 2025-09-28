# Improvement Pack v2 (SEO, Lighthouse, Sitemap, Robots)

## Установка
1) Скопируйте файлы в репозиторий.
2) Установите доп. зависимости:
   ```bash
   npm i -D @lhci/cli globby
   ```
3) В `package.json` добавьте/обновите скрипты:
   ```json
   {
     "scripts": {
       "preview": "vite preview --port 4173",
       "lighthouse": "lhci autorun",
       "sitemap": "node scripts/generate-sitemap.mjs"
     }
   }
   ```
4) После `npm run build` выполните:
   ```bash
   npm run sitemap
   ```
5) CI: GitHub Action `Lighthouse CI` запустится на PR/пуш и опубликует отчёт.
