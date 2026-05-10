import type { Slide } from './parse';
import { escapeHtml } from './parse';

export interface Template {
  id: string;
  label: string;
  description: string;
  category: 'Dark' | 'Light' | 'Specialty';
  swatch: [string, string, string];
  /** Google/Fontshare font link tags (full <link rel=…> markup, no surrounding script). */
  fontLinks: string;
  /** Body CSS (excluding the shared viewport-fitting base). */
  css: string;
  /** Optional extra decorative markup injected once per slide before the content. */
  slideDecor?: (i: number, total: number) => string;
  /** Optional title-class override for the .slide-title element. */
  titleClass?: string;
}

const VIEWPORT_BASE = `
  html,body{height:100%;margin:0;padding:0;overflow-x:hidden}
  body{-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility}
  *,*::before,*::after{box-sizing:border-box}
  :root{
    --title-size:clamp(1.5rem,5vw,4rem);
    --h2-size:clamp(1.25rem,3.5vw,2.5rem);
    --body-size:clamp(.85rem,1.6vw,1.15rem);
    --small-size:clamp(.7rem,1vw,.9rem);
    --slide-padding:clamp(1.5rem,5vw,5rem);
    --content-gap:clamp(.6rem,1.6vw,1.4rem);
  }
  .deck{position:relative;width:100vw;height:100vh;height:100dvh}
  .slide{position:absolute;inset:0;width:100vw;height:100vh;height:100dvh;overflow:hidden;display:none;flex-direction:column}
  .slide.active{display:flex}
  .slide-content{flex:1;display:flex;flex-direction:column;justify-content:center;max-height:100%;overflow:hidden;padding:var(--slide-padding);gap:var(--content-gap);position:relative;z-index:1}
  .slide-title{font-size:var(--title-size);line-height:1.05;margin:0;letter-spacing:-.02em}
  .slide.content .slide-title{font-size:var(--h2-size)}
  .slide-body{font-size:var(--body-size);line-height:1.55;max-width:80ch}
  .slide-body>*{margin:0 0 .55em}
  .slide-body>*:last-child{margin-bottom:0}
  .slide-body ul,.slide-body ol{padding-left:1.2em}
  .slide-body li{margin:0 0 .45em}
  .slide-body code{padding:.1em .4em;border-radius:4px;font-family:'JetBrains Mono',ui-monospace,Menlo,Consolas,monospace;font-size:.88em}
  .slide-body pre{padding:1em 1.2em;border-radius:8px;overflow:auto;font-family:'JetBrains Mono',ui-monospace,Menlo,Consolas,monospace;font-size:.82em;line-height:1.5;max-height:55vh}
  .slide-body pre code{padding:0;background:none}
  .slide-body table{border-collapse:collapse;font-size:calc(var(--body-size) * .92)}
  .slide-body th,.slide-body td{padding:.4em .8em;text-align:left;border-bottom:1px solid currentColor;border-bottom-color:rgba(127,127,127,.25)}
  .slide-body th{font-weight:700}
  .slide-body blockquote{margin:0 0 .55em;padding-left:1em;border-left:3px solid currentColor}
  .slide-body a{color:inherit}
  .pager{position:fixed;bottom:1.6vmin;right:2.4vmin;font-size:var(--small-size);opacity:.55;font-variant-numeric:tabular-nums;letter-spacing:.1em;z-index:10}
  .nav{position:fixed;inset:0;display:flex;justify-content:space-between;pointer-events:none;z-index:5}
  .nav button{flex:1;background:none;border:0;cursor:pointer;pointer-events:auto;opacity:0;font-size:0}
  @media (max-height:700px){:root{--slide-padding:clamp(1rem,4vw,3rem);--content-gap:clamp(.5rem,1.4vw,1rem);--title-size:clamp(1.25rem,4.5vw,2.6rem)}}
  @media (max-height:600px){:root{--slide-padding:clamp(.75rem,3vw,2rem);--title-size:clamp(1.1rem,4vw,2rem);--body-size:clamp(.75rem,1.3vw,.95rem)}.decor{display:none}}
  @media (max-height:500px){:root{--slide-padding:clamp(.5rem,2.5vw,1.5rem);--title-size:clamp(1rem,3.5vw,1.6rem)}}
  @media (prefers-reduced-motion:reduce){*,*::before,*::after{animation-duration:.01ms!important;transition-duration:.2s!important}}
  @media print{.pager,.nav{display:none}.slide{display:flex;page-break-after:always;position:relative;inset:auto}}
`;

const COMMON_JS = `
  const slides=document.querySelectorAll('.slide');let i=0;
  const pager=document.querySelector('.pager');
  const show=n=>{i=Math.max(0,Math.min(slides.length-1,n));slides.forEach((s,k)=>s.classList.toggle('active',k===i));if(pager)pager.textContent=String(i+1).padStart(2,'0')+' / '+String(slides.length).padStart(2,'0');};
  document.addEventListener('keydown',e=>{if(['ArrowRight','PageDown',' '].includes(e.key)){e.preventDefault();show(i+1)}if(['ArrowLeft','PageUp'].includes(e.key)){e.preventDefault();show(i-1)}if(e.key==='Home')show(0);if(e.key==='End')show(slides.length-1);});
  document.querySelector('.prev').onclick=()=>show(i-1);document.querySelector('.next').onclick=()=>show(i+1);
  show(0);
`;

function googleFonts(...families: string[]): string {
  const param = families.map((f) => `family=${f.replace(/ /g, '+')}`).join('&');
  return `<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="https://fonts.googleapis.com/css2?${param}&display=swap">`;
}

