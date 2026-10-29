import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import Snap from 'lenis/snap';
import 'lenis/dist/lenis.css';
import { initDemo } from './demo';

gsap.registerPlugin(ScrollTrigger);

const root = document.documentElement;
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
const EASE = 'expo.out';

const $ = <T extends Element = HTMLElement>(sel: string, scope: ParentNode = document) =>
  scope.querySelector<T>(sel);
const $$ = <T extends Element = HTMLElement>(sel: string, scope: ParentNode = document) =>
  Array.from(scope.querySelectorAll<T>(sel));

/* ---------- Smooth scroll ---------- */
let lenis: Lenis | null = null;
if (!reduceMotion) {
  // A slightly heavier glide than the default: the page coasts to a stop instead of halting.
  lenis = new Lenis({ lerp: 0.085, wheelMultiplier: 0.95, touchMultiplier: 1.4 });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((t) => lenis?.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
}

// Anchor jumps: a long, quiet deceleration (expo out), never a linear slide.
const glide = (t: number) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t));
function scrollToHash(hash: string) {
  const target = hash === '#top' ? document.body : $(hash);
  if (!target) return;
  if (lenis) lenis.scrollTo(target as HTMLElement, { offset: hash === '#top' ? 0 : -24, duration: 1.6, easing: glide });
  else target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' });
}

document.addEventListener('click', (e) => {
  const link = (e.target as Element).closest<HTMLAnchorElement>('a[href^="#"]');
  if (!link) return;
  const hash = link.getAttribute('href')!;
  if (hash.length < 2) return;
  e.preventDefault();
  closeMenu();
  scrollToHash(hash);
  history.replaceState(null, '', hash === '#top' ? location.pathname : hash);
});

/* ---------- Navigation ---------- */
const navWrap = $('[data-nav]');
const menu = $('[data-menu]');
const menuToggle = $<HTMLButtonElement>('[data-menu-toggle]');
let menuOpen = false;

function openMenu() {
  if (!menu || !menuToggle) return;
  menuOpen = true;
  menu.hidden = false;
  menuToggle.setAttribute('aria-expanded', 'true');
  navWrap?.classList.remove('is-hidden');
  lenis?.stop();
  document.body.style.overflow = 'hidden';
  requestAnimationFrame(() => {
    menu.classList.add('is-open');
    $<HTMLAnchorElement>('[data-menu-link]', menu)?.focus();
  });
}
function closeMenu() {
  if (!menuOpen || !menu || !menuToggle) return;
  menuOpen = false;
  menu.classList.remove('is-open');
  menuToggle.setAttribute('aria-expanded', 'false');
  menu.hidden = true;
  lenis?.start();
  document.body.style.overflow = '';
}
menuToggle?.addEventListener('click', () => (menuOpen ? closeMenu() : openMenu()));
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && menuOpen) {
    closeMenu();
    menuToggle?.focus();
  }
});
window.matchMedia('(min-width: 961px)').addEventListener('change', (e) => e.matches && closeMenu());

const navProgress = $('[data-nav-progress]');
const setProgress = navProgress ? gsap.quickSetter(navProgress, 'scaleX') : null;
if (navWrap) {
  ScrollTrigger.create({
    start: 0,
    end: 'max',
    onUpdate(self) {
      const hide = self.direction === 1 && self.scroll() > 480 && !menuOpen;
      navWrap.classList.toggle('is-hidden', hide);
      setProgress?.(self.progress);
    },
  });
}

