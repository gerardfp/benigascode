import { TestCaseDTO } from '../types';

export interface ParsedExercise {
  title: string;
  slug: string;
  difficulty?: number;
  tags: string[];
  statement: string;
  templates: Record<string, string>;
  solutions: Record<string, string>;
  testCases: TestCaseDTO[];
}

export interface ParseExerciseResult {
  success: boolean;
  exercise: ParsedExercise;
  errors: string[];
  warnings: string[];
}

/**
 * Convierte un título en un slug amigable para URLs
 */
export function slugify(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Eliminar acentos y diacríticos
    .replace(/[^a-z0-9]+/g, '-')     // Caracteres especiales a guiones
    .replace(/^-+|-+$/g, '');        // Limpiar guiones iniciales o finales
}

/**
 * Parsea un documento de texto único en Markdown y extrae todos los datos de un ejercicio.
 */
export function parseExerciseMarkdown(rawMarkdown: string): ParseExerciseResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  let text = (rawMarkdown || '').replace(/\r\n/g, '\n');

  let slug = '';
  let difficulty: number | undefined;
  let tags: string[] = [];

  // 1. Extraer Frontmatter YAML (opcional)
  const frontmatterMatch = text.match(/^---\n([\s\S]*?)\n---\n?/);
  if (frontmatterMatch) {
    const yamlContent = frontmatterMatch[1];
    text = text.substring(frontmatterMatch[0].length);

    // Parsear slug
    const slugMatch = yamlContent.match(/^slug:\s*['"]?([^'"\n]+)['"]?/m);
    if (slugMatch) {
      slug = slugMatch[1].trim();
    }

    // Parsear dificultad (decimal 0 a 10)
    const diffMatch = yamlContent.match(/^(?:difficulty|dificultad):\s*([0-9]+(?:\.[0-9]+)?)/im);
    if (diffMatch) {
      const parsedDiff = parseFloat(diffMatch[1]);
      if (!isNaN(parsedDiff)) {
        difficulty = Math.max(0, Math.min(10, Math.round(parsedDiff * 10) / 10));
      }
    }

    // Parsear tags: formato en línea [tag1, tag2] o formato lista YAML - tag1
    const inlineTagsMatch = yamlContent.match(/^tags:\s*\[(.*?)\]/m);
    if (inlineTagsMatch) {
      tags = inlineTagsMatch[1]
        .split(',')
        .map((t) => t.replace(/['"]/g, '').trim())
        .filter(Boolean);
    } else {
      const listTagsMatch = yamlContent.match(/^tags:\s*\n((?:\s*-\s*[^\n]+\n?)+)/m);
      if (listTagsMatch) {
        tags = listTagsMatch[1]
          .split('\n')
          .map((line) => line.replace(/^\s*-\s*/, '').replace(/['"]/g, '').trim())
          .filter(Boolean);
      }
    }
  }

  // 2. Extraer Título (# Título)
  let title = '';
  const titleMatch = text.match(/^#\s+([^\n]+)/m);
  if (titleMatch) {
    title = titleMatch[1].trim();
  } else {
    warnings.push('No se ha encontrado un título con "# Título". Se usará "Ejercicio sin título".');
    title = 'Ejercicio sin título';
  }

  if (!slug) {
    slug = slugify(title);
  }

  // 3. Identificar secciones principales delimitadas por H2 (##)
  const isReservedHeading = (heading: string): 'templates' | 'solutions' | 'tests' | null => {
    const clean = heading.trim().toLowerCase();
    if (/^(plantillas?|starter\s*code|código\s*inicial)$/i.test(clean)) {
      return 'templates';
    }
    if (/^(solutions?|soluci[oó]n(es)?|código\s*soluci[oó]n|reference\s*solutions?)$/i.test(clean)) {
      return 'solutions';
    }
    if (/^(tests?|casos\s*(de\s*)?pruebas?|pruebas?|test\s*cases?)$/i.test(clean)) {
      return 'tests';
    }
    return null;
  };

  const h2Regex = /^##\s+([^\n]+)/gm;
  let match: RegExpExecArray | null;

  let templatesStartIndex = -1;
  let solutionsStartIndex = -1;
  let testsStartIndex = -1;

  while ((match = h2Regex.exec(text)) !== null) {
    const headingText = match[1];
    const reservedType = isReservedHeading(headingText);
    if (reservedType === 'templates' && templatesStartIndex === -1) {
      templatesStartIndex = match.index;
    } else if (reservedType === 'solutions' && solutionsStartIndex === -1) {
      solutionsStartIndex = match.index;
    } else if (reservedType === 'tests' && testsStartIndex === -1) {
      testsStartIndex = match.index;
    }
  }

  const sectionStarts: number[] = [];
  if (templatesStartIndex !== -1) sectionStarts.push(templatesStartIndex);
  if (solutionsStartIndex !== -1) sectionStarts.push(solutionsStartIndex);
  if (testsStartIndex !== -1) sectionStarts.push(testsStartIndex);
  sectionStarts.sort((a, b) => a - b);

  const nextSectionEnd = (starts: number[], currentStart: number, maxLen: number) => {
    for (const s of starts) {
      if (s > currentStart) return s;
    }
    return maxLen;
  };

  const titleEndIndex = titleMatch ? (text.indexOf(titleMatch[0]) + titleMatch[0].length) : 0;
  const statementEndIndex = sectionStarts.length > 0 ? sectionStarts[0] : text.length;

  const rawStatement = text.substring(titleEndIndex, statementEndIndex).trim();

  // 4. Extraer Plantillas
  const templates: Record<string, string> = {};
  if (templatesStartIndex !== -1) {
    const templatesEndIndex = nextSectionEnd(sectionStarts, templatesStartIndex, text.length);
    const templatesBlock = text.substring(templatesStartIndex, templatesEndIndex);

    const codeBlockRegex = /```([a-zA-Z0-9_\-#+]+)?\n([\s\S]*?)```/g;
    let codeMatch: RegExpExecArray | null;
    while ((codeMatch = codeBlockRegex.exec(templatesBlock)) !== null) {
      const rawLang = (codeMatch[1] || 'java').toLowerCase().trim();
      const normLang = rawLang.startsWith('python') || rawLang === 'py' ? 'python' : (rawLang.startsWith('java') ? 'java' : rawLang);
      const codeContent = codeMatch[2];
      templates[normLang] = codeContent;
    }
  }

  // 5. Extraer Soluciones (## Solutions)
  const solutions: Record<string, string> = {};
  if (solutionsStartIndex !== -1) {
    const solutionsEndIndex = nextSectionEnd(sectionStarts, solutionsStartIndex, text.length);
    const solutionsBlock = text.substring(solutionsStartIndex, solutionsEndIndex);

    const codeBlockRegex = /```([a-zA-Z0-9_\-#+]+)?\n([\s\S]*?)```/g;
    let codeMatch: RegExpExecArray | null;
    while ((codeMatch = codeBlockRegex.exec(solutionsBlock)) !== null) {
      const rawLang = (codeMatch[1] || 'java').toLowerCase().trim();
      const normLang = rawLang.startsWith('python') || rawLang === 'py' ? 'python' : (rawLang.startsWith('java') ? 'java' : rawLang);
      const codeContent = codeMatch[2];
      solutions[normLang] = codeContent;
    }
  }

  // 6. Extraer Casos de Prueba (Tests)
  const testCases: TestCaseDTO[] = [];
  if (testsStartIndex !== -1) {
    const testsEndIndex = nextSectionEnd(sectionStarts, testsStartIndex, text.length);
    const testsBlock = text.substring(testsStartIndex, testsEndIndex);

    const testHeaderRegex = /^###\s+Test(?:\s+([^\n\r]*))?/gim;
    const testIndices: { index: number; headerParams: string }[] = [];

    let thMatch: RegExpExecArray | null;
    while ((thMatch = testHeaderRegex.exec(testsBlock)) !== null) {
      testIndices.push({
        index: thMatch.index,
        headerParams: thMatch[1] || ''
      });
    }

    testIndices.forEach((item, idx) => {
      const startPos = item.index;
      const endPos = (idx < testIndices.length - 1) ? testIndices[idx + 1].index : testsBlock.length;
      const chunk = testsBlock.substring(startPos, endPos);

      const params = item.headerParams.trim().toLowerCase();
      let isPublic = true;
      if (/\b(private|privado|oculto|hidden)\b/i.test(params)) {
        isPublic = false;
      } else if (/\b(public|público|publico|visible)\b/i.test(params)) {
        isPublic = true;
      }

      let weight = 1;
      const weightMatch = params.match(/(?:peso[:=]\s*|\b)([0-9]+(?:\.[0-9]+)?)\b/);
      if (weightMatch) {
        const parsedWeight = parseFloat(weightMatch[1]);
        if (!isNaN(parsedWeight) && parsedWeight > 0) {
          weight = parsedWeight;
        }
      }

      // Extraer bloques de código (input, output)
      const blockRegex = /```([a-zA-Z0-9_\-#+]+)?\n([\s\S]*?)```/g;
      let bMatch: RegExpExecArray | null;

      let testInput: string | null = null;
      let testOutput: string | null = null;

      const fallbackBlocks: { tag: string; content: string }[] = [];

      while ((bMatch = blockRegex.exec(chunk)) !== null) {
        const tag = (bMatch[1] || '').toLowerCase().trim();
        const content = bMatch[2];

        if (/^(input|in|entrada|stdin)$/i.test(tag)) {
          testInput = content;
        } else if (/^(output|out|salida|stdout|expected)$/i.test(tag)) {
          testOutput = content;
        } else {
          fallbackBlocks.push({ tag, content });
        }
      }

      if (testInput === null && fallbackBlocks.length > 0) {
        testInput = fallbackBlocks.shift()!.content;
      }
      if (testOutput === null && fallbackBlocks.length > 0) {
        testOutput = fallbackBlocks.shift()!.content;
      }

      // Extraer explicación con #### Explanation
      let testExplanation: string | null = null;
      const explanationHeaderRegex = /^####\s+(?:explanation|explicación|explicacion)\b[^\n]*\n/im;
      const explMatch = chunk.match(explanationHeaderRegex);
      if (explMatch && explMatch.index !== undefined) {
        const explStart = explMatch.index + explMatch[0].length;
        let explEnd = chunk.length;
        const postBlocks = /```(input|in|entrada|stdin|output|out|salida|stdout|expected)\b/gi;
        postBlocks.lastIndex = explStart;
        const nextBlock = postBlocks.exec(chunk);
        if (nextBlock && nextBlock.index !== undefined) {
          explEnd = nextBlock.index;
        }
        testExplanation = chunk.substring(explStart, explEnd).trim();
      }

      testCases.push({
        id: undefined,
        isPublic,
        orderIndex: idx,
        weight,
        input: testInput !== null ? testInput : '',
        expectedOutput: testOutput !== null ? testOutput : '',
        explanation: testExplanation || ''
      });
    });
  }

  if (testCases.length === 0) {
    warnings.push('No se han detectado casos de prueba en la sección "## Tests".');
  }

  return {
    success: errors.length === 0,
    exercise: {
      title,
      slug,
      difficulty,
      tags,
      statement: rawStatement,
      templates,
      solutions,
      testCases
    },
    errors,
    warnings
  };
}

/**
 * Convierte los datos de un ejercicio al formato canónico de documento Markdown único.
 */
export function serializeExerciseToMarkdown(data: {
  title: string;
  slug?: string;
  difficulty?: number;
  tags?: string[];
  statement?: string;
  templates?: Record<string, string>;
  solutions?: Record<string, string>;
  testCases?: TestCaseDTO[];
}): string {
  const parts: string[] = [];

  const slug = (data.slug || '').trim();
  const tags = data.tags || [];
  const difficulty = data.difficulty !== undefined && data.difficulty !== null ? Number(data.difficulty) : undefined;

  // 1. Frontmatter solo si se definió slug, dificultad o tags
  if (slug || tags.length > 0 || (difficulty !== undefined && !isNaN(difficulty))) {
    parts.push('---');
    if (slug) parts.push(`slug: ${slug}`);
    if (difficulty !== undefined && !isNaN(difficulty)) {
      parts.push(`difficulty: ${difficulty % 1 === 0 ? difficulty.toFixed(1) : difficulty}`);
    }
    if (tags.length > 0) parts.push(`tags: [${tags.join(', ')}]`);
    parts.push('---');
  }

  // 2. Título
  const title = (data.title || 'Ejercicio').trim();
  parts.push(`# ${title}\n`);

  // 3. Enunciado
  let statement = (data.statement || '').trim();
  if (statement.startsWith('# ')) {
    const firstLineEnd = statement.indexOf('\n');
    const firstLine = firstLineEnd !== -1 ? statement.slice(2, firstLineEnd).trim() : statement.slice(2).trim();
    if (firstLine.toLowerCase() === title.toLowerCase()) {
      statement = firstLineEnd !== -1 ? statement.slice(firstLineEnd + 1).trim() : '';
    }
  }

  if (statement) {
    parts.push(`${statement}\n`);
  } else {
    parts.push('Descripción del problema...\n\n## Entrada\n\n## Salida\n');
  }

  // 4. Plantillas
  const templates = data.templates || {};
  const templateEntries = Object.entries(templates).filter(([, code]) => code && code.trim());

  if (templateEntries.length > 0) {
    parts.push('## Plantillas\n');
    templateEntries.forEach(([lang, code]) => {
      const cleanLang = lang.toLowerCase().trim();
      const codeBlock = code.endsWith('\n') ? code : `${code}\n`;
      parts.push(`\`\`\`${cleanLang}\n${codeBlock}\`\`\`\n`);
    });
  }

  // 5. Soluciones (Canonical header: ## Solutions)
  const solutions = data.solutions || {};
  const solutionEntries = Object.entries(solutions).filter(([, code]) => code && code.trim());

  if (solutionEntries.length > 0) {
    parts.push('## Solutions\n');
    solutionEntries.forEach(([lang, code]) => {
      const cleanLang = lang.toLowerCase().trim();
      const codeBlock = code.endsWith('\n') ? code : `${code}\n`;
      parts.push(`\`\`\`${cleanLang}\n${codeBlock}\`\`\`\n`);
    });
  }

  // 6. Tests
  const tests = data.testCases || [];
  if (tests.length > 0) {
    parts.push('## Tests\n');
    tests.forEach((tc) => {
      const isPublic = tc.isPublic;
      const weight = Number(tc.weight) || 1;

      let header = '### Test';
      if (!isPublic) {
        header += ' private';
      }
      if (weight !== 1) {
        header += ` ${weight}`;
      }

      parts.push(header);

      const inputVal = tc.input !== undefined && tc.input !== null ? tc.input : '';
      const formattedInput = inputVal.endsWith('\n') || inputVal === '' ? inputVal : `${inputVal}\n`;
      parts.push(`\`\`\`input\n${formattedInput}\`\`\``);

      const outputVal = tc.expectedOutput !== undefined && tc.expectedOutput !== null
        ? tc.expectedOutput
        : '';
      const formattedOutput = outputVal.endsWith('\n') || outputVal === '' ? outputVal : `${outputVal}\n`;
      parts.push(`\`\`\`output\n${formattedOutput}\`\`\``);

      if (tc.explanation && tc.explanation.trim()) {
        parts.push(`#### Explanation\n${tc.explanation.trim()}`);
      }

      parts.push(''); // Salto de línea separador
    });
  }

  return parts.join('\n').trim() + '\n';
}

/**
 * Plantilla canónica de ejemplo para inicializar rápidamente nuevos ejercicios.
 */
export const CANONICAL_EXERCISE_EXAMPLE = `---
slug: suma-dos-numeros
difficulty: 1.0
tags: [basico, matematicas, i/o]
---
# Suma de dos números

Escribe un programa que lea dos números enteros de la entrada estándar y muestre su suma por pantalla.

## Entrada
La entrada contiene dos números enteros $A$ y $B$ (donde $-10^6 \\le A, B \\le 10^6$) separados por un espacio o por un salto de línea.

## Salida
Imprime un único número entero que sea el resultado de $A + B$, seguido de un salto de línea.

## Plantillas

\`\`\`java
import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        // Escribe aquí tu solución
    }
}
\`\`\`

\`\`\`python
import sys

def main():
    # Escribe aquí tu solución
    pass

if __name__ == '__main__':
    main()
\`\`\`

## Solutions

\`\`\`java
import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int a = sc.nextInt();
        int b = sc.nextInt();
        System.out.println(a + b);
    }
}
\`\`\`

\`\`\`python
import sys

def main():
    tokens = sys.stdin.read().split()
    if len(tokens) >= 2:
        print(int(tokens[0]) + int(tokens[1]))

if __name__ == '__main__':
    main()
\`\`\`

## Tests

### Test
\`\`\`input
3 5
\`\`\`
\`\`\`output
8
\`\`\`
#### Explanation
La suma de 3 y 5 es 8.

### Test
\`\`\`input
0 0
\`\`\`
\`\`\`output
0
\`\`\`

### Test private 2
\`\`\`input
-15 4
\`\`\`
\`\`\`output
-11
\`\`\`
#### Explanation
Prueba con un número negativo y otro positivo.

### Test private 2
\`\`\`input
-20 -30
\`\`\`
\`\`\`output
-50
\`\`\`

### Test private 3
\`\`\`input
1000000 2000000
\`\`\`
\`\`\`output
3000000
\`\`\`
`;
