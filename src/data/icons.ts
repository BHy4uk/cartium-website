// Phosphor icons (MIT), inlined as raw SVG so they inherit currentColor.
const regular = import.meta.glob(
  '/node_modules/@phosphor-icons/core/assets/regular/{telegram-logo,paper-plane-tilt,truck,credit-card,chart-line-up,users-three,tag,megaphone,palette,sparkle,file-xls,file-csv,pause,shopping-bag,package,robot,qr-code,check,clock,bell-ringing,storefront,caret-down,plus,x,list,image,magic-wand,bank,link,hand-coins,seal-check,chat-circle-text,timer,gift,user-circle,ticket,devices,arrow-up-right,shield-check}.svg',
  { query: '?raw', import: 'default', eager: true },
) as Record<string, string>;

const fill = import.meta.glob(
  '/node_modules/@phosphor-icons/core/assets/fill/{t-shirt-fill,check-circle-fill,telegram-logo-fill,paper-plane-tilt-fill}.svg',
  { query: '?raw', import: 'default', eager: true },
) as Record<string, string>;

const byName: Record<string, string> = {};
for (const [path, svg] of Object.entries({ ...regular, ...fill })) {
  const name = path.split('/').pop()!.replace('.svg', '');
  byName[name] = svg;
}

export function iconSvg(name: string): string {
  const svg = byName[name];
  if (!svg) throw new Error(`Unknown icon: ${name}`);
  return svg.replace('<svg ', '<svg aria-hidden="true" focusable="false" ');
}
