# SEO чек-лист (применить к `index.html` и основным страницам)
- [ ] `<title>` длиной 50–60 символов, уникальный.
- [ ] `<meta name="description" content="...">` 140–160 символов, уникальный.
- [ ] Open Graph: `og:title`, `og:description`, `og:type`, `og:url`, `og:image`.
- [ ] Twitter Cards: `twitter:card`, `twitter:title`, `twitter:description`, `twitter:image`.
- [ ] `<link rel="canonical" href="...">`.
- [ ] `<meta name="theme-color" content="#0f172a">`.
- [ ] Ленивая загрузка изображений `loading="lazy"`.
- [ ] Alt-тексты для изображений.
- [ ] Семантическая разметка: `header`, `nav`, `main`, `section`, `footer`.
- [ ] Web Vitals мониторинг (PerformanceObserver).

## Пример OG/Twitter блоков для `index.html`
```html
<meta property="og:title" content="Jokersochi — официальный сайт" />
<meta property="og:description" content="Быстрый PWA с фокусом на UX." />
<meta property="og:type" content="website" />
<meta property="og:url" content="https://example.com/" />
<meta property="og:image" content="https://example.com/og.jpg" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="Jokersochi — официальный сайт" />
<meta name="twitter:description" content="Быстрый PWA с фокусом на UX." />
<meta name="twitter:image" content="https://example.com/og.jpg" />
<link rel="canonical" href="https://example.com/" />
```
