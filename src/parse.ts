import { marked } from 'marked';

export interface Slide {
  title: string;
  bodyHtml: string;
  bodyMarkdown: string;
  layout?: 'cover' | 'content';
}

marked.setOptions({ gfm: true, breaks: false });

export function parseDeck(md: string): Slide[] {
  const blocks = md
    .split(/\n---\n|\n---\s*$/m)
    .map((b) => b.trim())
    .filter(Boolean);
  return blocks.map((block, i) => {
    const lines = block.split('\n');
    let title = '';
    let bodyStart = 0;
    const first = lines[0]?.trim() ?? '';
    if (first.startsWith('# ')) {
      title = first.slice(2).trim();
      bodyStart = 1;
    } else if (first.startsWith('## ')) {
      title = first.slice(3).trim();
      bodyStart = 1;
    }
    const bodyMd = lines.slice(bodyStart).join('\n').trim();
    return {
      title: title || `Slide ${i + 1}`,
      bodyMarkdown: bodyMd,
      bodyHtml: bodyMd ? (marked.parse(bodyMd) as string) : '',
      layout: i === 0 ? 'cover' : 'content',
    };
  });
}

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
