import type { Slide } from './parse';
import { escapeHtml } from './parse';

export interface Template {
  id: string;
  label: string;
  description: string;
  swatch: [string, string, string];
  render: (slides: Slide[], deckTitle: string) => string;
}

const COMMON_BASE = `
  *,*::before,*::after{box-sizing:border-box}
  html,body{margin:0;padding:0;height:100%;overflow:hidden}
  body{font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;-webkit-font-smoothing:antialiased}
  .deck{position:relative;width:100vw;height:100vh}
  .slide{position:absolute;inset:0;display:none;padding:7vmin;flex-direction:column;justify-content:center;animation:fadein .3s ease}
  .slide.active{display:flex}
  @keyframes fadein{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
  h1,h2,h3,h4{margin:0 0 .4em;line-height:1.1;letter-spacing:-.02em}
  p,li{margin:0 0 .6em;line-height:1.55}
  ul,ol{padding-left:1.2em;margin:0 0 .6em}
  code{padding:.1em .4em;border-radius:4px;font-family:'SF Mono',ui-monospace,Menlo,Consolas,monospace;font-size:.9em}
  pre{padding:1em 1.2em;border-radius:8px;overflow:auto;font-family:'SF Mono',ui-monospace,Menlo,Consolas,monospace;font-size:.85em;line-height:1.5}
  pre code{padding:0;background:none}
  a{color:inherit}
  blockquote{margin:0 0 .6em;padding-left:1em;border-left:3px solid currentColor;opacity:.85}
  .pager{position:fixed;bottom:2vmin;right:3vmin;font-size:1.4vmin;opacity:.5;font-variant-numeric:tabular-nums;letter-spacing:.1em}
  .nav{position:fixed;inset:0;display:flex;justify-content:space-between;pointer-events:none}
  .nav button{flex:1;background:none;border:0;cursor:pointer;pointer-events:auto;opacity:0;font-size:0}
  @media print{.pager,.nav{display:none}.slide{display:flex;page-break-after:always;position:relative;inset:auto;width:100vw;height:100vh}}
`;

const COMMON_JS = `
  const slides=document.querySelectorAll('.slide');let i=0;
  const show=n=>{i=Math.max(0,Math.min(slides.length-1,n));slides.forEach((s,k)=>s.classList.toggle('active',k===i));document.querySelector('.pager').textContent=(i+1)+' / '+slides.length;};
  document.addEventListener('keydown',e=>{if(['ArrowRight','PageDown',' '].includes(e.key))show(i+1);if(['ArrowLeft','PageUp'].includes(e.key))show(i-1);if(e.key==='Home')show(0);if(e.key==='End')show(slides.length-1);});
  document.querySelector('.prev').onclick=()=>show(i-1);document.querySelector('.next').onclick=()=>show(i+1);
  show(0);
`;

