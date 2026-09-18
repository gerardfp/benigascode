import { TestCaseDTO } from '../types';

export interface ParsedExercise {
  title: string;
  slug: string;
  tags: string[];
  statement: string;
  templates: Record<string, string>;
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
  // Las secciones reservadas son Plantillas y Tests.
  // Cualquier otro H2 (como ## Entrada o ## Salida) pertenece al enunciado (statement).
  const isReservedHeading = (heading: string): 'templates' | 'tests' | null => {
    const clean = heading.trim().toLowerCase();
    if (/^(plantillas?|starter\s*code|código\s*inicial)$/i.test(clean)) {
      return 'templates';
    }
    if (/^(tests?|casos\s*(de\s*)?pruebas?|pruebas?|test\s*cases?)$/i.test(clean)) {
      return 'tests';
    }
    return null;
  };

  // Buscar todas las cabeceras de nivel 2
  const h2Regex = /^##\s+([^\n]+)/gm;
  let match: RegExpExecArray | null;

  let templatesStartIndex = -1;
  let testsStartIndex = -1;

  while ((match = h2Regex.exec(text)) !== null) {
    const headingText = match[1];
    const reservedType = isReservedHeading(headingText);
    if (reservedType === 'templates' && templatesStartIndex === -1) {
      templatesStartIndex = match.index;
    } else if (reservedType === 'tests' && testsStartIndex === -1) {
      testsStartIndex = match.index;
    }
  }

  // Delimitar secciones
  const titleEndIndex = titleMatch ? (text.indexOf(titleMatch[0]) + titleMatch[0].length) : 0;

  let statementEndIndex = text.length;
  if (templatesStartIndex !== -1) {
    statementEndIndex = templatesStartIndex;
  } else if (testsStartIndex !== -1) {
    statementEndIndex = testsStartIndex;
  }

  const rawStatement = text.substring(titleEndIndex, statementEndIndex).trim();

  // 4. Extraer Plantillas
  const templates: Record<string, string> = {};
  if (templatesStartIndex !== -1) {
    const templatesEndIndex = testsStartIndex !== -1 ? testsStartIndex : text.length;
    const templatesBlock = text.substring(templatesStartIndex, templatesEndIndex);

    // Buscar todos los bloques de código ```lang ... ```
    const codeBlockRegex = /```([a-zA-Z0-9_\-#+]+)?\n([\s\S]*?)```/g;
    let codeMatch: RegExpExecArray | null;
    while ((codeMatch = codeBlockRegex.exec(templatesBlock)) !== null) {
      const rawLang = (codeMatch[1] || 'java').toLowerCase().trim();
      const normLang = rawLang.startsWith('python') || rawLang === 'py' ? 'python' : (rawLang.startsWith('java') ? 'java' : rawLang);
      const codeContent = codeMatch[2]; // Preserva indentación interior
      templates[normLang] = codeContent;
    }
  }

  // 5. Extraer Casos de Prueba (Tests)
  const testCases: TestCaseDTO[] = [];
  if (testsStartIndex !== -1) {
    const testsBlock = text.substring(testsStartIndex);

    // Dividir por bloques que comienzan por ### Test
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

      // Determinar visibilidad y peso a partir de headerParams
      // Ejemplos: "", "2", "private", "private 2", "privado 2.5", "public 3"
      const params = item.headerParams.trim().toLowerCase();
      let isPublic = true;
      if (/\b(private|privado|oculto|hidden)\b/i.test(params)) {
        isPublic = false;
      } else if (/\b(public|público|publico|visible)\b/i.test(params)) {
        isPublic = true;
      }

      // Extraer peso: buscar "peso: X" o un número suelto
      let weight = 1;
      const weightMatch = params.match(/(?:peso[:=]\s*|\b)([0-9]+(?:\.[0-9]+)?)\b/);
      if (weightMatch) {
        const parsedWeight = parseFloat(weightMatch[1]);
        if (!isNaN(parsedWeight) && parsedWeight > 0) {
          weight = parsedWeight;
        }
      }

      // Extraer bloques de código (input, output, explanation)
      const blockRegex = /```([a-zA-Z0-9_\-#+]+)?\n([\s\S]*?)```/g;
      let bMatch: RegExpExecArray | null;

      let testInput: string | null = null;
      let testOutput: string | null = null;
      let testExplanation: string | null = null;

      const fallbackBlocks: { tag: string; content: string }[] = [];

      while ((bMatch = blockRegex.exec(chunk)) !== null) {
        const tag = (bMatch[1] || '').toLowerCase().trim();
        const content = bMatch[2];

        if (/^(input|in|entrada|stdin)$/i.test(tag)) {
          testInput = content;
        } else if (/^(output|out|salida|stdout|expected)$/i.test(tag)) {
          testOutput = content;
        } else if (/^(explanation|explicacion|explicación)$/i.test(tag)) {
          testExplanation = content.trim();
        } else {
          fallbackBlocks.push({ tag, content });
        }
      }

      // Si no tenían etiquetas explícitas, asignar secuencialmente: 1º input, 2º output, 3º explicación
      if (testInput === null && fallbackBlocks.length > 0) {
        testInput = fallbackBlocks.shift()!.content;
      }
      if (testOutput === null && fallbackBlocks.length > 0) {
        testOutput = fallbackBlocks.shift()!.content;
      }
      if (testExplanation === null && fallbackBlocks.length > 0) {
        testExplanation = fallbackBlocks.shift()!.content.trim();
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
      tags,
      statement: rawStatement,
      templates,
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
  tags?: string[];
  statement?: string;
  templates?: Record<string, string>;
  testCases?: TestCaseDTO[];
}): string {
  const parts: string[] = [];

  const slug = (data.slug || '').trim();
  const tags = data.tags || [];

  // 1. Frontmatter solo si se definió slug explícito o hay tags
  if (slug || tags.length > 0) {
    parts.push('---');
    if (slug) parts.push(`slug: ${slug}`);
    if (tags.length > 0) parts.push(`tags: [${tags.join(', ')}]`);
    parts.push('---');
  }

  // 2. Título
  const title = (data.title || 'Ejercicio').trim();
  parts.push(`# ${title}\n`);

  // 3. Enunciado
  const statement = (data.statement || '').trim();
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

  // 5. Tests
  const tests = data.testCases || [];
  if (tests.length > 0) {
    parts.push('## Tests\n');
    tests.forEach((tc) => {
      const isPublic = tc.isPublic;
      const weight = Number(tc.weight) || 1;

      // Generar cabecera concisa:
      // ### Test
      // ### Test 2
      // ### Test private
      // ### Test private 2
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
        parts.push(`\`\`\`explanation\n${tc.explanation.trim()}\n\`\`\``);
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

## Tests

### Test
\`\`\`input
3 5
\`\`\`
\`\`\`output
8
\`\`\`
\`\`\`explanation
La suma de 3 y 5 es 8.
\`\`\`

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
\`\`\`explanation
Prueba con un número negativo y otro positivo.
\`\`\`

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