/* ---------- Theme ---------- */
// Base.astro sets data-theme before paint; here the toggle flips it and remembers the choice.
// Without a stored choice the page keeps following the system setting.
const themeToggle = $<HTMLButtonElement>('[data-theme-toggle]');
const systemDark = window.matchMedia('(prefers-color-scheme: dark)');
function applyTheme(theme: 'light' | 'dark') {
  root.dataset.theme = theme;
  $<HTMLMetaElement>('meta[name="theme-color"]')!.content = theme === 'dark' ? '#111113' : '#f4f4f5';
  themeToggle?.setAttribute('aria-pressed', String(theme === 'dark'));
}
applyTheme(root.dataset.theme === 'dark' ? 'dark' : 'light');
themeToggle?.addEventListener('click', () => {
  const next = root.dataset.theme === 'dark' ? 'light' : 'dark';
  try {
    localStorage.setItem('cartium-theme', next);
  } catch {}
  // The new theme spreads out from the toggle as a circle (View Transitions where supported).
  if (reduceMotion || typeof document.startViewTransition !== 'function') {
    applyTheme(next);
    return;
  }
  const r = themeToggle.getBoundingClientRect();
  const x = r.left + r.width / 2;
  const y = r.top + r.height / 2;
  const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
  const t = document.startViewTransition(() => applyTheme(next));
  t.ready.then(() =>
    root.animate(
      { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
      { duration: 900, easing: 'cubic-bezier(0.16, 1, 0.3, 1)', pseudoElement: '::view-transition-new(root)' },
    ),
  );
});
systemDark.addEventListener('change', (e) => {
  let stored: string | null = null;
  try {
    stored = localStorage.getItem('cartium-theme');
  } catch {}
  if (!stored) applyTheme(e.matches ? 'dark' : 'light');
});

/* ---------- Accessible radio groups built from buttons ---------- */
function radioGroup(group: HTMLElement, onSelect: (btn: HTMLButtonElement) => void) {
  const radios = $$<HTMLButtonElement>('[role="radio"]', group);
  const select = (btn: HTMLButtonElement, focus = false) => {
    radios.forEach((r) => {
      const on = r === btn;
      r.setAttribute('aria-checked', String(on));
      r.tabIndex = on ? 0 : -1;
    });
    if (focus) btn.focus();
    onSelect(btn);
  };
  radios.forEach((r, i) => {
    r.tabIndex = r.getAttribute('aria-checked') === 'true' ? 0 : -1;
    r.addEventListener('click', () => select(r));
    r.addEventListener('keydown', (e) => {
      const step = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
      if (!step) return;
      e.preventDefault();
      select(radios[(i + step + radios.length) % radios.length], true);
    });
  });
}

/* ---------- Hero ---------- */
function startNotifCycle() {
  const items = $$('[data-notif-item]');
  const notif = $('[data-notif]');
  if (items.length < 2 || !notif || reduceMotion) return;
  let i = 0;
  let visible = true;
  new IntersectionObserver(([e]) => (visible = e.isIntersecting)).observe(notif);
  window.setInterval(() => {
    if (!visible || document.hidden) return;
    const cur = items[i];
    i = (i + 1) % items.length;
    const next = items[i];
    gsap
      .timeline()
      .to(cur, { autoAlpha: 0, y: -10, filter: 'blur(4px)', duration: 0.35, ease: 'power2.in' })
      .set(cur, { y: 0, filter: 'blur(0px)' })
      .fromTo(next, { autoAlpha: 0, y: 12, filter: 'blur(6px)' }, { autoAlpha: 1, y: 0, filter: 'blur(0px)', duration: 0.7, ease: EASE })
      .fromTo(notif, { scale: 0.97 }, { scale: 1, duration: 0.7, ease: EASE }, '<')
      .add(() => orderLanded(notif), '<');
    cur.classList.remove('is-active');
    next.classList.add('is-active');
  }, 4200);
}

// Each paid order: a ring leaves the notification and the light behind the phones flares once.
function orderLanded(notif: HTMLElement) {
  notif.classList.remove('is-ping');
  void notif.offsetWidth;
  notif.classList.add('is-ping');
  const aura = $('[data-hero-aura]');
  if (aura)
    gsap.fromTo(aura, { '--flare': 1.45, '--flare-s': 1.06 }, { '--flare': 1, '--flare-s': 1, duration: 1.8, ease: 'power3.out' });
}

// Ambient light loops only while it is on screen.
function auras() {
  if (reduceMotion) return;
  const io = new IntersectionObserver((entries) =>
    entries.forEach((e) => e.target.classList.toggle('is-still', !e.isIntersecting)),
  );
  $$('.aura').forEach((el) => io.observe(el));
}

function heroMotion() {
  const hero = $('[data-hero]');
  const stage = $('[data-hero-stage]');
  const tilt = $('[data-tilt]');
  const notif = $('[data-notif]');
  if (!hero || !stage || !tilt || reduceMotion) return;

  // Scroll: the two headline lines part like a curtain and the phones rise to meet you.
  const scrub = { trigger: hero, start: 'top top', end: 'bottom top', scrub: true };
  gsap.to('[data-hl="1"]', { xPercent: -7, ease: 'none', scrollTrigger: scrub });
  gsap.to('[data-hl="2"]', { xPercent: 9, ease: 'none', scrollTrigger: scrub });
  gsap.to(stage, { y: -80, ease: 'none', scrollTrigger: scrub });
  gsap.to('.hero-slot--left', { xPercent: -10, ease: 'none', scrollTrigger: scrub });
  gsap.to('.hero-slot--right', { xPercent: 10, ease: 'none', scrollTrigger: scrub });

  // Pointer: the fan of phones leans toward the cursor; the notification floats against it.
  if (!finePointer) return;
  const rx = gsap.quickTo(tilt, 'rotationX', { duration: 0.9, ease: 'power3.out' });
  const ry = gsap.quickTo(tilt, 'rotationY', { duration: 0.9, ease: 'power3.out' });
  const nx = notif ? gsap.quickTo(notif, 'x', { duration: 1.1, ease: 'power3.out' }) : null;
  const ny = notif ? gsap.quickTo(notif, 'y', { duration: 1.1, ease: 'power3.out' }) : null;
  hero.addEventListener('pointermove', (e) => {
    const r = stage.getBoundingClientRect();
    const px = gsap.utils.clamp(-1, 1, (e.clientX - (r.left + r.width / 2)) / r.width);
    const py = gsap.utils.clamp(-1, 1, (e.clientY - (r.top + r.height / 2)) / r.height);
    ry(px * 10);
    rx(py * -7);
    nx?.(px * 18);
    ny?.(py * 12);
  });
  hero.addEventListener('pointerleave', () => {
    rx(0);
    ry(0);
    nx?.(0);
    ny?.(0);
  });
}

function magnetic() {
  if (reduceMotion || !finePointer) return;
  $$('[data-magnetic]').forEach((el) => {
    const x = gsap.quickTo(el, 'x', { duration: 0.6, ease: 'power3.out' });
    const y = gsap.quickTo(el, 'y', { duration: 0.6, ease: 'power3.out' });
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      x((e.clientX - (r.left + r.width / 2)) * 0.18);
      y((e.clientY - (r.top + r.height / 2)) * 0.28);
    });
    el.addEventListener('pointerleave', () => {
      x(0);
      y(0);
    });
  });
}

