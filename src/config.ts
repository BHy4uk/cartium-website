// Every outbound link and every number the page quotes lives here, so the
// copy can be checked against the product in one place (see docs/BRIEF.md).

export const BOT_HANDLE = 'cartium_support_bot';
export const BOT_URL = `https://t.me/${BOT_HANDLE}`;

// TODO: replace with the Cartium Telegram channel link.
export const CHANNEL_URL = 'https://t.me/your_cartium_channel';

const DOCS = 'https://bhy4uk.github.io/tgshop-docs';
export const DOCS_URL = `${DOCS}/`;
export const DOCS_LINKS = {
  guide: `${DOCS}/owner-guide/`,
  launch: `${DOCS}/launch/`,
  payments: `${DOCS}/payments/`,
  novaPoshta: `${DOCS}/nova-poshta/`,
  import: `${DOCS}/import/`,
};

// Served by the product (backend/app/billing/agreement_service.py).
export const LEGAL_LINKS = {
  terms: 'https://cartium.work/terms',
  privacy: 'https://cartium.work/privacy',
};

export const TRIAL_DAYS = 14;
export const YEARLY_DISCOUNT = 20;

export type Plan = {
  id: 'basic' | 'pro' | 'business';
  name: string;
  tagline: string;
  monthly: number;
  yearly: number;
  badge?: string;
  includes?: string;
  features: string[];
};

// backend/app/billing/plans.py + feature_registry.PLAN_LIMITS / PLAN_ADMIN_LIMITS
export const PLANS: Plan[] = [
  {
    id: 'basic',
    name: 'Basic',
    tagline: 'Запустити магазин',
    monthly: 10,
    yearly: 96,
    features: [
      'Каталог, кошик і замовлення в Telegram',
      'LiqPay, plata by mono, реквізити, посилання, післяплата',
      'Керування в боті та у WebApp',
      'AI-асистент фото: 20 кредитів на місяць',
      '1 шаблон магазину, 1 адміністратор',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    tagline: 'Зростати й автоматизувати',
    monthly: 20,
    yearly: 192,
    badge: 'Популярний',
    includes: 'Усе з Basic, а також',
    features: [
      'Нова пошта: ТТН прямо із замовлення',
      'Аналітика з експортом у CSV та Excel',
      'Промокоди, розсилки, нагадування про кошик',
      'Клієнти, сегменти й кабінет покупця',
      'Імпорт каталогу з CSV або XLSX',
      '100 AI-кредитів, 3 шаблони, до 3 адмінів',
    ],
  },
  {
    id: 'business',
    name: 'Business',
    tagline: 'Масштабувати магазин',
    monthly: 40,
    yearly: 384,
    includes: 'Усе з Pro, а також',
    features: [
      'Власні правила сегментів клієнтів',
      'Крос-продажі: що купують разом',
      '300 AI-кредитів, 10 шаблонів',
      'До 10 адміністраторів',
    ],
  },
];