const FONTSHARE_LINKS = `<link rel="stylesheet" href="https://api.fontshare.com/v2/css?f%5B%5D=clash-display@600,700&f%5B%5D=satoshi@400,500,700&display=swap">`;

const JBMONO_LINK = `<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&display=swap">`;

function buildDoc(template: Template, slides: Slide[], deckTitle: string): string {
  const decor = template.slideDecor ?? (() => '');
  const titleCls = template.titleClass ? `slide-title ${template.titleClass}` : 'slide-title';
  const body = slides
    .map((s, k) => {
      const isCover = s.layout === 'cover' || k === 0;
      const cls = `slide ${isCover ? 'cover' : 'content'}${k === 0 ? ' active' : ''}`;
      return `<section class="${cls}" data-i="${k + 1}">
${decor(k, slides.length)}
<div class="slide-content">
<h${isCover ? 1 : 2} class="${titleCls}">${escapeHtml(s.title)}</h${isCover ? 1 : 2}>
<div class="slide-body">${s.bodyHtml}</div>
</div>
</section>`;
    })
    .join('\n');

  return `<!DOCTYPE html>
<html lang="en" data-template="${template.id}">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"/>
<title>${escapeHtml(deckTitle)}</title>
${template.fontLinks}
<style>${VIEWPORT_BASE}${template.css}</style>
</head>
<body>
<div class="deck">
${body}
</div>
<div class="nav"><button class="prev" aria-label="Previous"></button><button class="next" aria-label="Next"></button></div>
<div class="pager">01 / ${String(slides.length).padStart(2, '0')}</div>
<script>${COMMON_JS}</script>
</body>
</html>`;
}

// --- TEMPLATE DEFINITIONS ---

const T_BOLD_SIGNAL: Template = {
  id: 'bold-signal',
  label: 'Bold Signal',
  description: 'Confident dark gradient with a bright coral card as the focal point.',
  category: 'Dark',
  swatch: ['#1a1a1a', '#ff5722', '#ffffff'],
  fontLinks: googleFonts('Archivo Black:wght@400', 'Space Grotesk:wght@400;500;700'),
  css: `
    body{background:linear-gradient(135deg,#1a1a1a 0%,#2d2d2d 50%,#1a1a1a 100%);color:#fff;font-family:'Space Grotesk',system-ui,sans-serif}
    .slide-content{justify-content:flex-end;padding:clamp(2rem,6vw,5rem)}
    .slide-title{font-family:'Archivo Black',sans-serif;color:#1a1a1a;background:#ff5722;padding:clamp(1.2rem,3vw,2.4rem) clamp(1.4rem,3.5vw,3rem);align-self:flex-start;max-width:min(85ch,90%);line-height:.95;text-transform:uppercase;letter-spacing:-.01em}
    .slide.cover .slide-title{font-size:clamp(2rem,7vw,5.5rem)}
    .slide.content .slide-title{font-size:clamp(1.4rem,4.5vw,3.2rem)}
    .slide-body{color:#e6e6e6;margin-top:clamp(.8rem,2vw,1.6rem);max-width:min(70ch,90%);font-weight:400}
    .decor-num{position:absolute;top:clamp(1rem,3vw,2.5rem);left:clamp(1rem,3vw,2.5rem);font-family:'Archivo Black';font-size:clamp(1.2rem,2.4vw,2rem);color:#ff5722;letter-spacing:.1em;z-index:2}
    .decor-crumb{position:absolute;top:clamp(1rem,3vw,2.5rem);right:clamp(1rem,3vw,2.5rem);display:flex;gap:.5em;z-index:2;font-size:var(--small-size);text-transform:uppercase;letter-spacing:.15em;font-family:'Space Grotesk'}
    .decor-crumb span{opacity:.35}
    .decor-crumb span.on{opacity:1;color:#ff5722}
    code{background:#2d2d2d}pre{background:#0d0d0d}
    .pager{color:#ff5722}
    a{color:#ff5722}
  `,
  slideDecor: (i, n) => {
    const crumbs = Array.from({ length: Math.min(n, 5) })
      .map((_, k) => `<span class="${k === i % 5 ? 'on' : ''}">${String(k + 1).padStart(2, '0')}</span>`)
      .join('');
    return `<div class="decor decor-num">${String(i + 1).padStart(2, '0')}</div><div class="decor decor-crumb">${crumbs}</div>`;
  },
};

const T_ELECTRIC: Template = {
  id: 'electric-studio',
  label: 'Electric Studio',
  description: 'Two-panel vertical split. White headline above, electric blue body below.',
  category: 'Dark',
  swatch: ['#ffffff', '#4361ee', '#0a0a0a'],
  fontLinks: googleFonts('Manrope:wght@400;500;800'),
  css: `
    body{background:#0a0a0a;color:#0a0a0a;font-family:'Manrope',system-ui,sans-serif;font-weight:500}
    .slide{display:none;flex-direction:column}
    .slide.active{display:grid;grid-template-rows:55% 45%}
    .slide-content{padding:0;justify-content:flex-end}
    .slide-title{background:#fff;padding:clamp(1.5rem,4.5vw,4rem);font-weight:800;color:#0a0a0a;line-height:1;letter-spacing:-.03em;font-size:clamp(1.6rem,5.4vw,4.6rem);margin:0;display:flex;align-items:flex-end}
    .slide-body{background:#4361ee;color:#fff;padding:clamp(1.5rem,4.5vw,4rem);font-size:clamp(.95rem,1.8vw,1.25rem);margin:0;max-width:none;display:flex;flex-direction:column;justify-content:center;border-top:6px solid #fff;overflow:auto;font-weight:500}
    .slide-body code{background:rgba(255,255,255,.15);color:#fff}
    .slide-body pre{background:rgba(0,0,0,.3)}
    .slide-body a{color:#fff;font-weight:700}
    .decor-mark{position:absolute;font-family:'Manrope';font-weight:800;font-size:var(--small-size);letter-spacing:.2em;text-transform:uppercase;z-index:3}
    .decor-mark.tl{top:clamp(1rem,2vw,2rem);left:clamp(1rem,2.5vw,2rem);color:#0a0a0a}
    .decor-mark.br{bottom:clamp(1rem,2vw,2rem);right:clamp(1rem,2.5vw,2rem);color:#fff}
    .pager{color:#fff;font-weight:700}
  `,
  slideDecor: () => `<div class="decor decor-mark tl">Electric Studio</div><div class="decor decor-mark br">// no.${''}${' '}</div>`,
};

