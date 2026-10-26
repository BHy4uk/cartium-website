// The storefront studio: appearance controls that mirror Керування → Вигляд, a live
// miniature storefront (buyer side) and the shop bot's chat (owner side).
// Everything runs locally; nothing is sent anywhere.

type Product = {
  id: string;
  name: string;
  cat: string;
  price: number;
  old?: number;
  tone: string;
  sizes: string[];
  soldOut: string[];
};
type Line = { id: string; size: string; qty: number };
type Pay = 'liqpay' | 'mono' | 'cod';
type Look = {
  template: string;
  mode: string;
  accent: string;
  buttons: string;
  radius: string;
  cards: string;
  font: string;
  promo: string;
};

const PAY_NAMES: Record<Pay, string> = { liqpay: 'LiqPay', mono: 'plata by mono', cod: 'Накладений платіж' };
const FIRST_ORDER = 58; // continues the demo data on the documentation screenshots
const DEFAULT_LOOK: Look = {
  template: 'classic',
  mode: 'light',
  accent: 'auto',
  buttons: 'filled',
  radius: 'rounded',
  cards: 'flat',
  font: 'modern',
  promo: 'continuous',
};
// theme.js FONT_STACKS and RADIUS, as the storefront applies them.
const FONT_STACKS: Record<string, string> = {
  modern: 'Inter, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  system: '"SF Pro Display", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  premium: '"IBM Plex Sans", "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  fashion: '"Space Grotesk", Inter, "Segoe UI", Helvetica, Arial, sans-serif',
  neutral: '"Helvetica Neue", Helvetica, Arial, "Liberation Sans", sans-serif',
};
const RADIUS: Record<string, [string, string, string]> = {
  rounded: ['16px', '12px', '9999px'],
  medium: ['12px', '10px', '14px'],
  sharp: ['4px', '3px', '6px'],
};
const WEB_FONTS =
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=IBM+Plex+Sans:wght@400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&display=swap';

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const fmt = (n: number) => `${n.toLocaleString('uk-UA').replace(/[  ]/g, ' ')} грн`;

const TRANSLIT: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'h', ґ: 'g', д: 'd', е: 'e', є: 'ie', ж: 'zh', з: 'z', и: 'y', і: 'i', ї: 'i', й: 'i',
  к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'kh', ц: 'ts', ч: 'ch',
  ш: 'sh', щ: 'shch', ь: '', ю: 'iu', я: 'ia', ы: 'y', э: 'e', ъ: '', ё: 'io',
};
// The same rule BotFather enforces: latin, digits and "_", ending in "bot".
function botHandle(name: string) {
  const latin = [...name.toLowerCase()].map((ch) => TRANSLIT[ch] ?? ch).join('');
  const slug = latin.replace(/[^a-z0-9]+/g, '').slice(0, 20) || 'myshop';
  return `${slug}_bot`;
}
function luminance(hex: string) {
  const v = hex.replace('#', '');
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(v.slice(i, i + 2), 16) / 255);
  const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}
