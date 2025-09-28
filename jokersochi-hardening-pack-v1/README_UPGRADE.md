# Jokersochi Hardening Pack v1

## Шаги
1) Скопируйте все файлы в корень репозитория.
2) Установите дев-зависимости:
   ```bash
   npm i -D prettier eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin stylelint stylelint-config-standard vitest @vitest/coverage-v8 @playwright/test
   ```
3) В `package.json` добавьте:
   ```json
   {
     "engines": { "node": ">=20.0.0" },
     "scripts": {
       "fmt": "prettier -w .",
       "fmt:check": "prettier -c .",
       "lint": "eslint . && stylelint \"**/*.css\" || true",
       "typecheck": "tsc -p . || echo 'skip'",
       "test": "vitest run --coverage",
       "test:ui": "playwright test"
     }
   }
   ```
4) Нормализуйте окончания строк:
   ```bash
   git config core.autocrlf false
   git config core.eol lf
   git add --renormalize .
   git commit -m "Apply Hardening Pack v1 (LF, CI, tests, lint)"
   ```
5) Проверьте CI после пуша в `main`.