const T_VOLTAGE: Template = {
  id: 'creative-voltage',
  label: 'Creative Voltage',
  description: 'Electric blue + neon yellow. Retro-modern with halftone texture.',
  category: 'Dark',
  swatch: ['#0066ff', '#d4ff00', '#1a1a2e'],
  fontLinks: googleFonts('Syne:wght@700;800', 'Space Mono:wght@400;700'),
  css: `
    body{background:#0066ff;color:#fff;font-family:'Space Mono',ui-monospace,monospace;background-image:radial-gradient(circle at 1px 1px,rgba(255,255,255,.08) 1px,transparent 0);background-size:14px 14px}
    .slide-content{padding:clamp(2rem,5vw,4rem)}
    .slide-title{font-family:'Syne',sans-serif;font-weight:800;color:#fff;line-height:.95;letter-spacing:-.02em}
    .slide.cover .slide-title{font-size:clamp(2.2rem,7.5vw,6rem)}
    .slide.content .slide-title{font-size:clamp(1.5rem,4.8vw,3.4rem)}
    .slide.content .slide-title::after{content:'';display:block;width:clamp(2.5rem,5vw,4rem);height:8px;background:#d4ff00;margin-top:clamp(.6rem,1.4vw,1rem)}
    .slide-body{color:#fff;font-size:clamp(.9rem,1.6vw,1.15rem);max-width:min(70ch,90%)}
    .slide-body strong,.slide-body b{background:#d4ff00;color:#1a1a2e;padding:.1em .4em;font-weight:700}
    .slide-body code{background:#1a1a2e;color:#d4ff00}
    .slide-body pre{background:#0a0a1c;color:#d4ff00}
    .slide-body a{color:#d4ff00;text-decoration:underline}
    .decor-badge{position:absolute;top:clamp(1.2rem,3vw,2.5rem);right:clamp(1.2rem,3vw,2.5rem);background:#d4ff00;color:#1a1a2e;font-family:'Syne';font-weight:800;font-size:clamp(.7rem,1.2vw,1rem);padding:.5em 1em;transform:rotate(2deg);letter-spacing:.05em;z-index:2}
    .pager{color:#d4ff00}
    li::marker{color:#d4ff00}
  `,
  slideDecor: (i, n) => `<div class="decor decor-badge">⚡ ${String(i + 1).padStart(2, '0')}/${String(n).padStart(2, '0')}</div>`,
};

const T_BOTANICAL: Template = {
  id: 'dark-botanical',
  label: 'Dark Botanical',
  description: 'Elegant Cormorant serif on near-black with blurred warm gradient orbs.',
  category: 'Dark',
  swatch: ['#0f0f0f', '#d4a574', '#e8b4b8'],
  fontLinks: googleFonts('Cormorant:wght@400;600;700', 'IBM Plex Sans:wght@300;400'),
  css: `
    body{background:#0f0f0f;color:#e8e4df;font-family:'IBM Plex Sans',system-ui,sans-serif;font-weight:300}
    .slide-content{justify-content:center;padding:clamp(2rem,7vw,7rem)}
    .slide-title{font-family:'Cormorant',serif;font-weight:600;color:#e8e4df;line-height:1.05;letter-spacing:-.01em;font-style:italic}
    .slide.cover .slide-title{font-size:clamp(2.4rem,8vw,6rem)}
    .slide.content .slide-title{font-size:clamp(1.6rem,5vw,3.6rem)}
    .slide.content .slide-title::before{content:'';display:inline-block;width:clamp(1.6rem,3vw,2.4rem);height:1px;background:#d4a574;vertical-align:middle;margin-right:.6em}
    .slide-body{color:#9a9590;font-size:clamp(.9rem,1.6vw,1.15rem);max-width:min(65ch,85%);font-weight:300}
    .slide-body strong{color:#d4a574;font-weight:400}
    .slide-body em{color:#e8b4b8}
    .slide-body code{background:rgba(212,165,116,.12);color:#d4a574}
    .slide-body pre{background:rgba(212,165,116,.05);border:1px solid rgba(212,165,116,.15);color:#e8e4df}
    .slide-body blockquote{border-left-color:#d4a574;color:#e8e4df;font-family:'Cormorant';font-style:italic;font-size:1.15em}
    .orb{position:absolute;border-radius:50%;filter:blur(80px);opacity:.55;z-index:0}
    .orb1{width:42vmin;height:42vmin;background:#e8b4b8;top:-12vmin;right:-12vmin}
    .orb2{width:36vmin;height:36vmin;background:#d4a574;bottom:-10vmin;left:-8vmin;opacity:.4}
    .orb3{width:24vmin;height:24vmin;background:#c9b896;top:35%;right:25%;opacity:.25}
    .accent-line{position:absolute;left:clamp(1.5rem,3vw,3rem);top:18%;bottom:18%;width:1px;background:linear-gradient(180deg,transparent,#d4a574,transparent);z-index:0}
    .pager{color:#d4a574;font-family:'Cormorant';font-style:italic;font-size:clamp(.8rem,1.2vw,1rem);letter-spacing:.3em}
    li::marker{color:#d4a574}
    a{color:#e8b4b8}
  `,
  slideDecor: () => `<div class="decor orb orb1"></div><div class="decor orb orb2"></div><div class="decor orb orb3"></div><div class="decor accent-line"></div>`,
};

