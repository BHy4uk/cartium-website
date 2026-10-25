import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
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
  lenis = new Lenis({ lerp: 0.11, wheelMultiplier: 1 });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((t) => lenis?.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
}

function scrollToHash(hash: string) {
  const target = hash === '#top' ? document.body : $(hash);
  if (!target) return;
  if (lenis) lenis.scrollTo(target as HTMLElement, { offset: hash === '#top' ? 0 : -24, duration: 1.2 });
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

if (navWrap) {
  ScrollTrigger.create({
    start: 0,
    end: 'max',
    onUpdate(self) {
      const hide = self.direction === 1 && self.scroll() > 480 && !menuOpen;
      navWrap.classList.toggle('is-hidden', hide);
    },
  });
}

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
      .to(cur, { autoAlpha: 0, y: -10, duration: 0.35, ease: 'power2.in' })
      .set(cur, { y: 0 })
      .fromTo(next, { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0, duration: 0.6, ease: EASE })
      .fromTo(notif, { scale: 0.97 }, { scale: 1, duration: 0.6, ease: 'back.out(2)' }, '<');
    cur.classList.remove('is-active');
    next.classList.add('is-active');
  }, 4200);
}

function heroTilt() {
  const stage = $('[data-hero-stage]');
  const tilt = $('[data-tilt]');
  const notif = $('[data-notif]');
  if (!stage || !tilt || reduceMotion || !finePointer) return;
  const rx = gsap.quickTo(tilt, 'rotationX', { duration: 0.9, ease: 'power3.out' });
  const ry = gsap.quickTo(tilt, 'rotationY', { duration: 0.9, ease: 'power3.out' });
  const nx = notif ? gsap.quickTo(notif, 'x', { duration: 1.1, ease: 'power3.out' }) : null;
  const ny = notif ? gsap.quickTo(notif, 'y', { duration: 1.1, ease: 'power3.out' }) : null;
  const hero = stage.closest<HTMLElement>('section') ?? stage;
  hero.addEventListener('pointermove', (e) => {
    // Light: a soft spotlight under the pointer and the chrome band of the headline.
    const hr = hero.getBoundingClientRect();
    const fx = (e.clientX - hr.left) / hr.width;
    const fy = (e.clientY - hr.top) / hr.height;
    hero.style.setProperty('--hx', `${(fx * 100).toFixed(1)}%`);
    hero.style.setProperty('--hy', `${(fy * 100).toFixed(1)}%`);
    hero.style.setProperty('--shine', `${(12 + fy * 52).toFixed(1)}%`);
    const r = stage.getBoundingClientRect();
    const px = (e.clientX - (r.left + r.width / 2)) / r.width;
    const py = (e.clientY - (r.top + r.height / 2)) / r.height;
    ry(gsap.utils.clamp(-1, 1, px) * 10);
    rx(gsap.utils.clamp(-1, 1, py) * -7);
    nx?.(px * 18);
    ny?.(py * 12);
  });
  hero.addEventListener('pointerleave', () => {
    rx(0);
    ry(0);
    nx?.(0);
    ny?.(0);
  });

  // The phones drift apart a little as the hero scrolls away.
  gsap.to('.hero-slot--left', { xPercent: -10, ease: 'none', scrollTrigger: { trigger: stage, start: 'top top', end: 'bottom top', scrub: true } });
  gsap.to('.hero-slot--right', { xPercent: 10, ease: 'none', scrollTrigger: { trigger: stage, start: 'top top', end: 'bottom top', scrub: true } });
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
function minutes(t: string) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}
function duration(mins: number) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h ? `${h} год ${m} хв` : `${m} хв`;
}

