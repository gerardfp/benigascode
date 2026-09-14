import { Marked } from 'marked';
import DOMPurify from 'dompurify';
import hljs from 'highlight.js';
import 'highlight.js/styles/vs2015.css';

/**
 * Renderiza Markdown a HTML sanitizado con soporte para:
 * 1. Bloques de código con lenguaje (ej. java, py, js) -> fondo oscuro con resaltado de sintaxis hljs
 * 2. Bloques de tipo texto plano (text, txt, plain, o sin lenguaje) -> fondo gris claro similar a casos de prueba
 * 3. Reescritura de rutas relativas de imágenes hacia la API de assets del ejercicio
 */
export function renderMarkdown(markdownContent: string, exerciseId?: string | null): string {
  if (!markdownContent) return '';

  const markedInstance = new Marked({ gfm: true, breaks: true });

  markedInstance.use({
    renderer: {
      code(codeOrToken: any, infostring?: any) {
        const text: string = typeof codeOrToken === 'string' ? codeOrToken : codeOrToken?.text || '';
        const lang: string = (typeof codeOrToken === 'string' ? infostring : codeOrToken?.lang) || '';
        const rawLang = lang.trim().toLowerCase();

        // 1. Bloques tipo texto plano
        const isPlain = !rawLang || rawLang === 'text' || rawLang === 'txt' || rawLang === 'plain';
        if (isPlain) {
          const escaped = text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
          return `<pre class="code-block-text"><code>${escaped}</code></pre>`;
        }

        // 2. Bloques de código con sintaxis resaltada
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
        const href = token.href;
        if (!href.startsWith('http://') && !href.startsWith('https://') && !href.startsWith('data:') && !href.startsWith('/api/')) {
          token.href = `/api/v1/exercises/${exerciseId}/assets/${href.replace(/^\/+/, '')}`;
        }
      }
    }
  });

  let html = markedInstance.parse(markdownContent, { async: false }) as string;

  if (exerciseId) {
    html = html.replace(/<img\s+([^>]*?)src=["'](?!https?:\/\/|data:|\/api\/)([^"']+)["']([^>]*?)>/gi, (_match, before, src, after) => {
      const cleanHref = src.replace(/^\/+/, '');
      return `<img ${before}src="/api/v1/exercises/${exerciseId}/assets/${cleanHref}"${after} loading="lazy">`;
    });
  }

  return DOMPurify.sanitize(html, {
    ADD_TAGS: ['img', 'span', 'pre', 'code'],
    ADD_ATTR: ['src', 'alt', 'title', 'class', 'loading', 'style']
  });
}