const T_NOTEBOOK: Template = {
  id: 'notebook-tabs',
  label: 'Notebook Tabs',
  description: 'Cream paper card on dark, with colorful section tabs on the right edge.',
  category: 'Light',
  swatch: ['#f8f6f1', '#98d4bb', '#f4b8c5'],
  fontLinks: googleFonts('Bodoni Moda:wght@400;700', 'DM Sans:wght@400;500'),
  css: `
    body{background:#2d2d2d;color:#1a1a1a;font-family:'DM Sans',system-ui,sans-serif}
    .slide{padding:clamp(1.5rem,4vw,3.5rem)}
    .slide-content{background:#f8f6f1;padding:clamp(2rem,5vw,4.5rem) clamp(2rem,5vw,4.5rem) clamp(2rem,5vw,4.5rem) clamp(3rem,6vw,5.5rem);border-radius:6px;box-shadow:0 30px 80px -20px rgba(0,0,0,.6),0 8px 24px -8px rgba(0,0,0,.4);position:relative;height:100%}
    .slide-title{font-family:'Bodoni Moda',serif;font-weight:700;color:#1a1a1a;line-height:1.05;letter-spacing:-.02em}
    .slide.cover .slide-title{font-size:clamp(2.2rem,7vw,5.4rem)}
    .slide.content .slide-title{font-size:clamp(1.6rem,4.5vw,3.4rem);border-bottom:2px solid #1a1a1a;padding-bottom:.3em;margin-bottom:.4em}
    .slide-body{color:#3a3636;font-size:clamp(.9rem,1.6vw,1.1rem)}
    .slide-body code{background:#ece9e2;color:#1a1a1a}
    .slide-body pre{background:#ece9e2;color:#1a1a1a}
    .holes{position:absolute;left:clamp(1.5rem,2.5vw,2rem);top:0;bottom:0;width:clamp(.8rem,1.4vw,1.2rem);display:flex;flex-direction:column;justify-content:space-around;padding:8% 0;z-index:2}
    .holes span{width:100%;aspect-ratio:1;background:#2d2d2d;border-radius:50%;border:1px solid rgba(255,255,255,.05)}
    .tabs{position:absolute;right:clamp(1rem,2.5vw,2rem);top:0;bottom:0;display:flex;flex-direction:column;justify-content:center;gap:clamp(.4rem,1vw,.8rem);z-index:3}
    .tabs span{padding:clamp(.6rem,1.4vw,1.1rem) clamp(.4rem,.9vw,.7rem);writing-mode:vertical-rl;text-orientation:mixed;font-family:'Bodoni Moda',serif;font-weight:700;font-size:clamp(.5rem,1vh,.7rem);letter-spacing:.2em;text-transform:uppercase;border-radius:0 6px 6px 0;color:#1a1a1a;opacity:.6;transition:opacity .2s}
    .tabs span.on{opacity:1;transform:translateX(8px)}
    .tab-1{background:#98d4bb}.tab-2{background:#c7b8ea}.tab-3{background:#f4b8c5}.tab-4{background:#a8d8ea}.tab-5{background:#ffe6a7}
    .pager{color:#f8f6f1;background:rgba(0,0,0,.4);padding:.2em .8em;border-radius:3px;font-family:'Bodoni Moda',serif;font-style:italic}
    a{color:#1a1a1a;border-bottom:1px solid #1a1a1a}
  `,
  slideDecor: (i) => `
    <div class="decor holes"><span></span><span></span><span></span><span></span><span></span></div>
    <div class="decor tabs">
      <span class="tab-1${i % 5 === 0 ? ' on' : ''}">Intro</span>
      <span class="tab-2${i % 5 === 1 ? ' on' : ''}">Setup</span>
      <span class="tab-3${i % 5 === 2 ? ' on' : ''}">Core</span>
      <span class="tab-4${i % 5 === 3 ? ' on' : ''}">Deep</span>
      <span class="tab-5${i % 5 === 4 ? ' on' : ''}">Close</span>
    </div>`,
};

