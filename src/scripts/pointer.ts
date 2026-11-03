// What the mouse adds to the page: hovering a launch step lights the way up to it. Only for a real
// mouse and only when motion is welcome; touch screens and reduced motion get the page as it is.

const $ = <T extends Element = HTMLElement>(sel: string, scope: ParentNode = document) =>
  scope.querySelector<T>(sel);
const $$ = <T extends Element = HTMLElement>(sel: string, scope: ParentNode = document) =>
  Array.from(scope.querySelectorAll<T>(sel));
const clamp = (v: number, lo = -1, hi = 1) => Math.min(hi, Math.max(lo, v));

/* ---------- Launch steps ---------- */
function launchPeek() {
  const wrap = $('.steps-wrap');
  const line = $('.steps-line', wrap ?? document);
  const peek = $('[data-steps-peek]');
  if (!wrap || !line || !peek) return;
  const steps = $$('[data-step]', wrap);
  steps.forEach((step, i) => {
    step.addEventListener('pointerenter', () => {
      const l = line.getBoundingClientRect();
      const c = $('.step-num', step)!.getBoundingClientRect();
      const across = l.width >= l.height;
      const at = across ? (c.left + c.width / 2 - l.left) / l.width : (c.top + c.height / 2 - l.top) / l.height;
      peek.style.setProperty('--peek', clamp(at, 0, 1).toFixed(3));
      peek.dataset.axis = across ? 'x' : 'y';
      wrap.classList.add('is-peeking');
      steps.forEach((s, k) => s.classList.toggle('is-peek', k <= i));
    });
  });
  wrap.addEventListener('pointerleave', () => {
    wrap.classList.remove('is-peeking');
    steps.forEach((s) => s.classList.remove('is-peek'));
  });
}

export function initPointer() {
  const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!fine || still) return;
  launchPeek();
}
