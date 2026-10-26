# cartium-website

Лендинг Cartium: магазин у Telegram, готовий за вечір. Одна страница на украинском,
для владельцев магазинов, которые сейчас продают через директ.

Бриф, проверенные факты и дизайн-решения: [docs/BRIEF.md](docs/BRIEF.md).

## Стек

- [Astro 7](https://astro.build): статическая сборка, ноль JS по умолчанию, оптимизация картинок (AVIF/WebP).
- [GSAP](https://gsap.com) + ScrollTrigger: закреплённые сцены, кинетический заголовок, раскрытие чёрных сцен, скраб.
- [Lenis](https://lenis.darkroom.engineering): плавный скролл (выключается при `prefers-reduced-motion`).
- Шрифт [Fixel](https://github.com/macpaw/fixel) от MacPaw (OFL), урезан до латиницы и кириллицы.
- Иконки [Phosphor](https://phosphoricons.com) (MIT), встраиваются в HTML при сборке.
- Без CSS-фреймворков: токены в `src/styles/global.css`, стили компонентов в самих `.astro`.

## Команды

```bash
npm install
npm run dev       # http://localhost:4321
npm run check     # проверка типов
npm run build     # сборка в dist/
npm run preview   # локальный просмотр сборки
```

Нужен Node.js 22.12+.

## Что где менять

| Что | Где |
|---|---|
| Ссылка на канал (сейчас заглушка) | `src/config.ts` → `CHANNEL_URL` |
| Бот для создания магазина | `src/config.ts` → `BOT_HANDLE`, `SIGNUP_URL` (`?start=connect`) |
| Цены и состав тарифов | `src/config.ts` → `PLANS` (сверено с `billing/plans.py`) |
| Ссылки на документацию и юридические документы | `src/config.ts` |
| Тексты секций | `src/components/*.astro` |
| Цвета, шрифты, радиусы | `src/styles/global.css` (светлые токены, `.stage` для чёрных секций) |
| Анимации | `src/scripts/main.ts` |
| Скриншоты продукта | `src/assets/shots/` (копии из `tgshop-docs/docs/assets/shots`) |
| Картинка для превью ссылки | `public/og.png` (1200×630) |

Скриншоты генерируются в продукте сценарием `docshots` и не содержат реальных данных.
После обновления интерфейса скопируйте свежие PNG из `tgshop-docs` в `src/assets/shots/`
с теми же именами.

## Структура страницы

1. Hero: крупный заголовок в две строки, при скролле строки расходятся; веер реальных экранов, уведомления о заказах.
2. Оплаты и доставка: LiqPay, plata by mono, Apple Pay, Google Pay, Нова пошта (логотипы в оттенках серого).
3. «Директ против Cartium» на чёрной сцене: переписка на 14 сообщений сворачивается в один оплаченный заказ.
4. Студия витрины: настройки раздела «Вигляд» (шаблон, тема, акцент, кнопки, скругление, карточки, шрифт,
   бегущая строка, логотип), покупка в получившейся витрине и заказ в чате бота
   (`src/components/Demo.astro`, `src/scripts/demo.ts`).
5. Запуск за вечер: 4 шага со временем из документации.
6. «Справжні екрани» на чёрной сцене: закреплённый телефон, 10 экранов меняются по скроллу (`src/components/Showcase.astro`).
7. Инструменты роста с мини-демо: AI-фото, напоминание о корзине, импорт, пауза checkout, кабинет покупателя.
8. Тарифы с переключателем месяц/год, FAQ, финальный CTA с QR-кодом.

Палитра монохромная: белый, серый, чёрный, как в самом продукте. Цвет есть только внутри
скриншотов. Если включён `prefers-reduced-motion`, закрепления и скраб отключаются.

Маркетинговый контекст для скиллов `marketing-skills`: `.agents/product-marketing.md`.

## Деплой

Workflow `.github/workflows/site.yml` на каждый PR и push собирает сайт и проверяет типы.

Публикация на GitHub Pages включается вручную:

1. Settings → Pages → Source: **GitHub Actions**.
2. Settings → Secrets and variables → Actions → Variables:
   - `DEPLOY_TO_PAGES` = `true`;
   - `BASE_PATH` = `/cartium-website` (если сайт открывается по адресу `<user>.github.io/cartium-website/`);
   - `SITE_URL` = полный адрес сайта, например `https://bhy4uk.github.io` или собственный домен.
3. Push в `main` опубликует сайт.

GitHub Pages для приватного репозитория требует платный план. Альтернатива: любой статический
хостинг (Cloudflare Pages, Netlify, Vercel) с командой сборки `npm run build` и папкой `dist`.
Для собственного домена в корне `BASE_PATH` не задавайте.