const T_PASTEL: Template = {
  id: 'pastel-geometry',
  label: 'Pastel Geometry',
  description: 'Soft blue background, white rounded card, vertical pills of varying heights on the right.',
  category: 'Light',
  swatch: ['#c8d9e6', '#f0b4d4', '#9b8dc4'],
  fontLinks: googleFonts('Plus Jakarta Sans:wght@400;500;700;800'),
  css: `
    body{background:#c8d9e6;color:#16141e;font-family:'Plus Jakarta Sans',system-ui,sans-serif}
    .slide{padding:clamp(1.5rem,4vw,3.5rem)}
    .slide-content{background:#faf9f7;border-radius:clamp(16px,2vw,28px);box-shadow:0 24px 60px -20px rgba(91,113,150,.45);padding:clamp(2rem,5vw,4.5rem);padding-right:clamp(4rem,9vw,8rem);position:relative;height:100%}
    .slide-title{font-weight:800;line-height:1.05;letter-spacing:-.025em;color:#16141e}
    .slide.cover .slide-title{font-size:clamp(2rem,6.5vw,5rem)}
    .slide.content .slide-title{font-size:clamp(1.5rem,4.4vw,3.2rem)}
    .slide-body{color:#3a3645;font-size:clamp(.9rem,1.6vw,1.1rem)}
    .slide-body code{background:#ece8ff;color:#7c6aad}
    .slide-body pre{background:#1a1726;color:#fff}
    .pills{position:absolute;right:clamp(1.2rem,2.5vw,2.5rem);top:0;bottom:0;display:flex;flex-direction:column;justify-content:center;gap:clamp(.4rem,1vw,.8rem);z-index:2}
    .pills span{width:clamp(8px,1.2vw,14px);border-radius:999px;display:block}
    .pill-1{height:clamp(2rem,5vh,4rem);background:#f0b4d4}
    .pill-2{height:clamp(3.5rem,9vh,7rem);background:#a8d4c4}
    .pill-3{height:clamp(5rem,13vh,10rem);background:#5a7c6a}
    .pill-4{height:clamp(3.5rem,9vh,7rem);background:#9b8dc4}
    .pill-5{height:clamp(2rem,5vh,4rem);background:#7c6aad}
    .icon{position:absolute;top:clamp(1.4rem,3vw,2.4rem);right:clamp(4rem,9vw,8rem);width:clamp(1.8rem,3vw,2.6rem);height:clamp(1.8rem,3vw,2.6rem);border:2px solid #5a7c6a;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#5a7c6a;font-weight:800;z-index:2}
    .pager{color:#5a7c6a;font-weight:700}
    a{color:#7c6aad}
    li::marker{color:#9b8dc4}
  `,
  slideDecor: () => `
    <div class="decor pills">
      <span class="pill-1"></span><span class="pill-2"></span><span class="pill-3"></span><span class="pill-4"></span><span class="pill-5"></span>
    </div>
    <div class="decor icon">↓</div>`,
};

const T_SPLIT_PASTEL: Template = {
  id: 'split-pastel',
  label: 'Split Pastel',
  description: 'Vertical peach-and-lavender split with playful badge pills.',
  category: 'Light',
  swatch: ['#f5e6dc', '#e4dff0', '#c8f0d8'],
  fontLinks: googleFonts('Outfit:wght@400;500;700;800'),
  css: `
    body{color:#1a1a1a;font-family:'Outfit',system-ui,sans-serif;background:linear-gradient(90deg,#f5e6dc 50%,#e4dff0 50%)}
    .slide{position:absolute;inset:0}
    .slide.active{display:grid;grid-template-columns:1fr 1fr}
    .slide-content{padding:clamp(2rem,5vw,4.5rem);grid-column:1 / -1;position:relative;background:transparent}
    .slide-title{font-weight:800;line-height:.98;letter-spacing:-.03em;color:#1a1a1a}
    .slide.cover .slide-title{font-size:clamp(2.2rem,7vw,5.6rem)}
    .slide.content .slide-title{font-size:clamp(1.6rem,4.8vw,3.6rem)}
    .slide-body{color:#1a1a1a;font-size:clamp(.95rem,1.7vw,1.2rem);max-width:min(60ch,90%)}
    .slide-body code{background:rgba(0,0,0,.07)}
    .slide-body pre{background:rgba(0,0,0,.08);color:#1a1a1a}
    .right-grid{position:absolute;top:0;right:0;width:50%;height:100%;background-image:linear-gradient(rgba(26,26,26,.06) 1px,transparent 1px),linear-gradient(90deg,rgba(26,26,26,.06) 1px,transparent 1px);background-size:32px 32px;z-index:0}
    .badges{position:absolute;top:clamp(1.4rem,3vw,2.4rem);right:clamp(1.4rem,3vw,2.4rem);display:flex;flex-direction:column;gap:.5em;align-items:flex-end;z-index:2}
    .badges span{padding:.35em 1em;border-radius:999px;font-weight:700;font-size:clamp(.7rem,1.2vw,.95rem);letter-spacing:.02em}
    .b-mint{background:#c8f0d8}.b-yellow{background:#f0f0c8}.b-pink{background:#f0d4e0}
    .pager{color:#1a1a1a;font-weight:700;background:#fff;padding:.2em .6em;border-radius:999px}
    a{color:#1a1a1a;font-weight:700;border-bottom:2px solid #c8f0d8}
  `,
  slideDecor: (i) => {
    const labels = [['mint', 'fresh'], ['yellow', 'new'], ['pink', 'note'], ['mint', 'go']];
    const [cls, txt] = labels[i % labels.length];
    return `<div class="decor right-grid"></div><div class="decor badges"><span class="b-${cls}">● ${txt}</span></div>`;
  },
};

