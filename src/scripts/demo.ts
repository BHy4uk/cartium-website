// The live demo store: a buyer side (a miniature Cartium storefront) and an owner
// side (the shop bot's chat). Everything runs locally; nothing is sent anywhere.

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

const PAY_NAMES: Record<Pay, string> = { liqpay: 'LiqPay', mono: 'plata by mono', cod: 'Накладений платіж' };
const FIRST_ORDER = 58; // continues the demo data on the documentation screenshots
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
function inkFor(hex: string) {
  const v = hex.replace('#', '');
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(v.slice(i, i + 2), 16) / 255);
  const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  const lum = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  return lum > 0.45 ? '#16181d' : '#ffffff';
}

export function initDemo() {
  const root = document.querySelector<HTMLElement>('[data-demo]');
  if (!root) return;
  const q = <T extends Element = HTMLElement>(sel: string) => root.querySelector<T>(sel)!;
  const qa = <T extends Element = HTMLElement>(sel: string) => Array.from(root.querySelectorAll<T>(sel));

  const products: Product[] = JSON.parse(q('[data-demo-products]').textContent || '[]');
  const byId = new Map(products.map((p) => [p.id, p]));
  const phone = q('[data-dphone]');
  const sheet = q('[data-sheet]');
  const toast = q('[data-toast]');
  const log = q('[data-chat-log]');
  const hint = q('[data-chat-hint]');
  const wire = root.querySelector<SVGPathElement>('[data-wire]');
  const initialLog = log.innerHTML;

  const state = {
    cart: [] as Line[],
    current: '' as string,
    size: '' as string,
    pay: 'liqpay' as Pay,
    orderNo: FIRST_ORDER,
    orders: 0,
    revenue: 0,
    name: 'Urban Style',
    opener: null as HTMLElement | null,
  };

  /* ----- Personalisation ----- */
  const nameInput = q<HTMLInputElement>('[data-demo-input]');
  const applyName = () => {
    state.name = nameInput.value.trim() || 'Мій магазин';
    qa('[data-demo-name]').forEach((el) => (el.textContent = state.name));
    q('[data-demo-bot]').textContent = botHandle(state.name);
    q('[data-demo-initial]').textContent = [...state.name][0]?.toUpperCase() ?? 'M';
  };
  nameInput.addEventListener('input', applyName);

  qa<HTMLInputElement>('[data-demo-accent]').forEach((input) =>
    input.addEventListener('change', () => {
      if (!input.checked) return;
      phone.style.setProperty('--da', input.value);
      phone.style.setProperty('--da-ink', inkFor(input.value));
    }),
  );

  /* ----- Navigation between screens ----- */
  const show = (screen: string) => {
    if (screen === 'checkout' && !state.cart.length) screen = 'cart';
    if (screen === 'cart') renderCart();
    if (screen === 'checkout') renderPayLabel();
    phone.dataset.screen = screen;
    const active = root.querySelector<HTMLElement>(`[data-screen-id="${screen}"]`);
    active?.scrollTo({ top: 0 });
  };
  root.addEventListener('click', (e) => {
    const go = (e.target as Element).closest<HTMLElement>('[data-go]');
    if (go && root.contains(go)) show(go.dataset.go!);
  });

  /* ----- Catalog filter ----- */
  const chips = qa<HTMLButtonElement>('[data-cat].ds-chip');
  chips.forEach((chip) =>
    chip.addEventListener('click', () => {
      chips.forEach((c) => c.setAttribute('aria-pressed', String(c === chip)));
      const cat = chip.dataset.cat;
      qa('[data-product-card]').forEach((card) => {
        card.hidden = cat !== 'all' && card.dataset.cat !== cat;
      });
    }),
  );

  /* ----- Product sheet ----- */
  const sizesBox = q('[data-sheet-sizes]');
  const openSheet = (id: string, opener: HTMLElement) => {
    const p = byId.get(id);
    if (!p) return;
    state.current = id;
    state.opener = opener;
    const card = root.querySelector(`[data-open="${id}"] .ds-img`);
    const img = q('[data-sheet-img]');
    img.innerHTML = card?.innerHTML ?? '';
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
    hint.innerHTML = hint.innerHTML.replace(/Додайте[^<]*$/, 'Тепер відкрийте кошик і оформіть замовлення');
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
      const icon = root.querySelector(`[data-open="${l.id}"] .ds-img`)?.innerHTML ?? '';
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
      fireWire();
      window.setTimeout(() => notifyOwner(n, sum, lines, pay), reduceMotion ? 0 : 650);
    }, reduceMotion ? 300 : 1400);
  });

  /* ----- Owner side ----- */
  const fireWire = () => {
    if (!wire) return;
    wire.classList.remove('is-firing');
    void wire.getBoundingClientRect();
    wire.classList.add('is-firing');
  };
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
    status.className = 'bmsg bmsg--status';
    status.textContent = '⏳ Створюємо ТТН. Це може зайняти кілька секунд.';
    log.append(status);
    log.scrollTo({ top: log.scrollHeight, behavior: reduceMotion ? 'auto' : 'smooth' });
    window.setTimeout(() => {
      const number = `2045${Math.floor(1e9 + Math.random() * 9e9)}`.slice(0, 14);
      status.innerHTML = '';
      const strong = document.createElement('strong');
      strong.textContent = number;
      status.append('✅ ТТН ', strong, ' створено. Посилку можна відстежити з картки замовлення.');
      btn.textContent = '✓ ТТН створено';
    }, reduceMotion ? 200 : 1100);
  };

  q('[data-to-owner]').addEventListener('click', () => {
    q('[data-dchat]').scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });
  });

  /* ----- Reset ----- */
  q('[data-demo-reset]').addEventListener('click', () => {
    state.cart = [];
    state.orderNo = FIRST_ORDER;
    state.orders = 0;
    state.revenue = 0;
    updateBadge();
    closeSheet();
    log.innerHTML = initialLog;
    applyName();
    statOrders.textContent = '0';
    statRevenue.textContent = fmt(0);
    hint.hidden = false;
    hint.innerHTML = hint.innerHTML.replace(/(Тепер|Додайте)[^<]*$/, 'Додайте товар у кошик ліворуч і оформіть замовлення');
    chips[0]?.click();
    show('catalog');
  });

  applyName();
  updateBadge();
  renderCart();
}