/* ---------- Chat to order story ---------- */
// Everything is on screen from the start; nothing waits for a timeline. As the screen arrives its
// parts come into focus one by one, the way Apple opens a section: the two lines of the claim, the
// Direct window with its messages settling in a quick cascade, then Cartium and its three steps.
function storyReveal() {
  const section = $('[data-story]');
  if (!section || reduceMotion) return;
  const grid = $('[data-story-grid]', section)!;
  // A deep link or a reload mid-page leaves the screen as it is.
  if (grid.getBoundingClientRect().top < window.innerHeight * 0.75) return;
  const claim = $$('[data-claim]', section);
  const ig = $('[data-ig]', section)!;
  const bubbles = $$('[data-bubble]', ig);
  const cart = $('[data-cart]', section)!;
  const steps = $$('[data-cart-step]', cart);
  const panel = { autoAlpha: 0, y: 56, scale: 0.96, filter: 'blur(14px)' };
  const piece = { autoAlpha: 0, y: 18, filter: 'blur(8px)' };
  gsap.set([...claim, ig, cart], panel);
  gsap.set([...bubbles, ...steps], piece);
  const into = { autoAlpha: 1, y: 0, scale: 1, filter: 'blur(0px)', ease: EASE, clearProps: 'filter,transform' };
  ScrollTrigger.create({
    trigger: grid,
    start: 'top 72%',
    once: true,
    onEnter: () =>
      gsap
        .timeline()
        .to(ig, { ...into, duration: 1.5 }, 0.1)
        .to(bubbles, { ...into, duration: 0.9, stagger: 0.045 }, 0.4)
        .to(cart, { ...into, duration: 1.5 }, 0.3)
        .to(steps, { ...into, duration: 1.1, stagger: 0.12 }, 0.65)
        .to(claim, { ...into, duration: 1.4, stagger: 0.22 }, 0.5),
  });
}

