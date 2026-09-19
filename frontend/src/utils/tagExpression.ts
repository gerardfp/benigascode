/**
 * Evaluador y analizador de expresiones booleanas para filtrado y selección de etiquetas.
 * 
 * Soporta:
 * - Operadores:
 *   - Y: `&&`, `&`, `and`, `AND`
 *   - O: `||`, `|`, `or`, `OR`
 *   - NO: `!`, `not`, `NOT`
 *   - Paréntesis: `(`, `)`
 * - Operandos:
 *   - Etiquetas simples: `strings`, `arrays`, `variables`
 *   - Etiquetas con ámbito: `dificultad:facil`, `tema:bucles`
 *   - Etiquetas entrecomilladas: `"programacion dinamica"`, `'primer tema'`
 * 
 * Ejemplo:
 *   `(strings && arrays) || !variables`
 */

export type TokenType = 'LPAREN' | 'RPAREN' | 'AND' | 'OR' | 'NOT' | 'TAG';

export interface Token {
  type: TokenType;
  value: string;
  pos: number;
}

export function matchTag(exerciseTags: string[] | undefined | null, query: string): boolean {
  if (!exerciseTags || exerciseTags.length === 0) return false;
  const q = query.trim().toLowerCase();
  if (!q) return false;

  const qHasColon = q.includes(':');
  const qCat = qHasColon ? q.substring(0, q.indexOf(':')).trim() : '';
  const qVal = qHasColon ? q.substring(q.indexOf(':') + 1).trim() : q;

  return exerciseTags.some((t) => {
    if (!t) return false;
    const cleanT = t.trim().toLowerCase();
    if (cleanT === q) return true;

    const tHasColon = cleanT.includes(':');
    if (tHasColon) {
      const sep = cleanT.indexOf(':');
      const tCat = cleanT.substring(0, sep).trim();
      const tVal = cleanT.substring(sep + 1).trim();

      if (qHasColon) {
        return tCat === qCat && tVal === qVal;
      } else {
        return tVal === q || tCat === q;
      }
    } else {
      if (qHasColon) {
        return cleanT === qVal;
      } else {
        return cleanT === q;
      }
    }
  });
}

export interface ASTNode {
  evaluate: (tags: string[]) => boolean;
}

export class TagNode implements ASTNode {
  constructor(public tag: string) {}
  evaluate(tags: string[]): boolean {
    return matchTag(tags, this.tag);
  }
}

export class NotNode implements ASTNode {
  constructor(public operand: ASTNode) {}
  evaluate(tags: string[]): boolean {
    return !this.operand.evaluate(tags);
  }
}

export class AndNode implements ASTNode {
  constructor(public left: ASTNode, public right: ASTNode) {}
  evaluate(tags: string[]): boolean {
    return this.left.evaluate(tags) && this.right.evaluate(tags);
  }
}

export class OrNode implements ASTNode {
  constructor(public left: ASTNode, public right: ASTNode) {}
  evaluate(tags: string[]): boolean {
    return this.left.evaluate(tags) || this.right.evaluate(tags);
  }
}

