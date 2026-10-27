# Cartium website

Одностраничный лендинг Cartium (магазин в Telegram) на украинском. Astro 7, статическая сборка,
GSAP + ScrollTrigger, Lenis, без CSS-фреймворков. Подробности: `README.md`, факты и дизайн-решения:
`docs/BRIEF.md`, маркетинговый контекст: `.agents/product-marketing.md`.

## Команды

- `npm install`, затем `npm run dev` (http://localhost:4321), `npm run check`, `npm run build`.
- Нужен Node.js 22.12+.
- Перед коммитом: `npm run check && npm run build` (то же делает CI).

## Ветки и деплой

- Рабочая ветка: `vetochka` (от `main`). Push в `vetochka` и PR только собирают сайт и проверяют типы.
- Публикация на GitHub Pages (`https://bhy4uk.github.io/cartium-website/`) идёт только из push в `main`
  (`.github/workflows/site.yml`). В Pages сайт живёт под `BASE_PATH=/cartium-website`: ссылки на файлы
  из `public/` строить через `import.meta.env.BASE_URL`, как в `src/layouts/Base.astro`.

## Где что

- `src/pages/index.astro`: порядок секций. Nav, Hero, Rails, ChatStory, Demo, Launch, Showcase, Growth,
  Pricing, Faq, FinalCta, Footer, StickyCta.
- `src/config.ts`: все внешние ссылки, бот, тарифы (`PLANS`), пробный период. Цифры на странице берутся отсюда.
  `CHANNEL_URL` пока заглушка.
- `src/styles/global.css`: токены (светлая тема в `:root`, тёмная в `:root[data-theme='dark']`, графитовые
  секции `.stage`, `.paper` для светлых карточек), рамка iPhone, кнопки, типографика.
- Стили секций лежат в `<style>` внутри самих `.astro`.
- `src/scripts/main.ts`: вся анимация и интерактив страницы (меню, тема, hero, гонка в ChatStory,
  Launch, Showcase, сцены, AI-фото, тарифы, reveals, sticky CTA). Подключается из `index.astro`.
- `src/components/Demo.astro` + `src/scripts/demo.ts`: «Студія вітрини», самый большой блок
  (настройки вида, мини-витрина, корзина, чат бота, коуч-подсказки).
- Иконки Phosphor: имя нужно добавить в glob в `src/data/icons.ts`, иначе `Icon` бросит ошибку при сборке.
- Картинки в `src/assets/` (оптимизирует Astro), файлы как есть в `public/`.

## Правила текста (из BRIEF)

- Видимый текст на украинском, без длинных тире.
- Не выдумывать отзывы, число клиентов, оборот, логотипы клиентов.
- Монохромная палитра «М'який графіт»; цвет только внутри скриншотов продукта.
- Учитывать `prefers-reduced-motion`: анимации в `main.ts` уже выключаются, новые тоже должны.