/* ---------- Launch steps ---------- */
function launch(mm: gsap.MatchMedia) {
  const section = $('[data-launch]');
  if (!section) return;
  const fill = $('[data-steps-fill]', section);
  const steps = $$('[data-step]', section);
  if (!fill) return;
  if (reduceMotion) {
    steps.forEach((s) => s.classList.add('is-active'));
    return;
  }
  const line = fill.parentElement!;
  const build = (prop: 'scaleX' | 'scaleY') => {
    const horizontal = prop === 'scaleX';
    // Where each step's circle sits along the line, as a 0..1 fraction.
    const marks = () => {
      const l = line.getBoundingClientRect();
      return steps.map((s) => {
        const c = s.querySelector('.step-num')!.getBoundingClientRect();
        return horizontal ? (c.left + c.width / 2 - l.left) / l.width : (c.top + c.height / 2 - l.top) / l.height;
      });
    };
    let at = marks();
    gsap.set(fill, { scaleX: 1, scaleY: 1 });
    gsap.fromTo(
      fill,
      { [prop]: 0 },
      {
        [prop]: 1,
        ease: 'none',
        scrollTrigger: {
          trigger: section.querySelector('.steps'),
          start: horizontal ? 'top 72%' : 'top 65%',
          end: horizontal ? 'bottom 45%' : 'bottom 60%',
          scrub: 0.5,
          onRefresh: () => (at = marks()),
          onUpdate: (self) => steps.forEach((s, i) => s.classList.toggle('is-active', self.progress >= at[i] - 0.02)),
        },
      },
    );
  };
  mm.add('(min-width: 961px)', () => build('scaleX'));
  mm.add('(max-width: 960px)', () => build('scaleY'));
}

/* ---------- Showcase ---------- */
// A feature switcher: tabs on the left, the phone on the right. It advances by itself while
// in view and untouched; a click, a key or hovering it hands control to the visitor.
function showcase() {
  const section = $('[data-showcase]');
  if (!section) return;
  const list = $('[data-sc-tabs]', section)!;
  const tabs = $$<HTMLButtonElement>('[data-sc-tab]', section);
  const shots = $$('[data-sc-shot]', section);
  const panel = $('[data-sc-panel]', section)!;
  const caption = $('[data-sc-caption]', section);
  const texts = tabs.map((t) => t.querySelector('.sc-text')?.textContent ?? '');
  const TIME = 5000;
  let current = 0;
  let timer = 0;
  let inView = false;
  let auto = !reduceMotion;

  const select = (n: number, focus = false) => {
    if (n === current) return;
    shots[current].classList.add('is-leaving');
    const prev = current;
    window.setTimeout(() => shots[prev].classList.remove('is-leaving'), 700);
    current = n;
    tabs.forEach((t, i) => {
      const on = i === n;
      t.classList.toggle('is-active', on);
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
    });
    shots.forEach((el, i) => {
      el.classList.toggle('is-on', i === n);
      el.setAttribute('aria-hidden', String(i !== n));
    });
    panel.setAttribute('aria-labelledby', tabs[n].id);
    if (caption) caption.textContent = texts[n];
    if (focus) tabs[n].focus();
    // Keep the chip in view on the mobile row without scrolling the page.
    if (list.scrollWidth > list.clientWidth) {
      list.scrollTo({ left: tabs[n].offsetLeft - 16, behavior: reduceMotion ? 'auto' : 'smooth' });
    }
    restart();
  };
  const restart = () => {
    window.clearTimeout(timer);
    // Restart the CSS progress animation for the new active tab.
    list.classList.remove('is-auto');
    if (!auto || !inView) return;
    void list.offsetWidth;
    list.classList.add('is-auto');
    timer = window.setTimeout(() => select((current + 1) % tabs.length), TIME);
  };
  const stopAuto = () => {
    auto = false;
    window.clearTimeout(timer);
    list.classList.remove('is-auto');
  };

  list.style.setProperty('--sc-time', `${TIME}ms`);
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => {
      stopAuto();
      select(i);
    });
    t.addEventListener('keydown', (e) => {
      const step = ['ArrowDown', 'ArrowRight'].includes(e.key) ? 1 : ['ArrowUp', 'ArrowLeft'].includes(e.key) ? -1 : 0;
      if (!step) return;
      e.preventDefault();
      stopAuto();
      select((i + step + tabs.length) % tabs.length, true);
    });
  });
  // Hover pauses (the line stops where it is); leaving resumes the remaining time.
  section.querySelector('.sc-grid')?.addEventListener('pointerenter', (e) => {
    if ((e as PointerEvent).pointerType !== 'mouse' || !auto) return;
    window.clearTimeout(timer);
    list.classList.add('is-paused');
  });
  section.querySelector('.sc-grid')?.addEventListener('pointerleave', (e) => {
    if ((e as PointerEvent).pointerType !== 'mouse' || !auto) return;
    list.classList.remove('is-paused');
    restart();
  });
  new IntersectionObserver(
    ([e]) => {
      inView = e.isIntersecting;
      if (inView) restart();
      else window.clearTimeout(timer);
    },
    { threshold: 0.4 },
  ).observe(panel);
}