const DEFAULT_ACCENT: Record<string, string> = { light: '#1d1d1f', dark: '#f5f5f7' };
// theme.js readableInk: darken (or lighten, on dark) the accent until it clears 4.5:1 as text.
function readableInk(hex: string, mode: string) {
  const dark = mode === 'dark';
  const target = dark ? 0.21 : 0.18;
  let [r, g, b] = [0, 2, 4].map((i) => parseInt(hex.slice(1 + i, 3 + i), 16));
  const toHex = () => `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
  for (let i = 0; i < 24; i++) {
    const l = luminance(toHex());
    if (dark ? l >= target : l <= target) break;
    if (dark) [r, g, b] = [r, g, b].map((v) => Math.min(255, Math.round(v + (255 - v) * 0.12) + 1));
    else [r, g, b] = [r, g, b].map((v) => Math.max(0, Math.round(v * 0.88)));
  }
  return toHex();
}
const pick = <T,>(list: T[]) => list[Math.floor(Math.random() * list.length)];

let webFontsLoaded = false;
function loadWebFonts() {
  if (webFontsLoaded) return;
  webFontsLoaded = true;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = WEB_FONTS;
  document.head.append(link);
}

export function initDemo() {
  const root = document.querySelector<HTMLElement>('[data-demo]');
  if (!root) return;
  const q = <T extends Element = HTMLElement>(sel: string) => root.querySelector<T>(sel)!;
  const qa = <T extends Element = HTMLElement>(sel: string) => Array.from(root.querySelectorAll<T>(sel));

  const products: Product[] = JSON.parse(q('[data-demo-products]').textContent || '[]');
  const byId = new Map(products.map((p) => [p.id, p]));
  const phone = q('[data-dphone]');
  const screen = q('[data-ds]');
  const sheet = q('[data-sheet]');
  const toast = q('[data-toast]');
  const log = q('[data-chat-log]');
  const hint = q('[data-chat-hint]');
  const hintText = q('[data-chat-hint-text]');
  const finale = q('[data-finale]');
  const initialLog = log.innerHTML;

  const look: Look = { ...DEFAULT_LOOK };
  const state = {
    cart: [] as Line[],
    current: '',
    size: '',
    pay: 'liqpay' as Pay,
    orderNo: FIRST_ORDER,
    orders: 0,
    revenue: 0,
    name: 'Cartium',
    opener: null as HTMLElement | null,
    logoUrl: '',
  };

  /* ----- Progress ----- */
  const flags = { style: false, buy: false, ship: false };
  const markCurrent = () => {
    const next = (Object.keys(flags) as (keyof typeof flags)[]).find((k) => !flags[k]);
    qa('[data-step-flag]').forEach((el) => el.classList.toggle('is-current', el.dataset.stepFlag === next));
  };
  const flag = (key: keyof typeof flags) => {
    if (flags[key]) return;
    flags[key] = true;
    root.querySelector(`[data-step-flag="${key}"]`)?.classList.add('is-done');
    markCurrent();
    if (flags.style && flags.buy && flags.ship) finale.classList.add('is-ready');
  };
  const resetFlags = () => {
    (Object.keys(flags) as (keyof typeof flags)[]).forEach((k) => (flags[k] = false));
    qa('[data-step-flag]').forEach((el) => el.classList.remove('is-done'));
    markCurrent();
    finale.classList.remove('is-ready');
  };

  /* ----- Tabs ----- */
  const tabs = qa<HTMLButtonElement>('[role="tab"]');
  const selectTab = (tab: HTMLButtonElement, focus = false) => {
    tabs.forEach((t) => {
      const on = t === tab;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      const pane = root.querySelector<HTMLElement>(`[data-pane="${t.dataset.tab}"]`);
      if (pane) pane.hidden = !on;
    });
    if (tab.dataset.tab === 'font') loadWebFonts();
    if (focus) tab.focus();
  };
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => selectTab(t));
    t.addEventListener('keydown', (e) => {
      const step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (!step) return;
      e.preventDefault();
      selectTab(tabs[(i + step + tabs.length) % tabs.length], true);
    });
  });

  /* ----- Applying the look ----- */
  const customColor = q<HTMLInputElement>('[data-demo-color]');
  const customSwatch = customColor.closest('.sw')!;
  const applyLook = () => {
    phone.dataset.template = look.template;
    phone.dataset.promo = look.promo;
    screen.classList.toggle('is-dark', look.mode === 'dark');
    screen.dataset.buttons = look.buttons;
    screen.dataset.cards = look.cards;
    const [rc, rctrl, rpill] = RADIUS[look.radius];
    screen.style.setProperty('--ds-r-card', rc);
    screen.style.setProperty('--ds-r-ctrl', rctrl);
    screen.style.setProperty('--ds-r-pill', rpill);
    screen.style.setProperty('--ds-font', FONT_STACKS[look.font]);

    // Accent, as theme.js resolves it: the fill, the text on it, and a version that reads as text.
    const fill = look.accent === 'auto' ? DEFAULT_ACCENT[look.mode] : look.accent;
    screen.style.setProperty('--da', fill);
    screen.style.setProperty('--da-ink', luminance(fill) > 0.4 ? '#1d1d1f' : '#ffffff');
    screen.style.setProperty('--da-on-surface', readableInk(fill, look.mode));

    // Reflect the look in every control.
    qa<HTMLElement>('[data-set]').forEach((el) => {
      const key = el.dataset.set as keyof Look;
      el.setAttribute('aria-checked', String(look[key] === el.dataset.value));
    });
    const isPreset = qa('[data-set="accent"]').some((el) => el.dataset.value === look.accent);
    customSwatch.classList.toggle('is-active', !isPreset);
  };

  root.addEventListener('click', (e) => {
    const el = (e.target as Element).closest<HTMLElement>('[data-set]');
    if (!el || !root.contains(el)) return;
    const key = el.dataset.set as keyof Look;
    look[key] = el.dataset.value!;
    if (key === 'font') loadWebFonts();
    applyLook();
    flag('style');
  });
  // Arrow keys move between options of one radiogroup.
  root.addEventListener('keydown', (e) => {
    const el = (e.target as Element).closest<HTMLElement>('[data-set]');
    if (!el) return;
    const step = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const group = qa<HTMLElement>(`[data-set="${el.dataset.set}"]`);
    const next = group[(group.indexOf(el) + step + group.length) % group.length];
    next.focus();
    next.click();
  });
  customColor.addEventListener('input', () => {
    look.accent = customColor.value;
    applyLook();
    flag('style');
  });

  /* ----- Identity: name and logo ----- */
  const nameInput = q<HTMLInputElement>('[data-demo-input]');
  const applyName = () => {
    state.name = nameInput.value.trim() || 'Мій магазин';
    qa('[data-demo-name]').forEach((el) => (el.textContent = state.name));
    q('[data-demo-bot]').textContent = botHandle(state.name);
    q('[data-demo-initial]').textContent = [...state.name][0]?.toUpperCase() ?? 'M';
  };
  nameInput.addEventListener('input', () => {
    applyName();
    flag('style');
  });

  const logoInput = q<HTMLInputElement>('[data-demo-logo-input]');
  const logoPreview = q('[data-demo-logo-preview]');
  const dsLogos = qa('[data-ds-logo]');
  const setLogo = (url: string) => {
    if (state.logoUrl) URL.revokeObjectURL(state.logoUrl);
    state.logoUrl = url;
    [logoPreview, ...dsLogos].forEach((el) => {
      el.hidden = !url;
      el.style.backgroundImage = url ? `url("${url}")` : '';
    });
  };
  logoInput.addEventListener('change', () => {
    const file = logoInput.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    setLogo(URL.createObjectURL(file));
    flag('style');
  });

  /* ----- Promo bar ----- */
  const promoToggle = q<HTMLButtonElement>('[data-demo-promo-toggle]');
  const promoInput = q<HTMLInputElement>('[data-demo-promo-input]');
  const promoTrack = q('[data-ds-promo-track]');
  let lastPromoMode = look.promo;
  const renderPromo = () => {
    const text = promoInput.value.trim() || 'Ваше оголошення';
    promoTrack.innerHTML = '';
    // A continuous loop needs the text twice to wrap seamlessly.
    const copies = look.promo === 'continuous' ? 4 : 1;
    for (let i = 0; i < copies; i++) {
      const span = document.createElement('span');
      span.textContent = text;
      if (i > 0) span.setAttribute('aria-hidden', 'true');
      promoTrack.append(span);
    }
  };
  promoInput.addEventListener('input', () => {
    renderPromo();
    flag('style');
  });
  promoToggle.addEventListener('click', () => {
    const on = promoToggle.getAttribute('aria-checked') !== 'true';
    promoToggle.setAttribute('aria-checked', String(on));
    if (on) look.promo = lastPromoMode === 'off' ? 'continuous' : lastPromoMode;
    else {
      lastPromoMode = look.promo;
      look.promo = 'off';
    }
    applyLook();
    renderPromo();
    flag('style');
  });
  root.addEventListener('click', (e) => {
    const el = (e.target as Element).closest<HTMLElement>('[data-set="promo"]');
    if (!el) return;
    promoToggle.setAttribute('aria-checked', 'true');
    renderPromo();
  });

  /* ----- Shuffle and reset ----- */
  q('[data-demo-shuffle]').addEventListener('click', () => {
    const accents = qa('[data-set="accent"]').map((el) => el.dataset.value!);
    look.template = pick(qa('[data-set="template"]').map((el) => el.dataset.value!).filter((t) => t !== look.template));
    look.mode = pick(['light', 'dark']);
    look.accent = pick(accents);
    look.buttons = pick(['filled', 'outline']);
    look.radius = pick(['rounded', 'medium', 'sharp']);
    look.cards = pick(['flat', 'soft', 'outline']);
    look.font = pick(['modern', 'neutral', 'premium', 'fashion', 'system']);
    loadWebFonts();
    applyLook();
    flag('style');
    if (!reduceMotion) phone.animate([{ transform: 'scale(0.985)' }, { transform: 'scale(1)' }], { duration: 450, easing: 'cubic-bezier(.34,1.56,.64,1)' });
  });

  /* ----- Screens ----- */
  const show = (target: string) => {
    if (target === 'checkout' && !state.cart.length) target = 'cart';
    if (target === 'cart') renderCart();
    if (target === 'checkout') renderPayLabel();
    phone.dataset.screen = target;
    root.querySelector<HTMLElement>(`[data-screen-id="${target}"]`)?.scrollTo({ top: 0 });
  };
  root.addEventListener('click', (e) => {
    const go = (e.target as Element).closest<HTMLElement>('[data-go]');
    if (go && root.contains(go)) show(go.dataset.go!);
  });

  /* ----- Catalog filter and template blocks ----- */
  const chips = qa<HTMLButtonElement>('.ds-chip[data-cat]');
  const catalogScreen = q('[data-screen-id="catalog"]');
  const grid = q('[data-ds-grid]');
  const filter = (cat: string) => {
    chips.forEach((c) => c.setAttribute('aria-pressed', String(c.dataset.cat === cat)));
    qa('[data-product-card]').forEach((card) => {
      card.hidden = cat !== 'all' && card.dataset.cat !== cat;
    });
  };
  const scrollToGrid = () =>
    catalogScreen.scrollTo({ top: grid.offsetTop - 70, behavior: reduceMotion ? 'auto' : 'smooth' });
  chips.forEach((chip) => chip.addEventListener('click', () => filter(chip.dataset.cat!)));
  qa('[data-cat-jump]').forEach((tile) =>
    tile.addEventListener('click', () => {
      filter(tile.dataset.catJump!);
      scrollToGrid();
    }),
  );
  qa('[data-scroll-grid]').forEach((el) => el.addEventListener('click', scrollToGrid));

  /* ----- Product sheet ----- */
  const sizesBox = q('[data-sheet-sizes]');
  const openSheet = (id: string, opener: HTMLElement) => {
    const p = byId.get(id);
    if (!p) return;
    state.current = id;
    state.opener = opener;
    const icon = root.querySelector(`.ds-card-hit[data-open="${id}"] .ds-img`);
    const img = q('[data-sheet-img]');
    img.innerHTML = icon?.innerHTML ?? '';
    img.style.setProperty('--tone', p.tone);
    q('[data-sheet-name]').textContent = p.name;
    q('[data-sheet-price]').innerHTML = p.old ? `${fmt(p.price)} <s>${fmt(p.old)}</s>` : fmt(p.price);
    const first = p.sizes.find((s) => !p.soldOut.includes(s)) ?? '';
    state.size = first;
    sizesBox.innerHTML = '';
    p.sizes.forEach((s) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'ds-size';
      b.setAttribute('role', 'radio');
      b.setAttribute('aria-checked', String(s === first));
      b.textContent = s;
      if (p.soldOut.includes(s)) {
        b.disabled = true;
        b.title = 'Немає в наявності';
      }
      b.addEventListener('click', () => {
        state.size = s;
        sizesBox.querySelectorAll('.ds-size').forEach((x) => x.setAttribute('aria-checked', String(x === b)));
      });
      sizesBox.append(b);
    });
    sheet.classList.add('is-open');
    sheet.setAttribute('aria-hidden', 'false');
    (sizesBox.querySelector('[aria-checked="true"]') as HTMLElement | null)?.focus({ preventScroll: true });
  };
  const closeSheet = () => {
    if (!sheet.classList.contains('is-open')) return;
    sheet.classList.remove('is-open');
    sheet.setAttribute('aria-hidden', 'true');
    state.opener?.focus({ preventScroll: true });
  };
  qa('[data-open]').forEach((el) => el.addEventListener('click', () => openSheet(el.dataset.open!, el)));
  q('[data-sheet-close]').addEventListener('click', closeSheet);
  root.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeSheet();
  });

  let toastTimer = 0;
  const say = (text: string) => {
    toast.textContent = text;
    toast.classList.add('is-shown');
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => toast.classList.remove('is-shown'), 1800);
  };

  q('[data-sheet-add]').addEventListener('click', () => {
    const line = state.cart.find((l) => l.id === state.current && l.size === state.size);
    if (line) line.qty += 1;
    else state.cart.push({ id: state.current, size: state.size, qty: 1 });
    sheet.classList.remove('is-open');
    sheet.setAttribute('aria-hidden', 'true');
    updateBadge(true);
    say('Додано в кошик');
    hintText.textContent = 'Тепер відкрийте кошик і оформіть замовлення';
  });

  /* ----- Cart ----- */
  const total = () => state.cart.reduce((sum, l) => sum + (byId.get(l.id)?.price ?? 0) * l.qty, 0);
  const count = () => state.cart.reduce((n, l) => n + l.qty, 0);
  const badge = q('[data-cart-badge]');
  const updateBadge = (bump = false) => {
    const n = count();
    badge.hidden = n === 0;
    badge.textContent = String(n);
    if (bump && !reduceMotion) badge.animate([{ transform: 'scale(1.6)' }, { transform: 'scale(1)' }], { duration: 450, easing: 'cubic-bezier(.34,1.56,.64,1)' });
  };
  const linesBox = q('[data-cart-lines]');
  const renderCart = () => {
    linesBox.innerHTML = '';
    state.cart.forEach((l, i) => {
      const p = byId.get(l.id)!;
      const li = document.createElement('li');
      li.className = 'ds-line';
      const icon = root.querySelector(`.ds-card-hit[data-open="${l.id}"] .ds-img`)?.innerHTML ?? '';
      li.innerHTML = `
        <span class="ds-line-img" style="--tone:${p.tone}">${icon}</span>
        <span class="ds-line-info"><span class="ds-line-name"></span><span class="ds-line-meta"></span></span>
        <span class="ds-qty">
          <button type="button" aria-label="Менше" data-q="-1">−</button>
          <span>${l.qty}</span>
          <button type="button" aria-label="Більше" data-q="1">+</button>
        </span>`;
      li.querySelector('.ds-line-name')!.textContent = p.name;
      li.querySelector('.ds-line-meta')!.textContent = `${l.size}, ${fmt(p.price * l.qty)}`;
      li.querySelectorAll<HTMLButtonElement>('[data-q]').forEach((b) =>
        b.addEventListener('click', () => {
          l.qty += Number(b.dataset.q);
          if (l.qty <= 0) state.cart.splice(i, 1);
          updateBadge();
          renderCart();
        }),
      );
      linesBox.append(li);
    });
    const empty = state.cart.length === 0;
    q('[data-cart-empty]').hidden = !empty;
    q('[data-cart-footer]').hidden = empty;
    q('[data-cart-total]').textContent = fmt(total());
  };

  /* ----- Checkout ----- */
  const payOpts = qa<HTMLButtonElement>('[data-pay]');
  const renderPayLabel = () => {
    q('[data-pay-label]').textContent = state.pay === 'cod' ? 'Підтвердити замовлення' : `Оплатити ${fmt(total())}`;
  };
  payOpts.forEach((b, i) => {
    const select = (btn: HTMLButtonElement, focus = false) => {
      payOpts.forEach((o) => {
        o.setAttribute('aria-checked', String(o === btn));
        o.tabIndex = o === btn ? 0 : -1;
      });
      state.pay = btn.dataset.pay as Pay;
      renderPayLabel();
      if (focus) btn.focus();
    };
    b.tabIndex = i === 0 ? 0 : -1;
    b.addEventListener('click', () => select(b));
    b.addEventListener('keydown', (e) => {
      const step = e.key === 'ArrowDown' || e.key === 'ArrowRight' ? 1 : e.key === 'ArrowUp' || e.key === 'ArrowLeft' ? -1 : 0;
      if (!step) return;
      e.preventDefault();
      select(payOpts[(i + step + payOpts.length) % payOpts.length], true);
    });
  });

  const done = q('[data-done]');
  q('[data-pay-submit]').addEventListener('click', () => {
    if (!state.cart.length) return show('cart');
    const n = state.orderNo++;
    const sum = total();
    const lines = state.cart.map((l) => ({ ...l }));
    const pay = state.pay;

    done.classList.remove('is-done');
    q('[data-done-title]').textContent = pay === 'cod' ? 'Оформлюємо замовлення…' : `Оплата через ${PAY_NAMES[pay]}…`;
    q('[data-done-sub]').textContent = '';
    show('done');

    window.setTimeout(() => {
      done.classList.add('is-done');
      q('[data-done-title]').textContent = pay === 'cod' ? `Замовлення #${n} прийнято` : `Замовлення #${n} оплачено`;
      q('[data-done-sub]').textContent = 'Дякуємо! Деталі в розділі «Замовлення».';
      state.cart = [];
      updateBadge();
      flag('buy');
      window.setTimeout(() => notifyOwner(n, sum, lines, pay), reduceMotion ? 0 : 500);
    }, reduceMotion ? 300 : 1400);
  });

  /* ----- Owner side ----- */
  const statOrders = q('[data-stat-orders]');
  const statRevenue = q('[data-stat-revenue]');
  const countTo = (el: HTMLElement, from: number, to: number, money: boolean) => {
    if (reduceMotion) {
      el.textContent = money ? fmt(to) : String(to);
      return;
    }
    const start = performance.now();
    const step = (t: number) => {
      const k = Math.min(1, (t - start) / 900);
      const v = Math.round(from + (to - from) * (1 - Math.pow(1 - k, 3)));
      el.textContent = money ? fmt(v) : String(v);
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };

  const tpl = root.querySelector<HTMLTemplateElement>('[data-tpl-order]')!;
  const notifyOwner = (n: number, sum: number, lines: Line[], pay: Pay) => {
    hint.hidden = true;
    const node = tpl.content.firstElementChild!.cloneNode(true) as HTMLElement;
    const set = (f: string, text: string) => (node.querySelector(`[data-f="${f}"]`)!.textContent = text);
    set('title', pay === 'cod' ? `📦 Нове замовлення #${n} (накладений платіж)` : `📦 Нове замовлення #${n}`);
    set('sum', `Сума: ${fmt(sum)}`);
    set('items', lines.map((l) => `${byId.get(l.id)?.name} (${l.size}) × ${l.qty}`).join(', '));
    set('ship', 'Нова пошта: Київ, відділення №12');
    set('pay', pay === 'cod' ? 'Оплата при отриманні' : `✅ Оплачено через ${PAY_NAMES[pay]}`);
    const ttn = node.querySelector<HTMLButtonElement>('[data-ttn]')!;
    ttn.addEventListener('click', () => createTtn(ttn));
    log.append(node);
    log.scrollTo({ top: log.scrollHeight, behavior: reduceMotion ? 'auto' : 'smooth' });

    const prevOrders = state.orders;
    const prevRevenue = state.revenue;
    state.orders += 1;
    state.revenue += sum;
    countTo(statOrders, prevOrders, state.orders, false);
    countTo(statRevenue, prevRevenue, state.revenue, true);
  };

  const createTtn = (btn: HTMLButtonElement) => {
    btn.disabled = true;
    btn.textContent = '⏳ Створюємо ТТН…';
    const status = document.createElement('div');
    status.className = 'bmsg';
    status.textContent = '⏳ Створюємо ТТН. Це може зайняти кілька секунд.';
    log.append(status);
    log.scrollTo({ top: log.scrollHeight, behavior: reduceMotion ? 'auto' : 'smooth' });
    window.setTimeout(() => {
      const number = `2045${Math.floor(1e9 + Math.random() * 9e9)}`.slice(0, 14);
      status.textContent = '';
      const strong = document.createElement('strong');
      strong.textContent = number;
      status.append('✅ ТТН ', strong, ' створено. Посилку можна відстежити з картки замовлення.');
      btn.textContent = '✓ ТТН створено';
      flag('ship');
    }, reduceMotion ? 200 : 1100);
  };

  q('[data-to-owner]').addEventListener('click', () => {
    q('[data-dchat]').scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });
  });

  /* ----- Reset ----- */
  q('[data-demo-reset]').addEventListener('click', () => {
    Object.assign(look, DEFAULT_LOOK);
    lastPromoMode = look.promo;
    promoToggle.setAttribute('aria-checked', 'true');
    nameInput.value = 'Cartium';
    promoInput.value = 'SS2026 // NEW SEASON // OUT NOW';
    customColor.value = '#1d1d1f';
    logoInput.value = '';
    setLogo('');
    state.cart = [];
    state.orderNo = FIRST_ORDER;
    state.orders = 0;
    state.revenue = 0;
    updateBadge();
    closeSheet();
    log.innerHTML = initialLog;
    applyName();
    applyLook();
    renderPromo();
    statOrders.textContent = '0';
    statRevenue.textContent = fmt(0);
    hint.hidden = false;
    hintText.textContent = 'Додайте товар у кошик і оформіть замовлення';
    filter('all');
    show('catalog');
    resetFlags();
  });


  /* ----- Coach: a ring and a bubble on the next thing to press ----- */
  // Visitors skim; the coach makes it obvious this is a working storefront, not a picture.
  const coach = q('[data-coach]');
  const coachText = q('[data-coach-text]');
  const coachRing = q('[data-coach-ring]');
  let studioVisible = false;
  let lastTarget: HTMLElement | null = null;
  const nextStep = (): [HTMLElement | null, string] => {
    if (!flags.style) {
      const pane = qa('[data-pane]').find((el) => !el.hidden);
      const option =
        pane?.dataset.pane === 'tpl'
          ? root.querySelector<HTMLElement>(`[data-set="template"]:not([data-value="${look.template}"])`)
          : pane?.querySelector<HTMLElement>('[data-set][aria-checked="false"]');
      return [option ?? null, 'Натисніть, щоб змінити вітрину'];
    }
    if (!flags.buy) {
      if (sheet.classList.contains('is-open')) return [q<HTMLElement>('[data-sheet-add]'), 'Додайте в кошик'];
      const at = phone.dataset.screen;
      if (at === 'catalog')
        return state.cart.length
          ? [q<HTMLElement>('.ds-tab[data-tab-id="cart"]'), 'Відкрийте кошик']
          : [root.querySelector<HTMLElement>('.ds-card:not([hidden]) .ds-add'), 'Тепер купіть товар: натисніть +'];
      if (at === 'cart')
        return state.cart.length
          ? [q<HTMLElement>('[data-cart-footer] [data-go="checkout"]'), 'Оформіть замовлення']
          : [q<HTMLElement>('.ds-tab[data-tab-id="catalog"]'), 'Поверніться в каталог'];
      if (at === 'checkout') return [q<HTMLElement>('[data-pay-submit]'), 'Оберіть оплату й оплатіть'];
      return [null, ''];
    }
    if (!flags.ship) return [root.querySelector<HTMLElement>('[data-ttn]:not(:disabled)'), 'Створіть ТТН для покупця'];
    return [null, ''];
  };
  const hideCoach = () => {
    coach.classList.remove('is-on');
    coachRing.classList.remove('is-on');
  };
  const placeCoach = () => {
    if (!studioVisible) return;
    requestAnimationFrame(placeCoach);
    const [el, text] = nextStep();
    if (!el) return hideCoach();
    const r = el.getBoundingClientRect();
    if (!r.width) return hideCoach();
    const off = r.top > innerHeight - 40 ? 'down' : r.bottom < 72 ? 'up' : '';
    const label = off ? `${off === 'down' ? '↓' : '↑'} ${text}` : text;
    if (el !== lastTarget || coachText.textContent !== label) {
      lastTarget = el;
      coachText.textContent = label;
      coachRing.style.borderRadius = getComputedStyle(el).borderRadius || '14px';
    }
    const bw = coach.offsetWidth;
    const bh = coach.offsetHeight;
    // Off the page: pin the bubble to the edge it is on; a tap scrolls to the control.
    if (off) {
      coach.dataset.side = 'edge';
      coach.style.transform = `translate(${(innerWidth - bw) / 2}px, ${off === 'down' ? innerHeight - bh - 104 : 84}px)`;
      coach.classList.add('is-on');
      coachRing.classList.remove('is-on');
      return;
    }
    // On the page but scrolled out of the phone's own screen: nothing sensible to point at.
    if (screen.contains(el)) {
      const box = screen.getBoundingClientRect();
      if (r.top > box.bottom - r.height / 2 || r.bottom < box.top + r.height / 2) return hideCoach();
    }
    coachRing.style.width = `${r.width + 10}px`;
    coachRing.style.height = `${r.height + 10}px`;
    coachRing.style.transform = `translate(${r.left - 5}px, ${r.top - 5}px)`;
    const x = Math.min(Math.max(12, r.left + r.width / 2 - 30), innerWidth - bw - 12);
    const above = r.top - bh - 16 > 72;
    coach.dataset.side = above ? 'above' : 'below';
    coach.style.transform = `translate(${x}px, ${above ? r.top - bh - 14 : r.bottom + 14}px)`;
    coach.style.setProperty('--arrow-x', `${Math.min(Math.max(18, r.left + r.width / 2 - x), bw - 18)}px`);
    coach.classList.add('is-on');
    coachRing.classList.add('is-on');
  };
  coach.addEventListener('click', () => {
    if (coach.dataset.side === 'edge') lastTarget?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });
  });
  new IntersectionObserver(
    ([e]) => {
      const was = studioVisible;
      studioVisible = e.isIntersecting;
      if (studioVisible && !was) requestAnimationFrame(placeCoach);
      if (!studioVisible) hideCoach();
    },
    { threshold: 0.12 },
  ).observe(q('.studio-grid'));

  applyName();
  applyLook();
  renderPromo();
  updateBadge();
  renderCart();
  markCurrent();
  // Font samples in the panel use the stacks they describe.
  qa('[data-font-sample]').forEach((el) => (el.style.fontFamily = FONT_STACKS[el.dataset.fontSample!]));
}