export function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  const len = input.length;

  while (i < len) {
    const ch = input[i];

    // Espacios en blanco
    if (/\s/.test(ch)) {
      i++;
      continue;
    }

    // Paréntesis
    if (ch === '(') {
      tokens.push({ type: 'LPAREN', value: '(', pos: i });
      i++;
      continue;
    }
    if (ch === ')') {
      tokens.push({ type: 'RPAREN', value: ')', pos: i });
      i++;
      continue;
    }

    // Operador AND: && o &
    if (ch === '&') {
      if (i + 1 < len && input[i + 1] === '&') {
        tokens.push({ type: 'AND', value: '&&', pos: i });
        i += 2;
      } else {
        tokens.push({ type: 'AND', value: '&', pos: i });
        i++;
      }
      continue;
    }

    // Operador OR: || o |
    if (ch === '|') {
      if (i + 1 < len && input[i + 1] === '|') {
        tokens.push({ type: 'OR', value: '||', pos: i });
        i += 2;
      } else {
        tokens.push({ type: 'OR', value: '|', pos: i });
        i++;
      }
      continue;
    }

    // Operador NOT: !
    if (ch === '!') {
      tokens.push({ type: 'NOT', value: '!', pos: i });
      i++;
      continue;
    }

    // Cadenas entrecomilladas: "..." o '...'
    if (ch === '"' || ch === '\'') {
      const quote = ch;
      const start = i;
      i++;
      let val = '';
      while (i < len && input[i] !== quote) {
        if (input[i] === '\\' && i + 1 < len) {
          val += input[i + 1];
          i += 2;
        } else {
          val += input[i];
          i++;
        }
      }
      if (i >= len) {
        throw new Error(`Comillas sin cerrar en la posición ${start + 1}`);
      }
      i++; // saltar comilla de cierre
      tokens.push({ type: 'TAG', value: val, pos: start });
      continue;
    }

    // Palabra / Identificador / Etiqueta
    const start = i;
    while (i < len && !/\s/.test(input[i]) && !['(', ')', '&', '|', '!'].includes(input[i])) {
      i++;
    }
    const word = input.substring(start, i);
    const lower = word.toLowerCase();

    if (lower === 'and') {
      tokens.push({ type: 'AND', value: word, pos: start });
    } else if (lower === 'or') {
      tokens.push({ type: 'OR', value: word, pos: start });
    } else if (lower === 'not') {
      tokens.push({ type: 'NOT', value: word, pos: start });
    } else {
      tokens.push({ type: 'TAG', value: word, pos: start });
    }
  }

  return tokens;
}

export function parseTokens(tokens: Token[]): ASTNode {
  let cursor = 0;

  const peek = (): Token | undefined => tokens[cursor];
  const consume = (): Token => tokens[cursor++];

  const parseOr = (): ASTNode => {
    let left = parseAnd();
    while (peek()?.type === 'OR') {
      consume();
      const right = parseAnd();
      left = new OrNode(left, right);
    }
    return left;
  };

  const parseAnd = (): ASTNode => {
    let left = parseNot();
    while (peek()?.type === 'AND') {
      consume();
      const right = parseNot();
      left = new AndNode(left, right);
    }
    return left;
  };

  const parseNot = (): ASTNode => {
    if (peek()?.type === 'NOT') {
      consume();
      const operand = parseNot();
      return new NotNode(operand);
    }
    return parsePrimary();
  };

  const parsePrimary = (): ASTNode => {
    const token = peek();
    if (!token) {
      throw new Error('Expresión incompleta: se esperaba una etiqueta');
    }
    if (token.type === 'LPAREN') {
      consume();
      const expr = parseOr();
      const next = peek();
      if (!next || next.type !== 'RPAREN') {
        throw new Error('Falta paréntesis de cierre )');
      }
      consume();
      return expr;
    }
    if (token.type === 'TAG') {
      consume();
      return new TagNode(token.value);
    }
    throw new Error(`Elemento inesperado '${token.value}'`);
  };

  const root = parseOr();
  if (cursor < tokens.length) {
    throw new Error(`Elemento inesperado '${tokens[cursor].value}'`);
  }
  return root;
}

export interface TagExpressionResult {
  isEmpty: boolean;
  isValid: boolean;
  error: string | null;
  evaluate: ((tags: string[] | undefined | null) => boolean) | null;
}

export function parseTagExpression(input: string): TagExpressionResult {
  const trimmed = input.trim();
  if (!trimmed) {
    return {
      isEmpty: true,
      isValid: true,
      error: null,
      evaluate: null,
    };
  }

  try {
    const tokens = tokenize(trimmed);
    if (tokens.length === 0) {
      return {
        isEmpty: true,
        isValid: true,
        error: null,
        evaluate: null,
      };
    }
    const ast = parseTokens(tokens);
    return {
      isEmpty: false,
      isValid: true,
      error: null,
      evaluate: (tags) => ast.evaluate(tags || []),
    };
  } catch (err: any) {
    return {
      isEmpty: false,
      isValid: false,
      error: err.message || 'Expresión no válida',
      evaluate: null,
    };
  }
}