/* ---------- Black stages ---------- */
// A stage arrives as an inset card and opens to full bleed by the time it reaches the top.
function stages() {
  if (reduceMotion) return;
  $$('[data-stage]').forEach((el) => {
    // ...and its violet light comes up as it opens, as if the stage were switched on.
    gsap.fromTo(
      el,
      { '--stage-x': () => `${Math.min(48, window.innerWidth * 0.03)}px`, '--stage-r': '40px', '--stage-glow': 0 },
      {
        '--stage-x': '0px',
        '--stage-r': '0px',
        '--stage-glow': 1,
        ease: 'none',
        scrollTrigger: { trigger: el, start: 'top bottom', end: 'top 10%', scrub: true, invalidateOnRefresh: true },
      },
    );
  });
}

/* ---------- Growth demos ---------- */
// AI photo: operation, backdrop or scene, a before/after split and the accept step.
function aiPhoto() {
  const tile = $('[data-ai]');
  if (!tile) return;
  const after = $('[data-ai-after]', tile)!;
  const compare = $('[data-ai-compare]', tile)!;
  const range = $<HTMLInputElement>('[data-ai-range]', tile)!;
  const hint = $('[data-ai-hint]', tile)!;
  const backgrounds = $('[data-ai-backgrounds]', tile)!;
  const scenes = $('[data-ai-scenes]', tile)!;
  const status = $('[data-ai-status]', tile)!;
  let busy = 0;
  const regenerate = () => {
    status.textContent = '';
    if (reduceMotion) return;
    after.classList.remove('is-busy');
    void after.offsetWidth;
    after.classList.add('is-busy');
    window.clearTimeout(busy);
    busy = window.setTimeout(() => after.classList.remove('is-busy'), 800);
  };
  const setSplit = (v: number) => {
    range.value = String(v);
    compare.style.setProperty('--split', `${v}%`);
  };
  range.addEventListener('input', () => setSplit(Number(range.value)));

  const group = $('[role="radiogroup"]', tile)!;
  radioGroup(group, (btn) => {
    const op = btn.dataset.aiOp!;
    after.dataset.op = op;
    hint.textContent = btn.title;
    const lifestyle = op === 'lifestyle';
    backgrounds.hidden = lifestyle;
    scenes.hidden = !lifestyle;
    // Show more of the result once the visitor starts choosing.
    if (Number(range.value) > 30) setSplit(30);
    regenerate();
  });
  $$<HTMLInputElement>('[data-ai-swatch]', tile).forEach((input) =>
    input.addEventListener('change', () => {
      if (!input.checked) return;
      after.style.setProperty('--ai-bg', input.value);
      regenerate();
    }),
  );
  $$<HTMLInputElement>('[data-ai-scene]', tile).forEach((input) =>
    input.addEventListener('change', () => {
      if (!input.checked) return;
      after.dataset.scene = input.value;
      regenerate();
    }),
  );
  $('[data-ai-accept]', tile)!.addEventListener('click', () => {
    setSplit(0);
    status.textContent = 'Фото додано в товар «Кільце»';
  });
}