const T_VINTAGE: Template = {
  id: 'vintage-editorial',
  label: 'Vintage Editorial',
  description: 'Cream paper with witty serif headlines and abstract geometric accents.',
  category: 'Light',
  swatch: ['#f5f3ee', '#1a1a1a', '#e8d4c0'],
  fontLinks: googleFonts('Fraunces:wght@700;900', 'Work Sans:wght@400;500'),
  css: `
    body{background:#f5f3ee;color:#1a1a1a;font-family:'Work Sans',system-ui,sans-serif}
    .slide-content{padding:clamp(2rem,6vw,5rem)}
    .slide-title{font-family:'Fraunces',serif;font-weight:900;line-height:.95;letter-spacing:-.03em;color:#1a1a1a}
    .slide.cover .slide-title{font-size:clamp(2.4rem,8vw,6.4rem);max-width:14ch}
    .slide.content .slide-title{font-size:clamp(1.8rem,5.2vw,4rem);max-width:18ch}
    .slide-body{color:#555;font-size:clamp(.95rem,1.7vw,1.2rem);max-width:min(70ch,90%);font-weight:500}
    .slide-body strong{color:#1a1a1a;background:#e8d4c0;padding:.05em .3em;font-weight:700}
    .slide-body code{background:#e8d4c0;color:#1a1a1a}
    .slide-body pre{background:#1a1a1a;color:#f5f3ee}
    .slide-body blockquote{border-left:4px solid #1a1a1a;font-family:'Fraunces';font-style:italic;font-size:1.4em;color:#1a1a1a;font-weight:700}
    .shape-circle{position:absolute;top:clamp(2rem,5vw,4rem);right:clamp(2rem,5vw,4rem);width:clamp(3rem,7vw,5rem);height:clamp(3rem,7vw,5rem);border:2px solid #1a1a1a;border-radius:50%;z-index:0}
    .shape-line{position:absolute;top:clamp(4rem,8vw,7rem);right:clamp(6rem,11vw,9rem);width:clamp(4rem,8vw,7rem);height:2px;background:#1a1a1a;z-index:0}
    .shape-dot{position:absolute;top:clamp(3rem,6.5vw,5.5rem);right:clamp(1.4rem,3vw,2.8rem);width:8px;height:8px;background:#e8d4c0;border:2px solid #1a1a1a;border-radius:50%;z-index:0}
    .pager{color:#1a1a1a;font-family:'Fraunces';font-style:italic;font-weight:700}
    a{color:#1a1a1a;border-bottom:2px solid #1a1a1a}
  `,
  slideDecor: () => `<div class="decor shape-circle"></div><div class="decor shape-line"></div><div class="decor shape-dot"></div>`,
};

const T_SIMPLOYER: Template = {
  id: 'simployer',
  label: 'Simployer',
  description: 'Daniel\'s workplace: serif display + Inter body, purple #9773ff accents, soft elevation.',
  category: 'Light',
  swatch: ['#9773ff', '#ff9573', '#fffcfb'],
  fontLinks: googleFonts('Source Serif 4:wght@600;700', 'Inter:wght@400;500;600'),
  css: `
    body{background:#fffcfb;color:#16141e;font-family:'Inter',system-ui,sans-serif}
    .slide{padding:clamp(1.5rem,4vw,3rem)}
    .slide-content{background:#fff;border-radius:16px;padding:clamp(2rem,5vw,4.5rem);box-shadow:0 1px 0 rgba(45,12,105,.04),0 16px 48px -16px rgba(45,12,105,.18);position:relative;height:100%;gap:clamp(.8rem,2vw,1.5rem)}
    .slide-title{font-family:'Source Serif 4',Georgia,serif;font-weight:700;line-height:1.05;letter-spacing:-.02em;color:#16141e}
    .slide.cover .slide-title{font-size:clamp(2rem,6.5vw,5rem);max-width:18ch}
    .slide.content .slide-title{font-size:clamp(1.6rem,4.6vw,3.4rem);max-width:22ch}
    .slide-body{color:#706e78;font-size:clamp(.95rem,1.6vw,1.1rem);max-width:min(75ch,92%);font-weight:400}
    .slide-body strong{color:#16141e;font-weight:600}
    .slide-body code{background:#ece8ff;color:#2d0c69}
    .slide-body pre{background:#f2f0f7;color:#16141e;border:1px solid #ece8ff}
    .slide-body a{color:#9773ff;font-weight:500}
    .slide-body blockquote{border-left:3px solid #9773ff;color:#16141e}
    .accent-bar{position:absolute;left:0;top:clamp(2rem,5vw,4rem);bottom:clamp(2rem,5vw,4rem);width:4px;background:linear-gradient(180deg,#9773ff 0%,#ff9573 100%);border-radius:0 4px 4px 0;z-index:1}
    .badge{position:absolute;top:clamp(1.4rem,3vw,2.4rem);right:clamp(1.4rem,3vw,2.4rem);background:#ece8ff;color:#2d0c69;padding:.35em .9em;border-radius:999px;font-size:var(--small-size);font-weight:600;letter-spacing:.02em;z-index:2}
    .pager{color:#9773ff;font-weight:600}
    li::marker{color:#9773ff}
  `,
  slideDecor: (i, n) => `<div class="decor accent-bar"></div><div class="decor badge">${String(i + 1).padStart(2, '0')} of ${String(n).padStart(2, '0')}</div>`,
};