function story(mm: gsap.MatchMedia) {
  const section = $('[data-story]');
  if (!section) return;
  const pin = $('[data-story-pin]', section)!;
  const stateA = $('[data-story-a]', section)!;
  const stateB = $('[data-story-b]', section)!;
  const chat = $('[data-chat]', section)!;
  const list = $('[data-chat-list]', section)!;
  const msgs = $$('[data-msg]', section);
  const order = $('[data-order]', section)!;
  const countMsgs = $('[data-count-msgs]', section)!;
  const countTime = $('[data-count-time]', section)!;
  const ttnBtn = $('[data-ttn-btn]', section)!;
  const ttnLabel = $('[data-ttn-label]', section)!;
  const ttnStep = $('[data-ttn-step]', section)!;
  const times = msgs.map((m) => minutes(m.querySelector('time')?.textContent ?? '0:00'));

  const setCounters = (n: number) => {
    countMsgs.textContent = String(n);
    countTime.textContent = duration(n > 0 ? times[n - 1] - times[0] : 0);
  };
  const setTtn = (done: boolean) => {
    ttnBtn.classList.toggle('is-done', done);
    ttnLabel.textContent = done ? 'ТТН 20451386942763' : 'Створити ТТН';
    ttnStep.classList.toggle('is-done', done);
  };

  mm.add('(min-width: 961px) and (min-height: 640px) and (prefers-reduced-motion: no-preference)', () => {
    root.classList.add('story-animated');
    const windowEl = list.parentElement!;
    const shiftFor = (i: number) => {
      const last = msgs[i];
      const bottom = last.offsetTop + last.offsetHeight;
      return -Math.max(0, bottom - (windowEl.clientHeight - 32));
    };

    // The first question is already on screen when the section pins.
    gsap.set(msgs.slice(1), { autoAlpha: 0, y: 14, scale: 0.96 });
    msgs.forEach((m) => gsap.set(m, { transformOrigin: m.classList.contains('msg--me') ? '100% 100%' : '0% 100%' }));
    gsap.set(stateB, { autoAlpha: 0, y: 40 });
    gsap.set(order, { autoAlpha: 0, y: 60, scale: 0.92 });
    setCounters(1);
    setTtn(false);

    const step = 0.6;
    const counter = { n: 1 };
    const tl = gsap.timeline({
      defaults: { ease: 'power2.out' },
      scrollTrigger: {
        trigger: pin,
        start: 'top top',
        end: () => `+=${window.innerHeight * 3.2}`,
        pin: true,
        scrub: 0.6,
        invalidateOnRefresh: true,
        anticipatePin: 1,
      },
    });

    msgs.slice(1).forEach((m, k) => {
      const i = k + 1;
      tl.to(m, { autoAlpha: 1, y: 0, scale: 1, duration: 0.45 }, (i - 1) * step);
      tl.to(list, { y: () => shiftFor(i), duration: 0.45 }, (i - 1) * step);
    });
    tl.to(
      counter,
      {
        n: msgs.length,
        duration: (msgs.length - 2) * step + 0.45,
        ease: 'none',
        onUpdate: () => setCounters(Math.round(counter.n)),
      },
      0,
    );

    const end = (msgs.length - 1) * step + 0.6;
    tl.to(chat, { autoAlpha: 0, y: -40, scale: 0.9, duration: 0.8, ease: 'power2.in' }, end)
      .to(stateA, { autoAlpha: 0, y: -40, duration: 0.7, ease: 'power2.in' }, end)
      .to(order, { autoAlpha: 1, y: 0, scale: 1, duration: 0.9, ease: 'back.out(1.4)' }, end + 0.6)
      .to(stateB, { autoAlpha: 1, y: 0, duration: 0.9, ease: EASE }, end + 0.7);

    const ttn = { done: 0 };
    tl.to(ttn, { done: 1, duration: 0.6, onUpdate: () => setTtn(ttn.done > 0.5) }, end + 2);
    tl.to({}, { duration: 0.8 });

    return () => {
      root.classList.remove('story-animated');
      setCounters(msgs.length);
      setTtn(false);
    };
  });

  // Smaller screens: no pin, the chat plays as it scrolls into view.
  mm.add('(max-width: 960px), (max-height: 639px)', () => {
    if (reduceMotion) return;
    gsap.set(msgs, { autoAlpha: 0, y: 12 });
    const tl = gsap.timeline({ scrollTrigger: { trigger: chat, start: 'top 75%', once: true } });
    tl.to(msgs, { autoAlpha: 1, y: 0, duration: 0.5, stagger: 0.12, ease: EASE });
    gsap.from(order, { autoAlpha: 0, y: 50, scale: 0.94, duration: 1, ease: EASE, scrollTrigger: { trigger: order, start: 'top 85%', once: true } });
    ScrollTrigger.create({ trigger: order, start: 'top 45%', once: true, onEnter: () => setTtn(true) });
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

/* ---------- Gallery ---------- */
function gallery(mm: gsap.MatchMedia) {
  const section = $('[data-gallery]');
  if (!section) return;
  const pin = $('[data-gallery-pin]', section)!;
  const viewport = $('[data-gallery-viewport]', section)!;
  const track = $('[data-gallery-track]', section)!;
  const bar = $('[data-gallery-bar]', section)!;

  mm.add('(min-width: 1025px) and (min-height: 700px) and (prefers-reduced-motion: no-preference)', () => {
    root.classList.add('gallery-animated');
    const distance = () => Math.max(0, track.scrollWidth - window.innerWidth);
    const tween = gsap.to(track, {
      x: () => -distance(),
      ease: 'none',
      scrollTrigger: {
        trigger: pin,
        start: 'top top',
        end: () => `+=${distance() * 0.8}`,
        pin: true,
        scrub: 0.8,
        invalidateOnRefresh: true,
        anticipatePin: 1,
        onUpdate: (self) => gsap.set(bar, { scaleX: 0.1 + self.progress * 0.9 }),
      },
    });
    // Each phone leans in as it crosses the centre of the screen.
    $$('.gcard-phone', track).forEach((p) => {
      gsap.fromTo(
        p,
        { y: 36 },
        {
          y: -12,
          ease: 'none',
          scrollTrigger: { trigger: p, containerAnimation: tween, start: 'left right', end: 'right left', scrub: true },
        },
      );
    });
    return () => root.classList.remove('gallery-animated');
  });

  mm.add('(max-width: 1024px), (max-height: 699px), (prefers-reduced-motion: reduce)', () => {
    let raf = 0;
    const update = () => {
      raf = 0;
      const max = viewport.scrollWidth - viewport.clientWidth;
      const p = max > 0 ? viewport.scrollLeft / max : 0;
      bar.style.transform = `scaleX(${0.1 + p * 0.9})`;
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    viewport.addEventListener('scroll', onScroll, { passive: true });
    update();
    return () => viewport.removeEventListener('scroll', onScroll);
  });
}

/* ---------- Growth demos ---------- */
function growth() {
  const stage = $('[data-ai-stage]');
  $$<HTMLInputElement>('[data-ai-swatch]').forEach((input) => {
    input.addEventListener('change', () => {
      if (!stage || !input.checked) return;
      stage.style.setProperty('--ai-bg', input.value);
      stage.classList.toggle('is-dark', input.value === '#2b2b2b');
      if (!reduceMotion) gsap.fromTo('.ai-product', { scale: 0.94 }, { scale: 1, duration: 0.7, ease: 'back.out(2)' });
    });
  });

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
  const groups = ['.bento .tile', '.ways-grid .way', '.plans .plan', '.faq-list .qa', '.rails-list .rail'];
  groups.forEach((sel) => {
    const items = $$(sel);
    if (!items.length) return;
    gsap.set(items, { autoAlpha: 0, y: 36 });
    ScrollTrigger.batch(items, {
      start: 'top 88%',
      once: true,
      onEnter: (batch) => gsap.to(batch, { autoAlpha: 1, y: 0, duration: 1, stagger: 0.08, ease: EASE, overwrite: true }),
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

heroTilt();
magnetic();
spotlight();
window.setTimeout(startNotifCycle, 2200);

idle(() => {
  initDemo();
  stickyCta();
  growth();
  pricing();
  const mm = gsap.matchMedia();
  story(mm);
  launch(mm);
  gallery(mm);
  reveals();
  ScrollTrigger.refresh();
  document.fonts?.ready.then(() => ScrollTrigger.refresh());
  if (location.hash.length > 1) window.setTimeout(() => scrollToHash(location.hash), 300);
});