function growth() {
  aiPhoto();

  const reminder = $('[data-reminder]');
  const remindGroup = reminder?.querySelector<HTMLElement>('[role="radiogroup"]');
  const remindLabel = $('[data-remind-label]');
  if (remindGroup && remindLabel) {
    radioGroup(remindGroup, (btn) => {
      remindLabel.textContent = btn.dataset.remind ?? '';
      if (!reduceMotion) gsap.fromTo('.remind-msg', { y: 8, autoAlpha: 0.4 }, { y: 0, autoAlpha: 1, duration: 0.5, ease: EASE });
    });
  }

  const sw = $<HTMLButtonElement>('[data-pause-switch]');
  const shop = $('[data-pause-shop]');
  sw?.addEventListener('click', () => {
    const on = sw.getAttribute('aria-checked') !== 'true';
    sw.setAttribute('aria-checked', String(on));
    shop?.classList.toggle('is-paused', on);
  });
}

/* ---------- Pricing ---------- */
function pricing() {
  const section = $('[data-pricing]');
  const group = section?.querySelector<HTMLElement>('[role="radiogroup"]');
  if (!section || !group) return;
  const prices = $$('[data-price]', section);
  const billed = $$('[data-billed]', section);
  radioGroup(group, (btn) => {
    const period = btn.dataset.period === 'yearly' ? 'yearly' : 'monthly';
    prices.forEach((el) => {
      const to = Number(el.dataset[period]);
      const from = Number(el.textContent);
      if (reduceMotion) {
        el.textContent = String(to);
        return;
      }
      const o = { v: from };
      gsap.to(o, { v: to, duration: 0.6, ease: 'power3.out', onUpdate: () => (el.textContent = String(Math.round(o.v))) });
      gsap.fromTo(el, { y: period === 'yearly' ? 10 : -10 }, { y: 0, duration: 0.6, ease: EASE });
    });
    billed.forEach((el) => (el.textContent = el.dataset[`${period}Text`] ?? ''));
  });
}

/* ---------- Grid reveals ---------- */
function reveals() {
  if (reduceMotion) return;
  const groups = ['.bento .tile', '.ways-grid .way', '.plans .plan', '.faq-list .qa', '.rails-list .rail', '.verdicts .verdict-card'];
  groups.forEach((sel) => {
    const items = $$(sel);
    if (!items.length) return;
    // Cards come into focus rather than just fading: a short rise out of a soft blur.
    // Anything already on screen (a deep link, a reload mid-page) is left as it is.
    const below = items.filter((el) => el.getBoundingClientRect().top > window.innerHeight * 0.9);
    if (!below.length) return;
    gsap.set(below, { autoAlpha: 0, y: 48, scale: 0.97, filter: 'blur(14px)' });
    ScrollTrigger.batch(below, {
      start: 'top 90%',
      once: true,
      onEnter: (batch) =>
        gsap.to(batch, {
          autoAlpha: 1,
          y: 0,
          scale: 1,
          filter: 'blur(0px)',
          duration: 1.4,
          stagger: 0.12,
          ease: EASE,
          overwrite: true,
          clearProps: 'filter,transform',
        }),
    });
  });

  // The closing panel opens up as it arrives.
  const final = $('[data-final]');
  if (final) {
    gsap.fromTo(
      final,
      { clipPath: 'inset(8% 6% 8% 6% round 48px)' },
      { clipPath: 'inset(0% 0% 0% 0% round 40px)', ease: 'none', scrollTrigger: { trigger: final, start: 'top 95%', end: 'top 45%', scrub: true } },
    );
    gsap.fromTo('.final-mark', { rotation: -8, yPercent: 10 }, { rotation: 0, yPercent: -6, ease: 'none', scrollTrigger: { trigger: final, start: 'top bottom', end: 'bottom top', scrub: true } });
  }
}