const T_NEON: Template = {
  id: 'neon-cyber',
  label: 'Neon Cyber',
  description: 'Deep navy with cyan + magenta neon glow, scanned grid, futuristic display type.',
  category: 'Specialty',
  swatch: ['#0a0f1c', '#00ffcc', '#ff00aa'],
  fontLinks: FONTSHARE_LINKS,
  css: `
    body{background:#0a0f1c;color:#e6f0ff;font-family:'Satoshi',system-ui,sans-serif;background-image:linear-gradient(rgba(0,255,204,.05) 1px,transparent 1px),linear-gradient(90deg,rgba(0,255,204,.05) 1px,transparent 1px);background-size:48px 48px}
    .slide::after{content:'';position:absolute;inset:0;background:radial-gradient(ellipse at 75% 25%,rgba(255,0,170,.18),transparent 55%),radial-gradient(ellipse at 25% 80%,rgba(0,255,204,.18),transparent 50%);z-index:0;pointer-events:none}
    .slide-content{padding:clamp(2rem,6vw,5rem)}
    .slide-title{font-family:'Clash Display','Satoshi',sans-serif;font-weight:700;line-height:1;letter-spacing:-.02em;color:#fff;text-shadow:0 0 18px rgba(0,255,204,.45)}
    .slide.cover .slide-title{font-size:clamp(2.4rem,7.5vw,5.8rem)}
    .slide.content .slide-title{font-size:clamp(1.6rem,4.8vw,3.6rem)}
    .slide.content .slide-title::after{content:'';display:block;width:clamp(2rem,4vw,3.5rem);height:2px;background:linear-gradient(90deg,#00ffcc,#ff00aa);box-shadow:0 0 12px #00ffcc;margin-top:clamp(.6rem,1.2vw,1rem)}
    .slide-body{color:#b9c4d6;font-size:clamp(.9rem,1.6vw,1.1rem)}
    .slide-body strong{color:#00ffcc}
    .slide-body em{color:#ff00aa;font-style:normal}
    .slide-body code{background:rgba(0,255,204,.1);color:#00ffcc;border:1px solid rgba(0,255,204,.25)}
    .slide-body pre{background:rgba(0,0,0,.6);border:1px solid rgba(0,255,204,.2);color:#e6f0ff}
    .slide-body a{color:#00ffcc}
    .corner{position:absolute;width:clamp(1.5rem,3vw,2.4rem);height:clamp(1.5rem,3vw,2.4rem);border:2px solid #00ffcc;z-index:1}
    .corner.tl{top:clamp(1rem,2.5vw,2rem);left:clamp(1rem,2.5vw,2rem);border-right:0;border-bottom:0}
    .corner.tr{top:clamp(1rem,2.5vw,2rem);right:clamp(1rem,2.5vw,2rem);border-left:0;border-bottom:0;border-color:#ff00aa}
    .corner.bl{bottom:clamp(1rem,2.5vw,2rem);left:clamp(1rem,2.5vw,2rem);border-right:0;border-top:0;border-color:#ff00aa}
    .corner.br{bottom:clamp(1rem,2.5vw,2rem);right:clamp(1rem,2.5vw,2rem);border-left:0;border-top:0}
    .pager{color:#00ffcc;font-family:'Clash Display','Satoshi';font-weight:700;letter-spacing:.2em;text-shadow:0 0 8px rgba(0,255,204,.5)}
    li::marker{color:#ff00aa}
  `,
  slideDecor: () => `<div class="decor corner tl"></div><div class="decor corner tr"></div><div class="decor corner bl"></div><div class="decor corner br"></div>`,
};

const T_TERMINAL: Template = {
  id: 'terminal-green',
  label: 'Terminal Green',
  description: 'GitHub dark + phosphor green mono. Scan lines, blinking cursor, code-first.',
  category: 'Specialty',
  swatch: ['#0d1117', '#39d353', '#8b949e'],
  fontLinks: JBMONO_LINK,
  css: `
    body{background:#0d1117;color:#c9d1d9;font-family:'JetBrains Mono',ui-monospace,Menlo,Consolas,monospace;font-weight:400}
    body::before{content:'';position:fixed;inset:0;background:repeating-linear-gradient(0deg,rgba(57,211,83,.03) 0,rgba(57,211,83,.03) 1px,transparent 1px,transparent 3px);pointer-events:none;z-index:100}
    .slide-content{padding:clamp(2rem,5vw,4rem)}
    .slide-title{font-family:'JetBrains Mono',monospace;font-weight:700;color:#39d353;line-height:1.15;letter-spacing:0}
    .slide.cover .slide-title{font-size:clamp(1.6rem,5vw,3.8rem)}
    .slide.cover .slide-title::before{content:'$ ';color:#8b949e}
    .slide.cover .slide-title::after{content:'_';color:#39d353;animation:blink 1s steps(2,start) infinite}
    .slide.content .slide-title{font-size:clamp(1.2rem,3.8vw,2.6rem)}
    .slide.content .slide-title::before{content:'> ';color:#c9d1d9}
    @keyframes blink{50%{opacity:0}}
    .slide-body{color:#c9d1d9;font-size:clamp(.85rem,1.5vw,1.05rem)}
    .slide-body strong{color:#39d353}
    .slide-body code{background:rgba(57,211,83,.1);color:#39d353}
    .slide-body pre{background:#010409;border:1px solid #30363d;color:#c9d1d9}
    .slide-body a{color:#58a6ff}
    .slide-body li::marker{color:#39d353}
    .slide-body blockquote{border-left-color:#39d353;color:#8b949e}
    .meta{position:absolute;top:clamp(1rem,2.5vw,2rem);right:clamp(1rem,2.5vw,2rem);color:#8b949e;font-size:var(--small-size);z-index:2}
    .meta::before{content:'-- ';color:#39d353}
    .pager{color:#39d353}
    .pager::before{content:'[ '}.pager::after{content:' ]'}
  `,
  slideDecor: (i, n) => `<div class="decor meta">${i + 1}/${n}.md</div>`,
};

