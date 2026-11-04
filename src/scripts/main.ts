import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import 'lenis/dist/lenis.css';
import { initDemo } from './demo';
import { initPointer } from './pointer';

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
  // The address bar keeps no hash, so a reload starts from the top again.
  scrollToHash(hash);
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
// The left line follows the same progress with a little lag, so it glides rather than ticks.
const scrollLine = $('[data-scroll-line]');
const line = { p: 0 };
const lineTo = scrollLine
  ? gsap.quickTo(line, 'p', {
      duration: reduceMotion ? 0 : 0.7,
      ease: 'power3.out',
      onUpdate: () => scrollLine.style.setProperty('--p', line.p.toFixed(4)),
    })
  : null;
let lineIdle = 0;
if (navWrap) {
  ScrollTrigger.create({
    start: 0,
    end: 'max',
    onUpdate(self) {
      const hide = self.direction === 1 && self.scroll() > 480 && !menuOpen;
      navWrap.classList.toggle('is-hidden', hide);
      navWrap.classList.toggle('is-scrolled', self.scroll() > 40);
      setProgress?.(self.progress);
      lineTo?.(self.progress);
      if (scrollLine) {
        scrollLine.classList.add('is-moving');
        window.clearTimeout(lineIdle);
        lineIdle = window.setTimeout(() => scrollLine.classList.remove('is-moving'), 260);
      }
    },
  });
}