/* ---------- Comparison table ---------- */
function compare() {
  const section = $('[data-compare]');
  if (!section) return;
  const table = $('[data-compare-table]', section)!;
  const group = $('[role="radiogroup"]', section)!;
  // On phones Cartium faces one rival at a time; the rival column slides in on each switch.
  radioGroup(group, (btn) => {
    table.dataset.show = btn.dataset.rival;
    if (reduceMotion) return;
    table.classList.remove('is-swapping');
    void table.offsetWidth;
    table.classList.add('is-swapping');
  });
  if (reduceMotion || table.getBoundingClientRect().top < window.innerHeight * 0.9) return;
  // Rows fill in one after another, Cartium's cell first in each.
  root.classList.add('compare-ready');
  ScrollTrigger.batch($$('[data-compare-row]', table), {
    start: 'top 90%',
    once: true,
    onEnter: (batch) => batch.forEach((row, i) => window.setTimeout(() => row.classList.add('is-in'), i * 110)),
  });
}

/* ---------- Headlines ---------- */
// Wrap each word of a heading in a mask so it can rise into place. Non-breaking spaces stay
// inside a word, so pairs like «за вечір» move as one.
function splitWords(el: HTMLElement) {
  el.setAttribute('aria-label', el.textContent?.replace(/\s+/g, ' ').trim() ?? '');
  const walk = (node: Node) => {
    [...node.childNodes].forEach((child) => {
      if (child.nodeType === Node.TEXT_NODE) {
        const frag = document.createDocumentFragment();
        (child.textContent ?? '').split(/( +)/).forEach((part) => {
          if (!part) return;
          if (/^ +$/.test(part)) {
            frag.append(part);
            return;
          }
          const outer = document.createElement('span');
          outer.className = 'rw';
          outer.setAttribute('aria-hidden', 'true');
          const inner = document.createElement('span');
          inner.className = 'rw-i';
          inner.textContent = part;
          outer.append(inner);
          frag.append(outer);
        });
        child.replaceWith(frag);
      } else if (child.nodeType === Node.ELEMENT_NODE) walk(child);
    });
  };
  walk(el);
}

// Section headlines rise word by word out of a mask as they come into view, then the copy and
// buttons beside them follow out of a soft blur, the way Apple's product pages open a section.
// Big panels marked data-rise grow into place with the scroll.
function headlines() {
  if (reduceMotion) return;
  $$('main section:not([data-hero]) .h2').forEach((h) => {
    if (h.getBoundingClientRect().top < window.innerHeight * 0.9) return;
    // Chrome headings paint their gradient across the whole line, so they rise as one block.
    const chrome = h.querySelector('.chrome-text');
    if (!chrome) splitWords(h);
    const words = chrome ? [] : $$('.rw-i', h);
    const followers = [...(h.parentElement?.children ?? [])].filter((el) => el !== h) as HTMLElement[];
    if (chrome) gsap.set(h, { clipPath: 'inset(0 0 100% 0)', y: 40 });
    else gsap.set(words, { yPercent: 115 });
    gsap.set(followers, { autoAlpha: 0, y: 40, filter: 'blur(14px)' });
    ScrollTrigger.create({
      trigger: h,
      start: 'top 88%',
      once: true,
      onEnter: () => {
        const tl = gsap.timeline();
        if (chrome) tl.to(h, { clipPath: 'inset(0 0 -20% 0)', y: 0, duration: 1.3, ease: EASE });
        else tl.to(words, { yPercent: 0, duration: 1.2, stagger: 0.055, ease: EASE });
        tl.to(
          followers,
          { autoAlpha: 1, y: 0, filter: 'blur(0px)', duration: 1.4, stagger: 0.16, ease: EASE, clearProps: 'filter' },
          0.35,
        );
      },
    });
  });

  $$('[data-rise]').forEach((el) =>
    gsap.fromTo(
      el,
      { scale: 0.93, y: 48, autoAlpha: 0.25 },
      { scale: 1, y: 0, autoAlpha: 1, ease: 'none', scrollTrigger: { trigger: el, start: 'top bottom', end: 'top 62%', scrub: 0.6 } },
    ),
  );
}