const T_SWISS: Template = {
  id: 'swiss-modern',
  label: 'Swiss Modern',
  description: 'Pure white, pure black, red accent. Visible grid + asymmetric Bauhaus geometry.',
  category: 'Specialty',
  swatch: ['#ffffff', '#000000', '#ff3300'],
  fontLinks: googleFonts('Archivo:wght@400;800', 'Nunito:wght@400;500'),
  css: `
    body{background:#fff;color:#000;font-family:'Nunito',system-ui,sans-serif;background-image:linear-gradient(rgba(0,0,0,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(0,0,0,.04) 1px,transparent 1px);background-size:48px 48px}
    .slide-content{padding:clamp(2rem,6vw,5rem)}
    .slide-title{font-family:'Archivo',sans-serif;font-weight:800;text-transform:uppercase;line-height:.95;letter-spacing:-.025em;color:#000}
    .slide.cover .slide-title{font-size:clamp(2.4rem,8.5vw,7rem);max-width:14ch}
    .slide.content .slide-title{font-size:clamp(1.6rem,5vw,3.8rem);max-width:18ch}
    .slide.content .slide-title{border-bottom:6px solid #000;padding-bottom:.15em;display:inline-block;align-self:flex-start}
    .slide.content .slide-title::before{content:attr(data-num);color:#ff3300;margin-right:.6em;font-feature-settings:'tnum'}
    .slide-body{color:#000;font-size:clamp(.95rem,1.7vw,1.15rem);max-width:min(72ch,90%);font-weight:500}
    .slide-body strong{color:#ff3300;font-weight:800}
    .slide-body code{background:#000;color:#fff}
    .slide-body pre{background:#000;color:#fff}
    .square{position:absolute;background:#ff3300;z-index:0}
    .square.a{top:0;right:0;width:clamp(4rem,9vw,8rem);height:clamp(4rem,9vw,8rem)}
    .square.b{bottom:0;left:0;width:clamp(2rem,4vw,3.5rem);height:clamp(2rem,4vw,3.5rem);background:#000}
    .circle{position:absolute;bottom:clamp(2rem,5vw,4rem);right:clamp(8rem,18vw,16rem);width:clamp(3rem,6vw,5rem);height:clamp(3rem,6vw,5rem);border:6px solid #000;border-radius:50%;z-index:0}
    .pager{color:#ff3300;font-family:'Archivo';font-weight:800;letter-spacing:.2em}
    a{color:#ff3300;font-weight:700}
  `,
  slideDecor: () => `<div class="decor square a"></div><div class="decor square b"></div><div class="decor circle"></div>`,
};

const T_PAPER_INK: Template = {
  id: 'paper-ink',
  label: 'Paper & Ink',
  description: 'Warm cream, charcoal serif, crimson accents. Drop caps and pull quotes for literary decks.',
  category: 'Specialty',
  swatch: ['#faf9f7', '#1a1a1a', '#c41e3a'],
  fontLinks: googleFonts('Cormorant Garamond:wght@400;500;700', 'Source Serif 4:wght@400;500;700'),
  css: `
    body{background:#faf9f7;color:#1a1a1a;font-family:'Source Serif 4',Georgia,serif}
    .slide-content{padding:clamp(2rem,7vw,6rem) clamp(2rem,8vw,7rem);justify-content:center}
    .slide-title{font-family:'Cormorant Garamond',serif;font-weight:700;line-height:1;letter-spacing:-.02em;color:#1a1a1a}
    .slide.cover{text-align:center}
    .slide.cover .slide-content{align-items:center}
    .slide.cover .slide-title{font-size:clamp(2.6rem,9vw,7rem);max-width:18ch}
    .slide.cover .slide-title::after{content:'';display:block;width:clamp(2.5rem,5vw,4rem);height:2px;background:#c41e3a;margin:clamp(.8rem,2vw,1.4rem) auto 0}
    .slide.content .slide-title{font-size:clamp(1.7rem,5vw,3.8rem);max-width:22ch}
    .slide-body{color:#3a3636;font-size:clamp(.95rem,1.7vw,1.2rem);line-height:1.65;max-width:min(62ch,90%);font-weight:400}
    .slide.content .slide-body>p:first-child::first-letter{font-family:'Cormorant Garamond',serif;font-size:clamp(3.5rem,8vw,6rem);float:left;line-height:.85;padding:.05em .15em .05em 0;color:#c41e3a;font-weight:700}
    .slide-body strong{color:#1a1a1a;font-weight:700}
    .slide-body em{font-style:italic;color:#c41e3a}
    .slide-body code{background:#f0eeea;font-family:'JetBrains Mono',monospace;font-size:.85em}
    .slide-body pre{background:#f0eeea;font-family:'JetBrains Mono',monospace;font-size:.82em;color:#1a1a1a}
    .slide-body blockquote{border-left:none;border-top:1px solid #c41e3a;border-bottom:1px solid #c41e3a;padding:clamp(.8rem,2vw,1.4rem) 0;font-family:'Cormorant Garamond',serif;font-style:italic;font-size:1.45em;color:#1a1a1a;font-weight:500;text-align:center;margin:1em 0}
    .slide-body a{color:#c41e3a;border-bottom:1px solid #c41e3a}
    .rule{position:absolute;left:50%;top:clamp(1.6rem,3.5vw,3rem);transform:translateX(-50%);font-family:'Cormorant Garamond';font-style:italic;font-size:var(--small-size);color:#8a8580;letter-spacing:.3em;text-transform:uppercase;z-index:1}
    .rule::before,.rule::after{content:'·';margin:0 .8em;color:#c41e3a}
    .pager{color:#c41e3a;font-family:'Cormorant Garamond';font-style:italic}
  `,
  slideDecor: (i, n) => `<div class="decor rule">Folio ${String(i + 1).padStart(2, '0')} / ${String(n).padStart(2, '0')}</div>`,
};

export const TEMPLATES: Template[] = [
  T_BOLD_SIGNAL,
  T_ELECTRIC,
  T_VOLTAGE,
  T_BOTANICAL,
  T_NOTEBOOK,
  T_PASTEL,
  T_SPLIT_PASTEL,
  T_VINTAGE,
  T_SIMPLOYER,
  T_NEON,
  T_TERMINAL,
  T_SWISS,
  T_PAPER_INK,
];

export const TEMPLATES_BY_ID = Object.fromEntries(TEMPLATES.map((t) => [t.id, t])) as Record<string, Template>;

export function renderDeck(template: Template, slides: Slide[], deckTitle: string): string {
  return buildDoc(template, slides, deckTitle);
}
