import { useEffect, useMemo, useRef, useState } from 'react';
import { parseDeck } from './parse';
import { TEMPLATES, TEMPLATES_BY_ID } from './templates';
import { SEED_MARKDOWN } from './seed';

const STORAGE_MD = 'slide-builder:md';
const STORAGE_TEMPLATE = 'slide-builder:template';
const STORAGE_TITLE = 'slide-builder:title';

export default function App() {
  const [md, setMd] = useState<string>(() => localStorage.getItem(STORAGE_MD) ?? SEED_MARKDOWN);
  const [templateId, setTemplateId] = useState<string>(
    () => localStorage.getItem(STORAGE_TEMPLATE) ?? 'council'
  );
  const [deckTitle, setDeckTitle] = useState<string>(
    () => localStorage.getItem(STORAGE_TITLE) ?? 'Untitled Deck'
  );
  const [galleryOpen, setGalleryOpen] = useState(true);
  const [downloaded, setDownloaded] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => localStorage.setItem(STORAGE_MD, md), [md]);
  useEffect(() => localStorage.setItem(STORAGE_TEMPLATE, templateId), [templateId]);
  useEffect(() => localStorage.setItem(STORAGE_TITLE, deckTitle), [deckTitle]);

  const slides = useMemo(() => parseDeck(md), [md]);
  const template = TEMPLATES_BY_ID[templateId] ?? TEMPLATES[0];
  const html = useMemo(() => template.render(slides, deckTitle), [template, slides, deckTitle]);

  useEffect(() => {
    const frame = iframeRef.current;
    if (!frame) return;
    const doc = frame.contentDocument;
    if (!doc) return;
    doc.open();
    doc.write(html);
    doc.close();
  }, [html]);

  function downloadHtml() {
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const slug = deckTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'deck';
    a.download = `${slug}.html`;
    a.click();
    URL.revokeObjectURL(url);
    setDownloaded(true);
    setTimeout(() => setDownloaded(false), 1400);
  }

  function openInNewTab() {
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank', 'noopener,noreferrer');
    setTimeout(() => URL.revokeObjectURL(url), 30_000);
  }

  function loadSeed() {
    if (md && md !== SEED_MARKDOWN) {
      if (!confirm('Replace current markdown with the demo deck?')) return;
    }
    setMd(SEED_MARKDOWN);
    setDeckTitle('Wilson — Household Builder');
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="logo">📑</span>
          <div>
            <div className="brand-title">Slide Builder</div>
            <div className="brand-sub">Markdown → portable HTML deck</div>
          </div>
        </div>
        <div className="title-input">
          <label>Deck title</label>
          <input
            value={deckTitle}
            onChange={(e) => setDeckTitle(e.target.value)}
            placeholder="Untitled Deck"
            spellCheck={false}
          />
        </div>
        <div className="actions">
          <button className="ghost" onClick={loadSeed} title="Load the demo deck">
            ↺ demo
          </button>
          <button className="ghost" onClick={openInNewTab} title="Open the deck in a new tab">
            ↗ open
          </button>
          <button className="primary" onClick={downloadHtml}>
            {downloaded ? '✓ downloaded' : '⬇ download .html'}
          </button>
        </div>
      </header>

      <section className={`gallery ${galleryOpen ? 'open' : 'closed'}`}>
        <button className="gallery-toggle" onClick={() => setGalleryOpen((s) => !s)}>
          {galleryOpen ? '▾' : '▸'} Templates
        </button>
        {galleryOpen && (
          <div className="cards">
            {TEMPLATES.map((t) => (
              <button
                key={t.id}
                className={`card ${t.id === templateId ? 'active' : ''}`}
                onClick={() => setTemplateId(t.id)}
              >
                <div className="card-swatch">
                  {t.swatch.map((c) => (
                    <span key={c} style={{ background: c }} />
                  ))}
                </div>
                <div className="card-meta">
                  <div className="card-label">{t.label}</div>
                  <div className="card-desc">{t.description}</div>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>

      <main className="workspace">
        <section className="editor">
          <div className="pane-head">
            <span>Markdown</span>
            <span className="count">
              {slides.length} slide{slides.length === 1 ? '' : 's'} · {md.length.toLocaleString()} chars
            </span>
          </div>
          <textarea
            value={md}
            onChange={(e) => setMd(e.target.value)}
            spellCheck={false}
            placeholder={"# Slide 1 title\nBody here…\n\n---\n\n# Slide 2 title\n- bullet\n- bullet"}
          />
          <div className="editor-help">
            Separate slides with <code>---</code> on its own line. Start each with{' '}
            <code># Title</code> or <code>## Title</code>.
          </div>
        </section>

        <section className="preview">
          <div className="pane-head">
            <span>Preview</span>
            <span className="count template-tag">{template.label}</span>
          </div>
          <div className="iframe-wrap">
            <iframe
              ref={iframeRef}
              title="Deck preview"
              sandbox="allow-scripts allow-same-origin"
            />
          </div>
          <div className="preview-help">
            <kbd>→</kbd> / <kbd>←</kbd> to navigate · clicking left/right edge also works
          </div>
        </section>
      </main>
    </div>
  );
}
