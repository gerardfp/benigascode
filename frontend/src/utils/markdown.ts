import { Marked } from 'marked';
import DOMPurify from 'dompurify';
import hljs from 'highlight.js';
import 'highlight.js/styles/vs2015.css';
import mermaid from 'mermaid';

let mermaidInitialized = false;
function ensureMermaidInitialized() {
  if (!mermaidInitialized) {
    mermaid.initialize({
      startOnLoad: false,
      theme: 'default',
      securityLevel: 'loose',
    });
    mermaidInitialized = true;
  }
}

/**
 * Renderiza Markdown a HTML sanitizado con soporte para:
 * 1. Bloques de código con lenguaje (ej. java, py, js) -> fondo oscuro con resaltado de sintaxis hljs
 * 2. Bloques mermaid -> renderizados como contenedor de diagramas
 * 3. Bloques de tipo texto plano (text, txt, plain, o sin lenguaje) -> fondo gris claro similar a casos de prueba
 * 4. Soporte para fórmulas matemáticas LaTeX $...$ y $$...$$ (MathJax)
 * 5. Reescritura de rutas relativas de imágenes hacia la API de assets del ejercicio
 */
export function renderMarkdown(markdownContent: string, exerciseId?: string | null): string {
  if (!markdownContent) return '';

  const markedInstance = new Marked({ gfm: true, breaks: true });

  // Tokenizadores para proteger fórmulas matemáticas de reglas GFM (como _ tratada como cursiva)
  markedInstance.use({
    extensions: [
      {
        name: 'blockMath',
        level: 'block',
        start(src: string) {
          return src.indexOf('$$');
        },
        tokenizer(src: string) {
          const match = src.match(/^\$\$([\s\S]+?)\$\$/);
          if (match) {
            return {
              type: 'blockMath',
              raw: match[0],
              text: match[1].trim()
            };
          }
        },
        renderer(token: any) {
          return `<div class="math-display">$$${token.text}$$</div>\n`;
        }
      },
      {
        name: 'inlineMath',
        level: 'inline',
        start(src: string) {
          return src.indexOf('$');
        },
        tokenizer(src: string) {
          const match = src.match(/^\$((?:\\\$|[^$\n])+?)\$/);
          if (match) {
            return {
              type: 'inlineMath',
              raw: match[0],
              text: match[1]
            };
          }
        },
        renderer(token: any) {
          return `<span class="math-inline">$${token.text}$</span>`;
        }
      }
    ],
    renderer: {
      code(codeOrToken: any, infostring?: any) {
        const text: string = typeof codeOrToken === 'string' ? codeOrToken : codeOrToken?.text || '';
        const lang: string = (typeof codeOrToken === 'string' ? infostring : codeOrToken?.lang) || '';
        const rawLang = lang.trim().toLowerCase();

        // 1. Diagramas Mermaid
        if (rawLang === 'mermaid') {
          const escaped = text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
          return `<div class="mermaid-container" style="display:flex;justify-content:center;margin:1.25rem 0;overflow-x:auto;"><pre class="mermaid" style="background:transparent;border:none;margin:0;padding:0;">${escaped}</pre></div>`;
        }

        // 2. Bloques tipo texto plano
        const isPlain = !rawLang || rawLang === 'text' || rawLang === 'txt' || rawLang === 'plain';
        if (isPlain) {
          const escaped = text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
          return `<pre class="code-block-text"><code>${escaped}</code></pre>`;
        }

        // 3. Bloques de código con sintaxis resaltada
        let highlighted = '';
        if (hljs.getLanguage(rawLang)) {
          try {
            highlighted = hljs.highlight(text, { language: rawLang, ignoreIllegals: true }).value;
          } catch {
            highlighted = hljs.highlightAuto(text).value;
          }
        } else {
          try {
            highlighted = hljs.highlightAuto(text).value;
          } catch {
            highlighted = text
              .replace(/&/g, '&amp;')
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;');
          }
        }

        return `<pre class="code-block-code"><code class="hljs language-${rawLang}">${highlighted}</code></pre>`;
      }
    },
    walkTokens(token) {
      if (token.type === 'image' && token.href && exerciseId) {
        let href = token.href.trim();
        if (!href.startsWith('http://') && !href.startsWith('https://') && !href.startsWith('data:') && !href.startsWith('/api/')) {
          href = href.replace(/^\/+/, '').replace(/^\.\//, '');
          if (href.startsWith('assets/')) {
            href = href.substring(7);
          }
          token.href = `/api/v1/exercises/${exerciseId}/assets/${href}`;
        }
      }
    }
  });

  let html = markedInstance.parse(markdownContent, { async: false }) as string;

  if (exerciseId) {
    html = html.replace(/<img\s+([^>]*?)src=["'](?!https?:\/\/|data:|\/api\/)([^"']+)["']([^>]*?)>/gi, (_match, before, src, after) => {
      let cleanHref = src.trim().replace(/^\/+/, '').replace(/^\.\//, '');
      if (cleanHref.startsWith('assets/')) {
        cleanHref = cleanHref.substring(7);
      }
      return `<img ${before}src="/api/v1/exercises/${exerciseId}/assets/${cleanHref}"${after} loading="lazy">`;
    });
  }

  return DOMPurify.sanitize(html, {
    ADD_TAGS: [
      'img', 'span', 'pre', 'code', 'div',
      'svg', 'g', 'path', 'defs', 'marker', 'rect', 'circle', 'line', 'polygon', 'polyline', 'text', 'tspan', 'foreignObject', 'use'
    ],
    ADD_ATTR: [
      'src', 'alt', 'title', 'class', 'loading', 'style',
      'xmlns', 'viewBox', 'width', 'height', 'd', 'fill', 'stroke', 'stroke-width',
      'stroke-dasharray', 'stroke-linecap', 'stroke-linejoin', 'transform', 'role',
      'focusable', 'aria-hidden', 'x', 'y', 'x1', 'y1', 'x2', 'y2', 'r', 'cx', 'cy',
      'points', 'marker-end', 'marker-start', 'marker-mid', 'id', 'data-processed',
      'href', 'xlink:href'
    ]
  });
}

/**
 * Procesa diagramas Mermaid y renderiza fórmulas matemáticas MathJax dentro del contenedor DOM especificado.
 */
export async function processMathAndMermaid(container: HTMLElement | null): Promise<void> {
  if (!container) return;

  // 1. Renderizar diagramas Mermaid
  const mermaidNodes = container.querySelectorAll<HTMLElement>('.mermaid:not([data-processed="true"])');
  if (mermaidNodes.length > 0) {
    ensureMermaidInitialized();
    for (let i = 0; i < mermaidNodes.length; i++) {
      const node = mermaidNodes[i];
      const rawCode = node.textContent || '';
      if (!rawCode.trim()) continue;

      const id = `mermaid-${Math.random().toString(36).substring(2, 9)}-${Date.now()}-${i}`;
      try {
        const { svg } = await mermaid.render(id, rawCode);
        node.innerHTML = svg;
        node.setAttribute('data-processed', 'true');
      } catch {
        node.setAttribute('data-processed', 'error');
      }
    }
  }

  // 2. Procesar fórmulas matemáticas con MathJax
  if (typeof window !== 'undefined') {
    const renderMath = (mj: any) => {
      if (typeof mj?.typesetPromise === 'function') {
        mj.typesetPromise([container]).catch(() => {});
      } else if (mj?.startup?.promise) {
        mj.startup.promise.then(() => {
          if (typeof mj.typesetPromise === 'function') {
            mj.typesetPromise([container]).catch(() => {});
          }
        });
      }
    };

    const mathJax = (window as any).MathJax;
    if (mathJax && (typeof mathJax.typesetPromise === 'function' || mathJax.startup?.promise)) {
      renderMath(mathJax);
    } else {
      let attempts = 0;
      const timer = setInterval(() => {
        attempts++;
        const mj = (window as any).MathJax;
        if (mj && (typeof mj.typesetPromise === 'function' || mj.startup?.promise)) {
          clearInterval(timer);
          renderMath(mj);
        } else if (attempts >= 50) {
          clearInterval(timer);
        }
      }, 100);
    }
  }
}