function buildDoc(title: string, css: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${escapeHtml(title)}</title>
<style>${COMMON_BASE}${css}</style>
</head>
<body>
<div class="deck">
${body}
</div>
<div class="nav"><button class="prev" aria-label="Previous"></button><button class="next" aria-label="Next"></button></div>
<div class="pager">1 / 1</div>
<script>${COMMON_JS}</script>
</body>
</html>`;
}

function renderSlides(slides: Slide[], titleClass = '') {
  return slides
    .map((s, k) => {
      const isCover = s.layout === 'cover';
      const cls = isCover ? 'slide cover' : 'slide';
      return `<section class="${cls}${k === 0 ? ' active' : ''}">
        <h${isCover ? 1 : 2} class="${titleClass}">${escapeHtml(s.title)}</h${isCover ? 1 : 2}>
        <div class="body">${s.bodyHtml}</div>
      </section>`;
    })
    .join('\n');
}

export const TEMPLATES: Template[] = [
  {
    id: 'minimalist',
    label: 'Minimalist',
    description: 'Quiet sans-serif on warm paper. The default. Reads at any size.',
    swatch: ['#fafaf7', '#191717', '#c46934'],
    render: (slides, title) =>
      buildDoc(
        title,
        `
          body{background:#fafaf7;color:#191717;font-family:'Inter',system-ui,sans-serif}
          .slide.cover{justify-content:flex-end;padding-bottom:14vmin}
          .slide.cover h1{font-size:7vmin;font-weight:700;max-width:80%}
          .slide h2{font-size:4.4vmin;font-weight:600;border-bottom:2px solid #c46934;padding-bottom:.3em;margin-bottom:.6em;display:inline-block}
          .body{font-size:2.4vmin;color:#3a3636;max-width:80%}
          code{background:#ece9e2}pre{background:#ece9e2;color:#191717}
          .pager{color:#c46934}
          a{color:#c46934;text-decoration:underline;text-decoration-thickness:1px;text-underline-offset:3px}
        `,
        renderSlides(slides)
      ),
  },
  {
    id: 'terminal',
    label: 'Terminal',
    description: 'Phosphor green on near-black. Mono everywhere. Built for hackers.',
    swatch: ['#0a0d0a', '#7ee787', '#3fb950'],
    render: (slides, title) =>
      buildDoc(
        title,
        `
          body{background:#0a0d0a;color:#7ee787;font-family:'SF Mono',ui-monospace,Menlo,Consolas,monospace}
          .slide{padding:6vmin 8vmin}
          .slide.cover h1{font-size:6.5vmin;font-weight:400;border-left:6px solid #3fb950;padding-left:.4em}
          .slide.cover h1::before{content:'$ ';color:#3fb950}
          .slide h2{font-size:3.8vmin;font-weight:400;color:#3fb950}
          .slide h2::before{content:'> ';color:#7ee787}
          .body{font-size:2.2vmin;line-height:1.6}
          code{background:rgba(126,231,135,.1);color:#7ee787}
          pre{background:rgba(126,231,135,.05);border:1px solid rgba(126,231,135,.15);color:#7ee787}
          .pager{color:#3fb950}.pager::before{content:'[ '}.pager::after{content:' ]'}
          li::marker{color:#3fb950}
        `,
        renderSlides(slides)
      ),
  },
  {
    id: 'magazine',
    label: 'Magazine',
    description: 'Serif headlines, big drop letters, editorial whitespace. Press-ready.',
    swatch: ['#fff', '#0d0d0d', '#b41e1e'],
    render: (slides, title) =>
      buildDoc(
        title,
        `
          body{background:#fff;color:#0d0d0d;font-family:Georgia,'Times New Roman',serif}
          .slide.cover{justify-content:center;align-items:center;text-align:center;padding:10vmin}
          .slide.cover h1{font-size:9vmin;font-weight:900;line-height:.95;letter-spacing:-.04em;max-width:14ch}
          .slide.cover::after{content:'';width:8vmin;height:4px;background:#b41e1e;margin-top:3vmin}
          .slide h2{font-size:5vmin;font-weight:900;letter-spacing:-.03em;color:#0d0d0d;border-top:3px solid #b41e1e;padding-top:.3em;margin-bottom:.8em}
          .body{font-size:2.4vmin;line-height:1.65;column-count:1;max-width:75ch}
          .body>p:first-child::first-letter{font-size:6em;float:left;line-height:.85;padding:.05em .12em .05em 0;color:#b41e1e;font-weight:900}
          code{background:#f0eeea;font-family:'SF Mono',ui-monospace,Menlo,monospace}
          pre{background:#f5f3ef;font-family:'SF Mono',ui-monospace,Menlo,monospace}
          .pager{font-family:Georgia,serif;font-style:italic;color:#b41e1e}
        `,
        renderSlides(slides)
      ),
  },
  {
    id: 'gradient',
    label: 'Gradient',
    description: 'Dreamy violet-orange wash. Bold sans display. Pitch-deck energy.',
    swatch: ['#1a0a2e', '#ff6b9d', '#ffc36b'],
    render: (slides, title) =>
      buildDoc(
        title,
        `
          body{background:linear-gradient(135deg,#1a0a2e 0%,#3d1b5e 40%,#7a2d6f 75%,#c64f5a 100%);color:#fff;font-family:'Inter',system-ui,sans-serif}
          .slide.cover{justify-content:center;text-align:center}
          .slide.cover h1{font-size:8vmin;font-weight:800;background:linear-gradient(90deg,#ffc36b,#ff6b9d);-webkit-background-clip:text;background-clip:text;color:transparent;max-width:18ch;margin:0 auto;line-height:1}
          .slide h2{font-size:4.6vmin;font-weight:800;background:linear-gradient(90deg,#ffc36b,#ff6b9d);-webkit-background-clip:text;background-clip:text;color:transparent;display:inline-block;padding-bottom:.2em}
          .body{font-size:2.3vmin;color:#f0e3f0;max-width:80ch}
          code{background:rgba(255,195,107,.15);color:#ffc36b}
          pre{background:rgba(0,0,0,.3);color:#ffc36b}
          .pager{color:#ffc36b}
          li::marker{color:#ff6b9d}
          a{color:#ffc36b}
        `,
        renderSlides(slides)
      ),
  },
  {
    id: 'paper',
    label: 'Paper',
    description: 'Architect graph paper grid. Light. Useful for diagrams.',
    swatch: ['#f3efe5', '#1b3a4b', '#7b9eaa'],
    render: (slides, title) =>
      buildDoc(
        title,
        `
          body{background:#f3efe5;color:#1b3a4b;font-family:'Inter',system-ui,sans-serif;background-image:linear-gradient(rgba(123,158,170,.18) 1px,transparent 1px),linear-gradient(90deg,rgba(123,158,170,.18) 1px,transparent 1px);background-size:32px 32px}
          .slide.cover h1{font-size:7vmin;font-weight:700;text-transform:uppercase;letter-spacing:-.02em;border:3px solid #1b3a4b;padding:.4em .6em;align-self:flex-start;background:#f3efe5}
          .slide h2{font-size:4.2vmin;font-weight:700;text-transform:uppercase;letter-spacing:.02em;background:#1b3a4b;color:#f3efe5;padding:.2em .5em;align-self:flex-start;margin-bottom:.8em}
          .body{font-size:2.4vmin;background:rgba(243,239,229,.85);padding:1em 1.2em;border-left:4px solid #7b9eaa;max-width:80ch}
          code{background:rgba(123,158,170,.2)}
          pre{background:rgba(27,58,75,.95);color:#f3efe5}pre code{color:#f3efe5}
          .pager{color:#1b3a4b;font-weight:700;background:#f3efe5;padding:.2em .6em;border:1px solid #1b3a4b}
        `,
        renderSlides(slides)
      ),
  },
  {
    id: 'council',
    label: 'Council Signal',
    description: 'Glassmorphic dark + ember accent. The household house style.',
    swatch: ['#0e0a14', '#e8a04a', '#9b7fb8'],
    render: (slides, title) =>
      buildDoc(
        title,
        `
          body{background:radial-gradient(ellipse at 20% 10%,rgba(232,160,74,.12),transparent 50%),radial-gradient(ellipse at 80% 90%,rgba(155,127,184,.12),transparent 55%),#0e0a14;color:#f0e6dc;font-family:system-ui,-apple-system,sans-serif}
          .slide{backdrop-filter:blur(8px)}
          .slide.cover{justify-content:center;text-align:center}
          .slide.cover h1{font-size:7.5vmin;font-weight:800;letter-spacing:-.02em;max-width:18ch;margin:0 auto;background:linear-gradient(180deg,#fff 0%,#e8a04a 100%);-webkit-background-clip:text;background-clip:text;color:transparent}
          .slide.cover::after{content:'';width:6vmin;height:2px;background:#e8a04a;margin:2vmin auto 0;border-radius:2px}
          .slide h2{font-size:4.4vmin;font-weight:700;color:#e8a04a;text-transform:uppercase;letter-spacing:.06em;font-size:3.2vmin;padding-bottom:.4em;border-bottom:1px solid rgba(232,160,74,.3)}
          .body{font-size:2.3vmin;color:#d8cec4;max-width:85ch;line-height:1.65}
          code{background:rgba(232,160,74,.15);color:#ffc88a;border:1px solid rgba(232,160,74,.2)}
          pre{background:rgba(0,0,0,.4);border:1px solid rgba(232,160,74,.15);color:#f0e6dc}
          .pager{color:#9b7fb8;letter-spacing:.2em}
          li::marker{color:#e8a04a}
          a{color:#e8a04a}
          blockquote{border-left-color:#9b7fb8;color:#d8cec4}
        `,
        renderSlides(slides)
      ),
  },
];

export const TEMPLATES_BY_ID = Object.fromEntries(TEMPLATES.map((t) => [t.id, t])) as Record<string, Template>;