/* ---------- Theme ---------- */
// Base.astro sets data-theme before paint; here the toggle flips it and remembers the choice.
// Without a stored choice the page is dark.
const themeToggle = $<HTMLButtonElement>('[data-theme-toggle]');
function applyTheme(theme: 'light' | 'dark') {
  root.dataset.theme = theme;
  $<HTMLMetaElement>('meta[name="theme-color"]')!.content = theme === 'dark' ? '#111113' : '#f4f4f5';
  themeToggle?.setAttribute('aria-pressed', String(theme === 'dark'));
}
applyTheme(root.dataset.theme === 'dark' ? 'dark' : 'light');
// The new theme grows out of the toggle: a circle with a feathered edge, slow to start and slow to
// land, while the old page sinks back a touch underneath it.
const softReveal = 'CSSPropertyRule' in window;
let switching = false;
themeToggle?.addEventListener('click', () => {
  if (switching) return;
  const next = root.dataset.theme === 'dark' ? 'light' : 'dark';
  try {
    localStorage.setItem('cartium-theme-v2', next);
  } catch {}
  if (reduceMotion) {
    applyTheme(next);
    return;
  }
  if (typeof document.startViewTransition !== 'function') {
    root.classList.add('theme-fade');
    applyTheme(next);
    window.setTimeout(() => root.classList.remove('theme-fade'), 650);
    return;
  }
  const r = themeToggle.getBoundingClientRect();
  const x = r.left + r.width / 2;
  const y = r.top + r.height / 2;
  const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
  const soft = 120;
  const timing = { duration: 1150, easing: 'cubic-bezier(0.65, 0, 0.25, 1)', fill: 'both' as const };
  root.style.setProperty('--vt-x', `${x}px`);
  root.style.setProperty('--vt-y', `${y}px`);
  root.classList.toggle('vt-hard', !softReveal);
  switching = true;
  const t = document.startViewTransition(() => applyTheme(next));
  t.ready.then(() => {
    root.animate(
      softReveal
        ? { '--vt-r': ['0px', `${radius + soft}px`] }
        : { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
      { ...timing, pseudoElement: '::view-transition-new(root)' },
    );
    root.animate(
      { transform: ['scale(1)', 'scale(0.985)'], filter: ['brightness(1)', 'brightness(0.8)'] },
      { ...timing, pseudoElement: '::view-transition-old(root)' },
    );
  });
  // A transition the browser skips (a hidden tab, say) still switches the theme; nothing to report.
  t.ready.catch(() => {});
  t.finished
    .catch(() => {})
    .finally(() => {
      switching = false;
      root.classList.remove('vt-hard');
    });
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
  // The island on the centre phone swells once, the way a Live Activity announces itself.
  $('.hero-slot--center .iphone-island')?.animate([{ scale: '1' }, { scale: '1.4 1.12', offset: 0.3 }, { scale: '1' }], {
    duration: 1100,
    easing: 'cubic-bezier(0.32, 0.72, 0, 1)',
  });
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
  // The fan of phones closes into one (Hero.astro, --merge).
  gsap.fromTo(stage, { '--merge': 0 }, { '--merge': 1, ease: 'none', scrollTrigger: { ...scrub, end: '70% top' } });

  // The first order grows out of the centre phone's Dynamic Island, like a Live Activity. The CSS
  // keeps the card hidden; at 1.2s, once the phone has risen, both are measured first and only then
  // the card opens out, moving nothing but translate, scale and opacity so it stays on the GPU.
  const island = $('.hero-slot--center .iphone-island');
  if (notif && island)
    window.setTimeout(() => {
      const hold = notif.getAnimations().find((a) => (a as CSSAnimation).animationName?.includes('hero-notif'));
      // Too late (a busy start): the CSS fade has begun, so leave it alone.
      if (!hold || Number(hold.currentTime) >= 2500) return;
      const n = notif.getBoundingClientRect();
      const i = island.getBoundingClientRect();
      // If the phone is still finishing its rise, aim at where the island will settle.
      const phone = island.closest<HTMLElement>('.hero-phone');
      const t = phone ? getComputedStyle(phone).transform : 'none';
      const rise = t === 'none' ? 0 : new DOMMatrix(t).m42;
      const dx = i.left + i.width / 2 - (n.left + n.width / 2);
      const dy = i.top + i.height / 2 - rise - (n.top + n.height / 2);
      hold.cancel();
      notif.animate(
        [
          { opacity: 0, translate: `${dx}px ${dy}px`, scale: '0.16 0.12' },
          { opacity: 1, offset: 0.22 },
          { opacity: 1, translate: '0 0', scale: '1 1' },
        ],
        { duration: 1000, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' },
      );
    }, 1200);

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
// parts come into focus one by one, the way Apple opens a section: the Direct window with its
// messages settling in a quick cascade, the Cartium phone, then the two lines of the claim.
function storyReveal(onShown: () => void) {
  const section = $('[data-story]');
  if (!section) return;
  const grid = $('[data-story-grid]', section)!;
  // Without motion it is simply there; a screen already scrolled past stays as it is.
  if (reduceMotion || grid.getBoundingClientRect().bottom < 0) return onShown();
  const claim = $$('[data-claim]', section);
  const ig = $('[data-ig]', section)!;
  const bubbles = $$('[data-bubble]', ig);
  const tg = $('[data-tg]', section)!;
  const [igLabel, tgLabel] = $$('[data-story-label]', section);
  const panel = { autoAlpha: 0, y: 56, scale: 0.96, filter: 'blur(14px)' };
  gsap.set([...claim, igLabel, ig, tgLabel, tg], panel);
  gsap.set(bubbles, { autoAlpha: 0, y: 18, filter: 'blur(8px)' });
  const into = { autoAlpha: 1, y: 0, scale: 1, filter: 'blur(0px)', ease: EASE, clearProps: 'filter,transform' };
  ScrollTrigger.create({
    trigger: grid,
    start: 'top 85%',
    once: true,
    onEnter: () =>
      gsap
        .timeline({ onComplete: onShown })
        .to([igLabel, ig], { ...into, duration: 1.5 }, 0.1)
        .to(bubbles, { ...into, duration: 0.9, stagger: 0.045 }, 0.4)
        .to([tgLabel, tg], { ...into, duration: 1.5 }, 0.3)
        .to(claim, { ...into, duration: 1.4, stagger: 0.22 }, 0.5),
  });
}

// The Cartium phone buys the same T-shirt on a loop: tap "+", the cart rises, "Оформити
// замовлення", the Apple Pay sheet, a double press of the side button, paid. It only runs while the
// phone is on screen; without motion it rests on the Apple Pay sheet.
function storyShop() {
  const tg = $('[data-tg]');
  if (!tg) return;
  const add = $('[data-tg-add]', tg)!;
  const badge = $('[data-tg-badge]', tg)!;
  const dim = $('[data-tg-dim]', tg)!;
  const cart = $('[data-tg-cart]', tg)!;
  const pay = $('[data-tg-pay]', tg)!;
  const press = $('[data-tg-press]', tg)!;
  const done = $('[data-tg-done]', tg)!;
  const [tapAdd, tapCheckout] = $$('[data-tg-tap]', tg);
  const steps = $$('.tg-step-text', tg);
  const clock = $('[data-tg-time]', tg)!;
  // The status-bar clock walks the same three minutes as the claim beside it.
  const times = ['10:02', '10:03', '10:04', '10:04'];
  const step = (i: number) => {
    steps.forEach((s, k) => s.classList.toggle('is-on', k === i));
    clock.textContent = times[i];
  };
  if (reduceMotion) {
    add.classList.add('is-added');
    gsap.set(badge, { opacity: 1, scale: 1 });
    gsap.set(dim, { opacity: 1 });
    gsap.set(pay, { yPercent: 0, y: 0 });
    step(2);
    return;
  }
  const tap = (el: HTMLElement) =>
    gsap.timeline().fromTo(el, { scale: 0.3, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.25, ease: 'power2.out' }).to(el, { scale: 1.5, opacity: 0, duration: 0.45, ease: 'power2.out' });
  // The sheets start below the screen (CSS); GSAP takes their transform over from here.
  gsap.set([cart, pay], { y: 0, yPercent: 105 });
  const sheetUp = { yPercent: 0, duration: 0.75, ease: EASE };
  const tl = gsap.timeline({ paused: true, repeat: -1, repeatDelay: 0.4 });
  tl.call(() => {
    step(0);
    add.classList.remove('is-added');
    pay.classList.remove('is-paid');
  })
    .set(badge, { opacity: 0, scale: 0.3 })
    .set([cart, pay], { yPercent: 105 })
    .set([dim, done], { opacity: 0 })
    .set(cart, { opacity: 1 })
    .add(tap(tapAdd), 0.7)
    .call(() => add.classList.add('is-added'), [], 0.85)
    .to(badge, { opacity: 1, scale: 1, duration: 0.5, ease: 'back.out(3)' }, 0.95)
    .call(() => step(1), [], 1.5)
    .to(dim, { opacity: 1, duration: 0.5 }, 1.5)
    .to(cart, sheetUp, 1.5)
    .add(tap(tapCheckout), 2.6)
    .to(cart.querySelector('.tg-cta'), { scale: 0.97, duration: 0.12, yoyo: true, repeat: 1 }, 2.7)
    .call(() => step(2), [], 3.1)
    .to(pay, sheetUp, 3.1)
    // Apple Pay takes the screen: the cart sinks away under it.
    .to(cart, { opacity: 0, duration: 0.35 }, 3.3)
    .to(press, { opacity: 1, duration: 0.12, yoyo: true, repeat: 3 }, 4.1)
    .call(() => pay.classList.add('is-paid'), [], 4.7)
    .call(() => step(3), [], 5.4)
    .to(done, { opacity: 1, duration: 0.6, ease: 'power2.out' }, 5.4)
    .fromTo(done.querySelector('.tg-done-mark'), { scale: 0.5 }, { scale: 1, duration: 0.8, ease: 'back.out(2.2)' }, 5.45)
    .to({}, { duration: 1.8 });
  // Off screen it rests; back on screen it carries on.
  new IntersectionObserver(([e]) => (e.isIntersecting ? tl.play() : tl.pause()), { threshold: 0.35 }).observe(tg);
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
// AI photo: operation, a before/after split and the accept step.
function aiPhoto() {
  const tile = $('[data-ai]');
  if (!tile) return;
  const after = $('[data-ai-after]', tile)!;
  const compare = $('[data-ai-compare]', tile)!;
  const range = $<HTMLInputElement>('[data-ai-range]', tile)!;
  const status = $('[data-ai-status]', tile)!;
  let busy = 0;
  const regenerate = () => {
    status.textContent = '';
    if (reduceMotion) return;
    after.classList.remove('is-busy');
    void after.offsetWidth;
    after.classList.add('is-busy');
    window.clearTimeout(busy);
    busy = window.setTimeout(() => after.classList.remove('is-busy'), 650);
  };
  const setSplit = (v: number) => {
    range.value = String(v);
    compare.style.setProperty('--split', `${v}%`);
  };
  range.addEventListener('input', () => setSplit(Number(range.value)));

  const imgs = Array.from(after.querySelectorAll<HTMLImageElement>('[data-ai-img]'));
  const bgs = $('[data-ai-bgs]', tile)!;
  let op = 'replace_background';
  let bg = 'violet';
  const show = () => {
    const key = op === 'replace_background' ? `${op}:${bg}` : op;
    for (const img of imgs) {
      const on = img.dataset.aiImg === key;
      img.classList.toggle('is-on', on);
      img.toggleAttribute('aria-hidden', !on);
    }
    bgs.hidden = op !== 'replace_background';
    // Show more of the result once the visitor starts choosing.
    if (Number(range.value) > 30) setSplit(30);
    regenerate();
  };
  radioGroup($('.ops', tile)!, (btn) => {
    op = btn.dataset.aiOp!;
    show();
  });
  radioGroup(bgs, (btn) => {
    bg = btn.dataset.aiBg!;
    show();
  });
  $('[data-ai-accept]', tile)!.addEventListener('click', () => {
    setSplit(0);
    status.textContent = 'Фото додано в товар «Футболка»';
  });
}

function growth() {
  aiPhoto();

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

  // One lit card at a time: the one under the pointer or focus, back to Pro when you leave.
  const cards = $$('[data-plan]', section);
  const home = cards.find((c) => c.classList.contains('plan--featured')) ?? cards[0];
  const light = (card: HTMLElement) => cards.forEach((c) => c.classList.toggle('is-on', c === card));
  if (finePointer) {
    cards.forEach((c) => c.addEventListener('pointerenter', () => light(c)));
    $('[data-plans]', section)?.addEventListener('pointerleave', () => home && light(home));
  }
  section.addEventListener('focusin', (e) => {
    const card = (e.target as Element).closest<HTMLElement>('[data-plan]');
    if (card) light(card);
  });
}

/* ---------- Grid reveals ---------- */
function reveals() {
  if (reduceMotion) return;
  const groups = ['.tools .tool', '.ways-grid .way', '.plans .plan', '.faq-list .qa', '.rails-list .rail', '.verdicts .verdict-card', '.facts .fact', '.own-grid .own-card'];
  groups.forEach((sel) => {
    const items = $$(sel);
    if (!items.length) return;
    // Cards come into focus rather than just fading: a short rise out of a soft blur. Cards on
    // screen at load come in straight away; only those already scrolled past are left alone.
    const below = items.filter((el) => el.getBoundingClientRect().bottom > 0);
    if (!below.length) return;
    below.forEach((el) => el.setAttribute('data-rv', ''));
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
    // The closing line arrives small and grows to full size as the panel opens.
    gsap.fromTo(
      '.final-copy .h2',
      { scale: 0.74, autoAlpha: 0.35 },
      { scale: 1, autoAlpha: 1, transformOrigin: '0% 100%', ease: 'none', scrollTrigger: { trigger: final, start: 'top bottom', end: 'top 25%', scrub: 0.6 } },
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
  if (reduceMotion || table.getBoundingClientRect().bottom < 0) return;
  // Rows fill in one after another, Cartium's cell first in each.
  root.classList.add('compare-ready');
  table.setAttribute('data-rv', '');
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
    if (h.getBoundingClientRect().bottom < 0) return;
    // Chrome headings paint their gradient across the whole line, so they rise as one block.
    const chrome = h.querySelector('.chrome-text');
    if (!chrome) splitWords(h);
    const words = chrome ? [] : $$('.rw-i', h);
    const followers = [...(h.parentElement?.children ?? [])].filter((el) => el !== h) as HTMLElement[];
    if (chrome) gsap.set(h, { clipPath: 'inset(0 0 100% 0)', y: 40 });
    else gsap.set(words, { yPercent: 115 });
    [h, ...followers].forEach((el) => el.setAttribute('data-rv', ''));
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

/* ---------- Statements that fill as you read ---------- */
// A long lead marked data-fill starts faint and lights up word by word with the scroll, the way
// Apple's product pages read a sentence out to you.
function fillText() {
  if (reduceMotion) return;
  $$('[data-fill]').forEach((p) => {
    const walk = (node: Node) =>
      [...node.childNodes].forEach((child) => {
        if (child.nodeType !== Node.TEXT_NODE) return walk(child);
        const frag = document.createDocumentFragment();
        (child.textContent ?? '').split(/(\s+)/).forEach((part) => {
          if (!part.trim()) return frag.append(part);
          const w = document.createElement('span');
          w.className = 'fill-w';
          w.textContent = part;
          frag.append(w);
        });
        child.replaceWith(frag);
      });
    walk(p);
    p.classList.add('is-fill');
    gsap.fromTo(
      $$('.fill-w', p),
      { opacity: 0.2 },
      { opacity: 1, stagger: 0.1, ease: 'none', scrollTrigger: { trigger: p, start: 'top 90%', end: 'bottom 40%', scrub: 0.4 } },
    );
  });
}

/* ---------- Facts count up ---------- */
// Each figure counts up once from zero as the row arrives; tabular digits keep the width still.
function factCount() {
  if (reduceMotion) return;
  const nums = $$('.fact-num > span');
  if (!nums.length) return;
  nums.forEach((el) => {
    const to = Number(el.textContent);
    if (!to) return;
    el.textContent = '0';
    const o = { v: 0 };
    ScrollTrigger.create({
      trigger: el,
      start: 'top 92%',
      once: true,
      onEnter: () =>
        gsap.to(o, { v: to, duration: 1.6, delay: 0.25, ease: 'power3.out', onUpdate: () => (el.textContent = String(Math.round(o.v))) }),
    });
  });
}

/* ---------- Ticks that draw themselves ---------- */
// Plan ticks are wiped in left to right, one after another, as each card's list comes into view.
function drawTicks() {
  if (reduceMotion) return;
  const plans = $$('[data-plan]');
  if (!plans.length) return;
  root.classList.add('ticks-ready');
  const io = new IntersectionObserver(
    (entries) =>
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        io.unobserve(e.target);
        e.target.closest('[data-plan]')?.classList.add('is-drawn');
      }),
    { rootMargin: '0px 0px -12% 0px' },
  );
  plans.forEach((p) => io.observe($('.plan-features', p) ?? p));
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

/* ---------- Everything else ---------- */
// Every other block on the page (a paragraph, a list item, a button, a card, a phone) comes into
// focus on its own as it scrolls in: a rise out of a soft blur, neighbours a beat apart. It runs as a
// Web Animation that is cancelled once it ends, so it never leaves styles behind on the element.
function autoReveal() {
  if (reduceMotion || !('animate' in Element.prototype)) return;
  const blocks = 'h2, h3, h4, p, li, .btn, figure, article, table, picture, img, dl, blockquote, [role="tablist"], [role="radiogroup"], .iphone, .dchat';
  const skip = '[data-hero], [data-story], [data-rise], [data-rv], [hidden], .sr-only';
  const found = new Set($$(blocks, document.querySelector('main') ?? document).concat($$(blocks, $('footer') ?? document.body)));
  const items = [...found].filter((el) => {
    if (el.closest(skip) || el.querySelector('[data-rv]')) return false;
    // Only the outermost block moves; whatever sits inside it rides along.
    for (let up = el.parentElement; up; up = up.parentElement) if (found.has(up)) return false;
    const r = el.getBoundingClientRect();
    return r.height > 0 && r.bottom > 0;
  });
  const anims = new Map<Element, Animation>();
  // Pictures and phones open out of a slightly smaller rounded window instead of rising; the window
  // ends well outside the box so shadows are never clipped.
  const media = 'figure, picture, img, .iphone';
  const opening: Keyframe[] = [
    { opacity: 0, clipPath: 'inset(10% 10% 10% 10% round 44px)', scale: '0.96' },
    { opacity: 1, offset: 0.35 },
    { clipPath: 'inset(-40% -40% -40% -40% round 44px)', scale: '1' },
  ];
  items.forEach((el) => {
    const a = el.animate(el.matches(media) ? opening : [{ opacity: 0, translate: '0 36px', filter: 'blur(10px)' }, {}], {
      duration: el.matches(media) ? 1400 : 1150,
      easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
      fill: 'both',
    });
    a.pause();
    anims.set(el, a);
  });
  const io = new IntersectionObserver(
    (entries) => {
      entries
        .filter((e) => e.isIntersecting)
        .forEach((e, i) => {
          io.unobserve(e.target);
          const a = anims.get(e.target)!;
          a.onfinish = () => a.cancel();
          window.setTimeout(() => a.play(), Math.min(i * 85, 510));
        });
    },
    { rootMargin: '0px 0px -8% 0px' },
  );
  items.forEach((el) => io.observe(el));
}

/* ---------- Section glows ---------- */
// Each .glow sits on its object: centred on it and a margin larger all round, so the light falls
// around the thing it belongs to. data-glow-span borrows the height of another element
// (the Cartium column of the comparison takes the table's height). data-glow-follow moves the
// light to the last element that matches it (the number of the launch step reached so far). Kept in step with
// the layout.
function glows() {
  $$('[data-glow-for]').forEach((glow) => {
    const host = glow.parentElement!;
    const first = $(glow.dataset.glowFor!, host);
    if (!first) return;
    const follow = glow.dataset.glowFollow;
    let target = first;
    const span = glow.dataset.glowSpan ? $(glow.dataset.glowSpan, host) : null;
    // Layout boxes, not screen boxes: some hosts are mid-way through a scroll scale (data-rise).
    const box = (el: HTMLElement) => {
      let x = 0;
      let y = 0;
      for (let e: HTMLElement | null = el; e && e !== host; e = e.offsetParent as HTMLElement | null) {
        x += e.offsetLeft;
        y += e.offsetTop;
      }
      return { x, y, w: el.offsetWidth, h: el.offsetHeight };
    };
    const place = () => {
      if (follow) target = $$(follow, host).pop() ?? first;
      const t = box(target);
      const v = span ? box(span) : t;
      if (!t.w || !v.h) return;
      // A margin of light around the object: generous for a phone, held in for a wide row.
      const w = t.w + Math.min(t.w * 0.7, 420) + 80;
      const h = Math.max(v.h * 1.3 + 120, Math.min(w * 0.55, 560));
      glow.style.setProperty('--g-x', `${t.x + t.w / 2}px`);
      glow.style.setProperty('--g-y', `${v.y + v.h / 2}px`);
      glow.style.setProperty('--g-w', `${w}px`);
      glow.style.setProperty('--g-h', `${h}px`);
      // The first placement lands at once; only later moves glide (.is-placed).
      if (!glow.classList.contains('is-placed')) requestAnimationFrame(() => glow.classList.add('is-placed'));
    };
    const ro = new ResizeObserver(place);
    ro.observe(host);
    ro.observe(target);
    if (follow) new MutationObserver(place).observe(host, { subtree: true, attributeFilter: ['class'] });
    // Sections far down the page may not be laid out yet; measure again as they come near.
    new IntersectionObserver((entries) => entries.some((e) => e.isIntersecting) && place(), { rootMargin: '50% 0px' }).observe(host);
    place();
  });
}

/* ---------- Boot ---------- */
// The hero intro is pure CSS. The interactive blocks are wired once the browser is idle, which
// keeps the first render and input free of their measurement work.
const idle = (fn: () => void) => {
  if (typeof window.requestIdleCallback === 'function') window.requestIdleCallback(fn, { timeout: 700 });
  else setTimeout(fn, 200);
};

heroMotion();
glows();
magnetic();
spotlight();
auras();
window.setTimeout(startNotifCycle, 2200);

// Entrances are wired straight away rather than on idle: whatever is on screen at load is hidden
// before it is painted and then comes in, instead of flashing up and vanishing first.
storyReveal(storyShop);
compare();
headlines();
reveals();
fillText();
factCount();
drawTicks();
autoReveal();

idle(() => {
  initDemo();
  stickyCta();
  growth();
  pricing();
  const mm = gsap.matchMedia();
  launch(mm);
  showcase();
  stages();
  initPointer();
  ScrollTrigger.refresh();
  document.fonts?.ready.then(() => ScrollTrigger.refresh());
  if (location.hash.length > 1) window.setTimeout(() => scrollToHash(location.hash), 300);
});