/* ---------- Screens ---------- */
// The page reads as a run of screens, each a heading with its interface. Scrolling stays free; when
// it comes to rest near the start of a screen, the page glides the last bit and settles it just
// under the navigation. Desktop only: on a phone the blocks are taller than the screen.
function screens() {
  if (!lenis || !window.matchMedia('(min-width: 1024px) and (hover: hover)').matches) return;
  const snap = new Snap(lenis, { type: 'proximity', distanceThreshold: '30%', debounce: 260, duration: 1.1, easing: glide });
  // Layout position, ignoring the scroll-driven transforms (data-rise) some blocks carry.
  const pageTop = (el: HTMLElement) => {
    let y = 0;
    for (let e: HTMLElement | null = el; e; e = e.offsetParent as HTMLElement | null) y += e.offsetTop;
    return y;
  };
  let remove: (() => void)[] = [];
  const build = () => {
    remove.forEach((r) => r());
    // Under the floating nav pill (its height plus its top margin), whether or not it is shown now.
    const below = (parseFloat(getComputedStyle(root).getPropertyValue('--nav-h')) || 64) + 30;
    remove = [0, ...$$('[data-snap]').map((el) => Math.max(0, Math.round(pageTop(el) - below)))].map((v) => snap.add(v));
  };
  // Images, fonts and open FAQ answers move the screens; keep the points in step with the layout.
  let pending = 0;
  new ResizeObserver(() => {
    window.clearTimeout(pending);
    pending = window.setTimeout(build, 200);
  }).observe(document.body);
  ScrollTrigger.addEventListener('refresh', build);
  build();
}

/* ---------- Card spotlight ---------- */
// One delegated listener writes the pointer position into the hovered .spot card.
function spotlight() {
  if (!finePointer || reduceMotion) return;
  let raf = 0;
  let last: PointerEvent | null = null;
  document.addEventListener(
    'pointermove',
    (e) => {
      last = e;
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const el = (last?.target as Element | null)?.closest?.<HTMLElement>('.spot');
        if (!el || !last) return;
        const r = el.getBoundingClientRect();
        el.style.setProperty('--mx', `${last.clientX - r.left}px`);
        el.style.setProperty('--my', `${last.clientY - r.top}px`);
      });
    },
    { passive: true },
  );
}

/* ---------- Sticky phone CTA ---------- */
function stickyCta() {
  const bar = $('[data-sticky-cta]');
  const hero = $('[data-hero]');
  const final = $('[data-final]');
  if (!bar || !hero) return;
  let heroVisible = true;
  let finalVisible = false;
  const link = bar.querySelector('a');
  const sync = () => {
    const show = !heroVisible && !finalVisible && !menuOpen;
    bar.classList.toggle('is-visible', show);
    bar.setAttribute('aria-hidden', String(!show));
    link?.setAttribute('tabindex', show ? '0' : '-1');
  };
  new IntersectionObserver(([e]) => {
    heroVisible = e.isIntersecting;
    sync();
  }).observe(hero);
  if (final)
    new IntersectionObserver(([e]) => {
      finalVisible = e.isIntersecting;
      sync();
    }).observe(final);
}

/* ---------- Boot ---------- */
// The hero intro is pure CSS. Everything below the fold is wired once the browser is idle,
// which keeps the first render and input free of ScrollTrigger measurement work.
const idle = (fn: () => void) => {
  if (typeof window.requestIdleCallback === 'function') window.requestIdleCallback(fn, { timeout: 700 });
  else setTimeout(fn, 200);
};

heroMotion();
magnetic();
spotlight();
auras();
window.setTimeout(startNotifCycle, 2200);

idle(() => {
  initDemo();
  stickyCta();
  growth();
  pricing();
  const mm = gsap.matchMedia();
  storyReveal();
  launch(mm);
  showcase();
  stages();
  compare();
  headlines();
  reveals();
  screens();
  ScrollTrigger.refresh();
  document.fonts?.ready.then(() => ScrollTrigger.refresh());
  if (location.hash.length > 1) window.setTimeout(() => scrollToHash(location.hash), 300);
});
