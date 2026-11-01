/**
 * Java Stepper Simulator Engine for Benigascode
 * Supports the Java 26 educational subset from debugstepper/teoria (Units 1-4):
 * - Program structure: package/import, class wrappers, void main(), public static void main(String[] args), top-level code
 * - Types & literals: byte, short, int, long, float, double, boolean, char, String, var, final, numeric underscores (1_000_000), Text Blocks ("""...""")
 * - Operators: arithmetic (with true Java integer division vs floating-point division and char arithmetic), relational, logical (short-circuit &&, ||, !), ternary (? :), compound assignments (+=, -=, *=, /=, %=), ++/--
 * - Control flow: if/else-if/else, switch statements & switch expressions (-> and :, yield), for (with exact init/cond/update token range highlighting), enhanced for-each, while, do-while, break/continue (with labels), return
 * - Arrays: 1D and 2D arrays, initializers, .length, ArrayIndexOutOfBoundsException detection
 * - JDK utilities: IO.println/print/readln, System.out.println/print/printf, Scanner (token & line buffer tracking), String methods (.formatted, .contains, .strip, .replace, .split, etc.), Math, Random, Integer/Double/Boolean/Character
 */

export type StepPhase = 'init' | 'cond' | 'body' | 'update' | 'end' | 'error';

export interface MemEntry {
  key: string;
  value: string;
  type?: string;
  changed: boolean;
}

export interface HighlightRange {
  start: number; // 0-based start char index in normalized line
  end: number;   // 0-based end char index in normalized line
}

export interface TimelineStep {
  index: number;
  lines: number[];
  hl: string | null;
  hlRange?: HighlightRange | null;
  part: StepPhase | string;
  partName: string;
  explanation: string;
  memEntries: MemEntry[];
  inHtml: string;
  outHtml: string;
  outRaw: string;
  isError?: boolean;
}

export interface SimulationResult {
  normalizedLines: string[];
  cleanCode: string;
  timeline: TimelineStep[];
  error?: string;
}

type JavaType =
  | 'byte'
  | 'short'
  | 'int'
  | 'long'
  | 'float'
  | 'double'
  | 'boolean'
  | 'char'
  | 'String'
  | 'Scanner'
  | 'Random'
  | 'null'
  | 'void'
  | string; // e.g. int[], String[][]

interface TypedVal {
  val: any;
  type: JavaType;
}

interface Token {
  type: 'NUMBER' | 'STRING' | 'CHAR' | 'OPERATOR' | 'KEYWORD' | 'IDENT' | 'PUNCT';
  value: any;
  literal?: string;
  numType?: 'int' | 'long' | 'float' | 'double';
  raw: string;
  line: number;
  col: number;
  start: number;
  end: number;
}

interface RawStep {
  lineRaw: string;
  hl: string | null;
  hlRange?: HighlightRange | null;
  part: StepPhase | string;
  partName: string;
  explanation: string;
  memSnapshot: Array<{ key: string; value: string; type?: string }>;
  consumedOffset: number;
  outDelta?: string;
  isError?: boolean;
}

class BreakSignal {
  label: string | null;
  constructor(label: string | null = null) {
    this.label = label;
  }
}

class ContinueSignal {
  label: string | null;
  constructor(label: string | null = null) {
    this.label = label;
  }
}

class YieldSignal {
  value: TypedVal;
  constructor(value: TypedVal) {
    this.value = value;
  }
}

class ReturnSignal {
  value?: TypedVal;
  constructor(value?: TypedVal) {
    this.value = value;
  }
}

class StepperRuntimeError extends Error {
  line: number;
  hl?: string;
  hlRange?: HighlightRange | null;
  constructor(message: string, line: number, hl?: string, hlRange?: HighlightRange | null) {
    super(message);
    this.name = 'StepperRuntimeError';
    this.line = line;
    this.hl = hl;
    this.hlRange = hlRange;
  }
}

const PRIMITIVE_AND_STRING_TYPES = new Set([
  'byte', 'short', 'int', 'long', 'float', 'double', 'boolean', 'char', 'String'
]);

const INT_TYPES = new Set(['byte', 'short', 'int', 'long']);
const FLOAT_TYPES = new Set(['float', 'double']);

export function escapeHtml(text: string): string {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function normalizeCodeLines(code: string): string[] {
  const rawLines = code.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');

  while (rawLines.length > 0 && rawLines[0].trim() === '') rawLines.shift();
  while (rawLines.length > 0 && rawLines[rawLines.length - 1].trim() === '') rawLines.pop();

  if (rawLines.length === 0) return [];

  let minIndent = Infinity;
  rawLines.forEach((line) => {
    if (line.trim().length > 0) {
      const m = line.match(/^[ \t]*/);
      const indent = m ? m[0].length : 0;
      if (indent < minIndent) minIndent = indent;
    }
  });

  if (minIndent === Infinity || minIndent === 0) return rawLines;

  return rawLines.map((line) => (line.length >= minIndent ? line.substring(minIndent) : line));
}

function stripTextBlockIndent(rawBlock: string): string {
  let content = rawBlock.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  // Strip everything on the first line up to and including the first newline
  const firstNl = content.indexOf('\n');
  if (firstNl !== -1) {
    content = content.substring(firstNl + 1);
  }
  const lines = content.split('\n');
  let minIndent = Infinity;
  lines.forEach((line, idx) => {
    // Last line (closing """ line) also determines incidental whitespace even if blank
    if (line.trim().length > 0 || idx === lines.length - 1) {
      const m = line.match(/^[ \t]*/);
      const indent = m ? m[0].length : 0;
      if (indent < minIndent) minIndent = indent;
    }
  });
  if (minIndent === Infinity) minIndent = 0;
  return lines
    .map((line) => (line.length >= minIndent ? line.substring(minIndent).replace(/[ \t]+$/, '') : ''))
    .join('\n');
}

function unescapeJavaString(raw: string): string {
  let out = '';
  for (let i = 0; i < raw.length; i++) {
    if (raw[i] === '\\' && i + 1 < raw.length) {
      const next = raw[i + 1];
      switch (next) {
        case 'n': out += '\n'; break;
        case 't': out += '\t'; break;
        case 'r': out += '\r'; break;
        case '"': out += '"'; break;
        case "'": out += "'"; break;
        case '\\': out += '\\'; break;
        case 's': out += ' '; break;
        case '0': out += '\0'; break;
        default: out += next; break;
      }
      i++;
    } else {
      out += raw[i];
    }
  }
  return out;
}

export function formatJavaString(template: string, args: any[]): string {
  let argIdx = 0;
  return template.replace(/%(%|n|([+-0# ]*)(\d+)?(?:\.(\d+))?([sdfcbSDFCBxX]))/g, (match, spec, flags = '', widthStr, precStr, conv) => {
    if (spec === '%') return '%';
    if (spec === 'n') return '\n';
    const rawArg = argIdx < args.length ? args[argIdx++] : undefined;
    const arg = rawArg && typeof rawArg === 'object' && 'val' in rawArg ? rawArg.val : rawArg;
    const width = widthStr ? parseInt(widthStr, 10) : 0;
    const prec = precStr !== undefined ? parseInt(precStr, 10) : undefined;
    const leftAlign = flags.includes('-');
    const zeroPad = flags.includes('0') && !leftAlign;
    const plusSign = flags.includes('+');

    let formatted = '';
    const convLower = conv.toLowerCase();
    if (convLower === 's') {
      formatted = arg === null || arg === undefined ? 'null' : String(arg);
      if (prec !== undefined && formatted.length > prec) {
        formatted = formatted.substring(0, prec);
      }
      if (conv === 'S') formatted = formatted.toUpperCase();
    } else if (convLower === 'd') {
      const num = Math.trunc(Number(arg) || 0);
      formatted = (plusSign && num >= 0 ? '+' : '') + String(num);
    } else if (convLower === 'x') {
      const num = Math.trunc(Number(arg) || 0);
      formatted = (num >>> 0).toString(16);
      if (conv === 'X') formatted = formatted.toUpperCase();
    } else if (convLower === 'f') {
      const num = Number(arg) || 0;
      const decimals = prec !== undefined ? prec : 6;
      formatted = (plusSign && num >= 0 ? '+' : '') + num.toFixed(decimals);
    } else if (convLower === 'c') {
      formatted = typeof arg === 'number' ? String.fromCharCode(arg) : String(arg ?? '').charAt(0);
      if (conv === 'C') formatted = formatted.toUpperCase();
    } else if (convLower === 'b') {
      formatted = String(Boolean(arg));
      if (conv === 'B') formatted = formatted.toUpperCase();
    } else {
      return match;
    }

    if (width > formatted.length) {
      const padLen = width - formatted.length;
      const padChar = zeroPad && (convLower === 'd' || convLower === 'f' || convLower === 'x') ? '0' : ' ';
      if (leftAlign) {
        formatted = formatted + ' '.repeat(padLen);
      } else if (padChar === '0' && (formatted.startsWith('-') || formatted.startsWith('+'))) {
        formatted = formatted[0] + '0'.repeat(padLen) + formatted.substring(1);
      } else {
        formatted = padChar.repeat(padLen) + formatted;
      }
    }
    return formatted;
  });
}

function javaSplit(str: string, delim: string): string[] {
  if (delim === '') return Array.from(str);
  let parts: string[];
  try {
    parts = str.split(new RegExp(delim));
  } catch {
    parts = str.split(delim);
  }
  // Java String.split(regex) discards trailing empty strings by default
  while (parts.length > 0 && parts[parts.length - 1] === '') {
    parts.pop();
  }
  return parts;
}

function renderInputConsoleHtml(fullInput: string, consumedOffset: number): string {
  if (!fullInput) return '';
  const cleanInput = fullInput.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const rawLines = cleanInput.split('\n');
  // Remove a single trailing empty line if input ended with \n
  const hasTrailingNewline = cleanInput.endsWith('\n');
  const lines = hasTrailingNewline && rawLines.length > 1 && rawLines[rawLines.length - 1] === ''
    ? rawLines.slice(0, -1)
    : rawLines;

  let pos = 0;
  return lines.map((lineText) => {
    const lineStart = pos;
    const lineEnd = lineStart + lineText.length;
    pos = lineEnd + 1; // +1 for \n

    if (consumedOffset <= lineStart) {
      return `<div class="in-line">${escapeHtml(lineText) || '&nbsp;'}</div>`;
    }
    if (consumedOffset >= lineEnd) {
      return `<div class="in-line consumed">${escapeHtml(lineText) || '&nbsp;'}</div>`;
    }
    const splitAt = consumedOffset - lineStart;
    const consumedPart = lineText.substring(0, splitAt);
    const pendingPart = lineText.substring(splitAt);
    return `<div class="in-line"><span class="in-part-consumed">${escapeHtml(consumedPart)}</span><span class="in-part-pending">${escapeHtml(pendingPart)}</span></div>`;
  }).join('');
}

export function simulateJavaCode(rawCode: string, rawInput: string = ''): SimulationResult {
  const normalizedLines = normalizeCodeLines(rawCode);
  const cleanCode = normalizedLines.join('\n');

  if (!cleanCode.trim()) {
    return {
      normalizedLines: [],
      cleanCode: '',
      timeline: [],
      error: 'El código está vacío.'
    };
  }

  const fullInput = (rawInput || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  let inputPos = 0;
  let readPromptsThisStep: string[] = [];
  let readValuesThisStep: string[] = [];

  const rawSteps: RawStep[] = [];
  const MAX_STEPS = 500;

  // Scope stack: array of maps from outer to inner scopes
  interface VarEntry {
    val: any;
    type: JavaType;
  }
  const scopeStack: Array<Map<string, VarEntry>> = [new Map()];

  function currentScope(): Map<string, VarEntry> {
    return scopeStack[scopeStack.length - 1];
  }

  function pushScope(): void {
    scopeStack.push(new Map());
  }

  function popScope(): void {
    if (scopeStack.length > 1) {
      scopeStack.pop();
    }
  }

  function findVar(name: string): VarEntry | undefined {
    for (let i = scopeStack.length - 1; i >= 0; i--) {
      const entry = scopeStack[i].get(name);
      if (entry !== undefined) return entry;
    }
    return undefined;
  }

  function declareVar(name: string, val: any, type: JavaType): void {
    currentScope().set(name, { val, type });
  }

  function setVar(name: string, val: any, fallbackType?: JavaType): VarEntry {
    for (let i = scopeStack.length - 1; i >= 0; i--) {
      if (scopeStack[i].has(name)) {
        const existing = scopeStack[i].get(name)!;
        const coerced = coerceType(val, existing.type);
        existing.val = coerced;
        return existing;
      }
    }
    const t = fallbackType || inferJavaType({ val, type: 'int' });
    const coerced = coerceType(val, t);
    const entry = { val: coerced, type: t };
    currentScope().set(name, entry);
    return entry;
  }

  function getDefaultValue(type: JavaType): any {
    switch (type) {
      case 'byte':
      case 'short':
      case 'int':
      case 'long':
        return 0;
      case 'float':
      case 'double':
        return 0.0;
      case 'boolean':
        return false;
      case 'char':
        return '\0';
      default:
        return null;
    }
  }

  function toChar(val: any): string {
    if (typeof val === 'number') return String.fromCharCode(val & 0xffff);
    if (typeof val === 'string') return val.length > 0 ? val[0] : '\0';
    return '\0';
  }

  function toInt(val: any, fromType?: JavaType): number {
    if (fromType === 'char' || (typeof val === 'string' && val.length === 1 && fromType !== 'String')) {
      return val.charCodeAt(0);
    }
    const n = Number(val);
    if (isNaN(n)) return 0;
    return Math.trunc(n);
  }

  function coerceType(val: any, type: JavaType): any {
    if (val === null || val === undefined) {
      if (type === 'String' || type.endsWith('[]') || type === 'Scanner' || type === 'Random') return null;
      return getDefaultValue(type);
    }
    switch (type) {
      case 'byte':
        return (toInt(val) << 24) >> 24;
      case 'short':
        return (toInt(val) << 16) >> 16;
      case 'int':
        return toInt(val) | 0;
      case 'long':
        return toInt(val);
      case 'float':
      case 'double':
        if (typeof val === 'string' && val.length === 1) {
          return val.charCodeAt(0);
        }
        return Number(val) || 0.0;
      case 'boolean':
        return Boolean(val);
      case 'char':
        return toChar(val);
      case 'String':
        return String(val);
      default:
        return val;
    }
  }

  function inferJavaType(tv: TypedVal): JavaType {
    if (tv.type && tv.type !== 'null') return tv.type;
    const v = tv.val;
    if (typeof v === 'boolean') return 'boolean';
    if (typeof v === 'number') return Number.isInteger(v) ? 'int' : 'double';
    if (typeof v === 'string') return 'String';
    if (Array.isArray(v)) return 'int[]';
    return 'String';
  }

  function formatValue(v: any, type?: JavaType): string {
    if (Array.isArray(v)) {
      const subType = type ? type.replace(/\[\]$/, '') : undefined;
      return `[${v.map((item) => formatValue(item, subType)).join(', ')}]`;
    }
    if (v === null || v === undefined) return 'null';
    if (type === 'char') {
      if (v === '\0') return "'\\0'";
      if (v === '\n') return "'\\n'";
      if (v === '\t') return "'\\t'";
      return `'${v}'`;
    }
    if (type === 'String' || (typeof v === 'string' && type !== 'char')) {
      return `"${v}"`;
    }
    if (typeof v === 'number') {
      if ((type === 'double' || type === 'float') && Number.isInteger(v)) {
        return `${v}.0`;
      }
      return String(v);
    }
    if (typeof v === 'boolean') {
      return String(v);
    }
    return String(v);
  }

  function formatForPrint(tv: TypedVal): string {
    if (tv.val === null || tv.val === undefined) return 'null';
    if (tv.type === 'char') return String(tv.val);
    if (FLOAT_TYPES.has(tv.type) && typeof tv.val === 'number' && Number.isInteger(tv.val)) {
      return `${tv.val}.0`;
    }
    if (Array.isArray(tv.val)) {
      return formatValue(tv.val, tv.type);
    }
    return String(tv.val);
  }

  function getMemSnapshot(): Array<{ key: string; value: string; type?: string }> {
    const map = new Map<string, { value: string; type?: string }>();
    for (const s of scopeStack) {
      s.forEach((entry, k) => {
        if (k === 'scanner' || k === 'sc' || entry.type === 'Scanner' || entry.type === 'Random') return;
        map.set(k, {
          value: formatValue(entry.val, entry.type),
          type: entry.type
        });
      });
    }
    const res: Array<{ key: string; value: string; type?: string }> = [];
    map.forEach((v, k) => {
      res.push({ key: k, value: v.value, type: v.type });
    });
    return res;
  }

  function pushStep(step: {
    lineRaw: string;
    hl: string | null;
    hlRange?: HighlightRange | null;
    part: StepPhase | string;
    partName: string;
    explanation: string;
    outDelta?: string;
    isError?: boolean;
  }): void {
    let outDelta = step.outDelta || '';
    if (readPromptsThisStep.length > 0) {
      outDelta = readPromptsThisStep.join('') + outDelta;
    }
    rawSteps.push({
      lineRaw: step.lineRaw,
      hl: step.hl,
      hlRange: step.hlRange ?? null,
      part: step.part,
      partName: step.partName,
      explanation: step.explanation,
      memSnapshot: getMemSnapshot(),
      consumedOffset: inputPos,
      outDelta: outDelta || undefined,
      isError: step.isError
    });
    readPromptsThisStep = [];
    readValuesThisStep = [];
  }

  // --- Input reading helpers (Scanner & IO.readln) ---
  function readNextLineFromBuffer(): string {
    if (inputPos >= fullInput.length) {
      readValuesThisStep.push('');
      return '';
    }
    const nlIdx = fullInput.indexOf('\n', inputPos);
    let lineStr: string;
    if (nlIdx !== -1) {
      lineStr = fullInput.substring(inputPos, nlIdx);
      inputPos = nlIdx + 1;
    } else {
      lineStr = fullInput.substring(inputPos);
      inputPos = fullInput.length;
    }
    readValuesThisStep.push(lineStr);
    return lineStr;
  }

  function peekNextTokenInBuffer(): { token: string; nextPos: number } | null {
    let p = inputPos;
    while (p < fullInput.length && /[ \t\r\n]/.test(fullInput[p])) {
      p++;
    }
    if (p >= fullInput.length) return null;
    const start = p;
    while (p < fullInput.length && !/[ \t\r\n]/.test(fullInput[p])) {
      p++;
    }
    return { token: fullInput.substring(start, p), nextPos: p };
  }

  function readNextTokenFromBuffer(): string {
    const found = peekNextTokenInBuffer();
    if (!found) {
      readValuesThisStep.push('');
      return '';
    }
    inputPos = found.nextPos;
    // If the rest of the line up to \n is only spaces/tabs and ends with \n, keep inputPos right after the token
    readValuesThisStep.push(found.token);
    return found.token;
  }

  const scannerObj = {
    __type: 'Scanner',
    nextLine: (): TypedVal => ({ val: readNextLineFromBuffer(), type: 'String' }),
    next: (): TypedVal => ({ val: readNextTokenFromBuffer(), type: 'String' }),
    nextInt: (lineNum = 1): TypedVal => {
      const raw = readNextTokenFromBuffer();
      if (raw === '') return { val: 0, type: 'int' };
      const parsed = Number(raw);
      if (isNaN(parsed) || !Number.isInteger(parsed)) {
        throw new StepperRuntimeError(`InputMismatchException: Se esperaba un entero (int) pero se leyó "${raw}"`, lineNum);
      }
      return { val: Math.trunc(parsed), type: 'int' };
    },
    nextLong: (lineNum = 1): TypedVal => {
      const raw = readNextTokenFromBuffer();
      if (raw === '') return { val: 0, type: 'long' };
      const parsed = Number(raw);
      if (isNaN(parsed) || !Number.isInteger(parsed)) {
        throw new StepperRuntimeError(`InputMismatchException: Se esperaba un entero largo (long) pero se leyó "${raw}"`, lineNum);
      }
      return { val: Math.trunc(parsed), type: 'long' };
    },
    nextShort: (lineNum = 1): TypedVal => ({ val: scannerObj.nextInt(lineNum).val, type: 'short' }),
    nextByte: (lineNum = 1): TypedVal => ({ val: scannerObj.nextInt(lineNum).val, type: 'byte' }),
    nextDouble: (lineNum = 1): TypedVal => {
      const raw = readNextTokenFromBuffer();
      if (raw === '') return { val: 0.0, type: 'double' };
      const normalized = raw.replace(',', '.');
      const parsed = Number(normalized);
      if (isNaN(parsed)) {
        throw new StepperRuntimeError(`InputMismatchException: Se esperaba un número decimal (double) pero se leyó "${raw}"`, lineNum);
      }
      return { val: parsed, type: 'double' };
    },
    nextFloat: (lineNum = 1): TypedVal => ({ val: scannerObj.nextDouble(lineNum).val, type: 'float' }),
    nextBoolean: (lineNum = 1): TypedVal => {
      const raw = readNextTokenFromBuffer().trim().toLowerCase();
      if (raw === '') return { val: false, type: 'boolean' };
      if (raw !== 'true' && raw !== 'false') {
        throw new StepperRuntimeError(`InputMismatchException: Se esperaba un booleano (true/false) pero se leyó "${raw}"`, lineNum);
      }
      return { val: raw === 'true', type: 'boolean' };
    },
    hasNext: (): TypedVal => ({ val: peekNextTokenInBuffer() !== null, type: 'boolean' }),
    hasNextLine: (): TypedVal => ({ val: inputPos < fullInput.length, type: 'boolean' }),
    hasNextInt: (): TypedVal => {
      const pk = peekNextTokenInBuffer();
      if (!pk) return { val: false, type: 'boolean' };
      const n = Number(pk.token);
      return { val: !isNaN(n) && Number.isInteger(n), type: 'boolean' };
    },
    hasNextDouble: (): TypedVal => {
      const pk = peekNextTokenInBuffer();
      if (!pk) return { val: false, type: 'boolean' };
      const n = Number(pk.token.replace(',', '.'));
      return { val: !isNaN(n), type: 'boolean' };
    },
    useLocale: () => ({ val: scannerObj, type: 'Scanner' }),
    close: () => ({ val: null, type: 'void' })
  };

  // Deterministic pseudo-random generator for reproducible stepping in the debugger
  let rngSeed = 123456789;
  function nextPseudoRandom(): number {
    rngSeed = (1664525 * rngSeed + 1013904223) >>> 0;
    return rngSeed / 4294967296;
  }

  const randomObj = {
    __type: 'Random',
    nextInt: (...args: number[]): TypedVal => {
      if (args.length === 0) {
        return { val: Math.floor(nextPseudoRandom() * 2147483647), type: 'int' };
      }
      if (args.length === 1) {
        const bound = Math.max(1, Math.trunc(args[0]));
        return { val: Math.floor(nextPseudoRandom() * bound), type: 'int' };
      }
      const origin = Math.trunc(args[0]);
      const bound = Math.trunc(args[1]);
      const span = Math.max(1, bound - origin);
      return { val: origin + Math.floor(nextPseudoRandom() * span), type: 'int' };
    },
    nextDouble: (...args: number[]): TypedVal => {
      if (args.length === 0) return { val: nextPseudoRandom(), type: 'double' };
      if (args.length === 1) return { val: nextPseudoRandom() * Number(args[0]), type: 'double' };
      const origin = Number(args[0]);
      const bound = Number(args[1]);
      return { val: origin + nextPseudoRandom() * (bound - origin), type: 'double' };
    },
    nextBoolean: (): TypedVal => ({ val: nextPseudoRandom() >= 0.5, type: 'boolean' })
  };

  // Pre-populate implicit `scanner` for snippets that use `scanner.nextInt()` without declaring it
  declareVar('scanner', scannerObj, 'Scanner');

  // --- 1. Tokenizer ---
  function tokenize(code: string): Token[] {
    const tokens: Token[] = [];
    let i = 0;
    let line = 1;
    let col = 1;

    const KEYWORDS = new Set([
      'byte', 'short', 'int', 'double', 'float', 'long', 'boolean', 'String', 'char', 'var', 'final', 'void',
      'public', 'private', 'protected', 'static', 'class', 'import', 'package',
      'if', 'else', 'switch', 'case', 'default', 'break', 'continue', 'yield',
      'for', 'while', 'do', 'new', 'return', 'true', 'false', 'null'
    ]);

    while (i < code.length) {
      const ch = code[i];

      if (ch === '\n') {
        line++;
        col = 1;
        i++;
        continue;
      }
      if (ch === '\r') {
        i++;
        continue;
      }
      if (/\s/.test(ch)) {
        col++;
        i++;
        continue;
      }

      // Single-line comment
      if (ch === '/' && code[i + 1] === '/') {
        i += 2;
        col += 2;
        while (i < code.length && code[i] !== '\n') {
          i++;
          col++;
        }
        continue;
      }

      // Multi-line comment
      if (ch === '/' && code[i + 1] === '*') {
        i += 2;
        col += 2;
        while (i < code.length - 1 && !(code[i] === '*' && code[i + 1] === '/')) {
          if (code[i] === '\n') {
            line++;
            col = 1;
          } else {
            col++;
          }
          i++;
        }
        i += 2;
        col += 2;
        continue;
      }

      const startLine = line;
      const startCol = col;
      const startIdx = i;

      // Text Block """..."""
      if (ch === '"' && code[i + 1] === '"' && code[i + 2] === '"') {
        i += 3;
        col += 3;
        let rawBlock = '';
        while (i < code.length && !(code[i] === '"' && code[i + 1] === '"' && code[i + 2] === '"')) {
          if (code[i] === '\\' && i + 1 < code.length) {
            rawBlock += code[i] + code[i + 1];
            if (code[i + 1] === '\n') {
              line++;
              col = 1;
            } else {
              col += 2;
            }
            i += 2;
          } else {
            if (code[i] === '\n') {
              line++;
              col = 1;
            } else {
              col++;
            }
            rawBlock += code[i];
            i++;
          }
        }
        if (i < code.length) {
          i += 3;
          col += 3;
        }
        const stripped = stripTextBlockIndent(rawBlock);
        const strVal = unescapeJavaString(stripped);
        const rawTok = code.substring(startIdx, i);
        tokens.push({
          type: 'STRING',
          value: rawTok,
          literal: strVal,
          raw: rawTok,
          line: startLine,
          col: startCol,
          start: startIdx,
          end: i
        });
        continue;
      }

      // String literal "..."
      if (ch === '"') {
        let rawStr = '';
        i++;
        col++;
        while (i < code.length && code[i] !== '"' && code[i] !== '\n') {
          if (code[i] === '\\' && i + 1 < code.length) {
            rawStr += code[i] + code[i + 1];
            i += 2;
            col += 2;
          } else {
            rawStr += code[i];
            i++;
            col++;
          }
        }
        if (i < code.length && code[i] === '"') {
          i++;
          col++;
        }
        const rawTok = code.substring(startIdx, i);
        tokens.push({
          type: 'STRING',
          value: rawTok,
          literal: unescapeJavaString(rawStr),
          raw: rawTok,
          line: startLine,
          col: startCol,
          start: startIdx,
          end: i
        });
        continue;
      }

      // Character literal '...'
      if (ch === "'") {
        let rawChar = '';
        i++;
        col++;
        while (i < code.length && code[i] !== "'" && code[i] !== '\n') {
          if (code[i] === '\\' && i + 1 < code.length) {
            rawChar += code[i] + code[i + 1];
            i += 2;
            col += 2;
          } else {
            rawChar += code[i];
            i++;
            col++;
          }
        }
        if (i < code.length && code[i] === "'") {
          i++;
          col++;
        }
        const unescaped = unescapeJavaString(rawChar);
        const rawTok = code.substring(startIdx, i);
        tokens.push({
          type: 'CHAR',
          value: rawTok,
          literal: unescaped.length > 0 ? unescaped[0] : '\0',
          raw: rawTok,
          line: startLine,
          col: startCol,
          start: startIdx,
          end: i
        });
        continue;
      }

      // Number literal (supports underscores like 1_000_000 and 14_000.0)
      if (/[0-9]/.test(ch)) {
        let numStr = '';
        while (i < code.length && /[0-9._]/.test(code[i])) {
          numStr += code[i];
          i++;
          col++;
        }
        if (i < code.length && /[eE]/.test(code[i])) {
          numStr += code[i];
          i++;
          col++;
          if (i < code.length && /[+-]/.test(code[i])) {
            numStr += code[i];
            i++;
            col++;
          }
          while (i < code.length && /[0-9_]/.test(code[i])) {
            numStr += code[i];
            i++;
            col++;
          }
        }
        let suffix = '';
        if (i < code.length && /[fFdDlL]/.test(code[i])) {
          suffix = code[i].toLowerCase();
          numStr += code[i];
          i++;
          col++;
        }
        const cleanNum = numStr.replace(/_/g, '').replace(/[fFdDlL]$/, '');
        const isFloat = cleanNum.includes('.') || cleanNum.toLowerCase().includes('e') || suffix === 'f' || suffix === 'd';
        const numType: 'int' | 'long' | 'float' | 'double' = isFloat
          ? (suffix === 'f' ? 'float' : 'double')
          : (suffix === 'l' ? 'long' : 'int');
        tokens.push({
          type: 'NUMBER',
          value: isFloat ? parseFloat(cleanNum) : parseInt(cleanNum, 10),
          numType,
          raw: numStr,
          line: startLine,
          col: startCol,
          start: startIdx,
          end: i
        });
        continue;
      }

      // Multi-char operators
      const twoChar = code.substr(i, 2);
      if (
        twoChar === '->' || twoChar === '++' || twoChar === '--' ||
        twoChar === '==' || twoChar === '!=' || twoChar === '<=' ||
        twoChar === '>=' || twoChar === '&&' || twoChar === '||' ||
        twoChar === '+=' || twoChar === '-=' || twoChar === '*=' ||
        twoChar === '/=' || twoChar === '%='
      ) {
        tokens.push({
          type: 'OPERATOR',
          value: twoChar,
          raw: twoChar,
          line: startLine,
          col: startCol,
          start: startIdx,
          end: i + 2
        });
        i += 2;
        col += 2;
        continue;
      }

      // Identifier or keyword
      if (/[a-zA-Z_$]/.test(ch)) {
        let ident = '';
        while (i < code.length && /[a-zA-Z0-9_$]/.test(code[i])) {
          ident += code[i];
          i++;
          col++;
        }
        tokens.push({
          type: KEYWORDS.has(ident) ? 'KEYWORD' : 'IDENT',
          value: ident,
          raw: ident,
          line: startLine,
          col: startCol,
          start: startIdx,
          end: i
        });
        continue;
      }

      tokens.push({
        type: 'PUNCT',
        value: ch,
        raw: ch,
        line: startLine,
        col: startCol,
        start: startIdx,
        end: i + 1
      });
      i++;
      col++;
    }

    return tokens;
  }

  const allTokens = tokenize(cleanCode);

  function getRawSlice(startTok?: Token | null, endTok?: Token | null): string {
    if (!startTok) return '';
    if (!endTok) endTok = startTok;
    return cleanCode.substring(startTok.start, endTok.end).trim();
  }

  function getRangeOnSingleLine(startTok?: Token | null, endTok?: Token | null): HighlightRange | null {
    if (!startTok) return null;
    if (!endTok) endTok = startTok;
    if (startTok.line !== endTok.line) {
      return {
        start: startTok.col - 1,
        end: normalizedLines[startTok.line - 1]?.length ?? startTok.col
      };
    }
    return {
      start: startTok.col - 1,
      end: (endTok.col - 1) + endTok.raw.length
    };
  }

  // --- 2. Recursive-Descent Expression Evaluator ---
  function evaluateTokens(tokens: Token[], currentLine = 1): TypedVal {
    if (!tokens || tokens.length === 0) return { val: true, type: 'boolean' };
    let idx = 0;

    function pk(offset = 0): Token | null {
      return tokens[idx + offset] || null;
    }

    function next(): Token | null {
      return tokens[idx++] || null;
    }

    function matchVal(v: string): boolean {
      if (pk() && pk()!.value === v) {
        idx++;
        return true;
      }
      return false;
    }

    function parseExpr(): TypedVal {
      return parseAssignment();
    }

    function parseAssignment(): TypedVal {
      // Check for variable or array element assignment: ident op expr or ident[i] op expr
      const savedIdx = idx;
      const first = pk();
      if (first && first.type === 'IDENT') {
        const nextTok = pk(1);
        if (nextTok && ['=', '+=', '-=', '*=', '/=', '%='].includes(nextTok.value)) {
          const varName = next()!.value;
          const op = next()!.value;
          const rhs = parseAssignment();
          return applyVarAssignment(varName, op, rhs);
        }
      }
      idx = savedIdx;
      return parseTernary();
    }

    function applyVarAssignment(varName: string, op: string, rhs: TypedVal): TypedVal {
      const existing = findVar(varName);
      const targetType = existing ? existing.type : inferJavaType(rhs);
      let newVal: any;
      if (op === '=') {
        newVal = coerceType(rhs.val, targetType);
      } else {
        const curVal = existing ? existing.val : getDefaultValue(targetType);
        if (op === '+=' && targetType === 'String') {
          newVal = String(curVal ?? 'null') + formatForPrint(rhs);
        } else {
          const a = toNumeric(curVal, targetType);
          const b = toNumeric(rhs.val, rhs.type);
          if (op === '+=') newVal = coerceType(a + b, targetType);
          else if (op === '-=') newVal = coerceType(a - b, targetType);
          else if (op === '*=') newVal = coerceType(a * b, targetType);
          else if (op === '/=') {
            if (b === 0 && INT_TYPES.has(targetType)) {
              throw new StepperRuntimeError('ArithmeticException: División por cero (/ by zero)', currentLine);
            }
            newVal = coerceType(INT_TYPES.has(targetType) ? Math.trunc(a / b) : a / b, targetType);
          } else if (op === '%=') {
            if (b === 0 && INT_TYPES.has(targetType)) {
              throw new StepperRuntimeError('ArithmeticException: División por cero (% by zero)', currentLine);
            }
            newVal = coerceType(a % b, targetType);
          }
        }
      }
      setVar(varName, newVal, targetType);
      return { val: newVal, type: targetType };
    }

    function parseTernary(): TypedVal {
      const cond = parseLogicalOr();
      if (matchVal('?')) {
        // Collect true branch tokens up to matching ':'
        let depth = 0;
        const trueToks: Token[] = [];
        while (pk()) {
          const t = pk()!;
          if (t.value === '?' || t.value === '(' || t.value === '[') depth++;
          else if (t.value === ')' || t.value === ']') depth--;
          else if (t.value === ':') {
            if (depth === 0) break;
            depth--;
          }
          trueToks.push(next()!);
        }
        matchVal(':');
        const falseToks = tokens.slice(idx);
        idx = tokens.length;
        if (Boolean(cond.val)) {
          return evaluateTokens(trueToks, currentLine);
        } else {
          return evaluateTokens(falseToks, currentLine);
        }
      }
      return cond;
    }

    function parseLogicalOr(): TypedVal {
      let left = parseLogicalAnd();
      while (pk() && pk()!.value === '||') {
        next(); // consume ||
        if (Boolean(left.val)) {
          // Short-circuit: skip right operand of || without evaluating!
          skipLogicalAndTokens();
          left = { val: true, type: 'boolean' };
        } else {
          const right = parseLogicalAnd();
          left = { val: Boolean(right.val), type: 'boolean' };
        }
      }
      return left;
    }

    function skipLogicalAndTokens(): void {
      let depth = 0;
      while (pk()) {
        const t = pk()!;
        if (t.value === '(' || t.value === '[' || t.value === '{') depth++;
        else if (t.value === ')' || t.value === ']' || t.value === '}') {
          if (depth === 0) break;
          depth--;
        } else if (depth === 0 && (t.value === '||' || t.value === '?' || t.value === ':' || t.value === ',')) {
          break;
        }
        next();
      }
    }

    function parseLogicalAnd(): TypedVal {
      let left = parseEquality();
      while (pk() && pk()!.value === '&&') {
        next(); // consume &&
        if (!Boolean(left.val)) {
          // Short-circuit: skip right operand of && without evaluating!
          skipEqualityTokens();
          left = { val: false, type: 'boolean' };
        } else {
          const right = parseEquality();
          left = { val: Boolean(right.val), type: 'boolean' };
        }
      }
      return left;
    }

    function skipEqualityTokens(): void {
      let depth = 0;
      while (pk()) {
        const t = pk()!;
        if (t.value === '(' || t.value === '[' || t.value === '{') depth++;
        else if (t.value === ')' || t.value === ']' || t.value === '}') {
          if (depth === 0) break;
          depth--;
        } else if (depth === 0 && (t.value === '&&' || t.value === '||' || t.value === '?' || t.value === ':' || t.value === ',')) {
          break;
        }
        next();
      }
    }

    function parseEquality(): TypedVal {
      let left = parseRelational();
      while (pk() && (pk()!.value === '==' || pk()!.value === '!=')) {
        const op = next()!.value;
        const right = parseRelational();
        let eq: boolean;
        if ((left.type === 'char' && INT_TYPES.has(right.type)) || (right.type === 'char' && INT_TYPES.has(left.type))) {
          eq = toNumeric(left.val, left.type) === toNumeric(right.val, right.type);
        } else {
          eq = left.val === right.val;
        }
        left = { val: op === '==' ? eq : !eq, type: 'boolean' };
      }
      return left;
    }

    function parseRelational(): TypedVal {
      let left = parseAdditive();
      while (pk() && ['<', '>', '<=', '>='].includes(pk()!.value)) {
        const op = next()!.value;
        const right = parseAdditive();
        const lv = toNumeric(left.val, left.type);
        const rv = toNumeric(right.val, right.type);
        let res = false;
        if (op === '<') res = lv < rv;
        else if (op === '>') res = lv > rv;
        else if (op === '<=') res = lv <= rv;
        else if (op === '>=') res = lv >= rv;
        left = { val: res, type: 'boolean' };
      }
      return left;
    }

    function toNumeric(val: any, type: JavaType): number {
      if (type === 'char' || (typeof val === 'string' && val.length === 1 && type !== 'String')) {
        return val.charCodeAt(0);
      }
      return Number(val) || 0;
    }

    function isFloating(t1: JavaType, t2: JavaType): boolean {
      return FLOAT_TYPES.has(t1) || FLOAT_TYPES.has(t2);
    }

    function parseAdditive(): TypedVal {
      let left = parseMultiplicative();
      while (pk() && (pk()!.value === '+' || pk()!.value === '-')) {
        const op = next()!.value;
        const right = parseMultiplicative();
        if (op === '+' && (left.type === 'String' || right.type === 'String')) {
          left = {
            val: formatForPrint(left) + formatForPrint(right),
            type: 'String'
          };
        } else {
          const lv = toNumeric(left.val, left.type);
          const rv = toNumeric(right.val, right.type);
          const floatRes = isFloating(left.type, right.type);
          const raw = op === '+' ? lv + rv : lv - rv;
          left = {
            val: floatRes ? raw : Math.trunc(raw),
            type: floatRes ? 'double' : 'int'
          };
        }
      }
      return left;
    }

    function parseMultiplicative(): TypedVal {
      let left = parseUnary();
      while (pk() && (pk()!.value === '*' || pk()!.value === '/' || pk()!.value === '%')) {
        const op = next()!.value;
        const right = parseUnary();
        const lv = toNumeric(left.val, left.type);
        const rv = toNumeric(right.val, right.type);
        const floatRes = isFloating(left.type, right.type);

        if (op === '*') {
          const raw = lv * rv;
          left = {
            val: floatRes ? raw : Math.trunc(raw),
            type: floatRes ? 'double' : 'int'
          };
        } else if (op === '/') {
          if (!floatRes && rv === 0) {
            throw new StepperRuntimeError('ArithmeticException: División por cero (/ by zero)', currentLine);
          }
          const raw = lv / rv;
          left = {
            val: floatRes ? raw : Math.trunc(raw),
            type: floatRes ? 'double' : 'int'
          };
        } else {
          if (!floatRes && rv === 0) {
            throw new StepperRuntimeError('ArithmeticException: División por cero (% by zero)', currentLine);
          }
          const raw = lv % rv;
          left = {
            val: floatRes ? raw : Math.trunc(raw),
            type: floatRes ? 'double' : 'int'
          };
        }
      }
      return left;
    }

    function parseUnary(): TypedVal {
      const t = pk();
      if (!t) return { val: null, type: 'null' };

      // Logical NOT !
      if (t.value === '!') {
        next();
        const operand = parseUnary();
        return { val: !Boolean(operand.val), type: 'boolean' };
      }

      // Unary minus / plus
      if (t.value === '-' || t.value === '+') {
        const op = next()!.value;
        const operand = parseUnary();
        const num = toNumeric(operand.val, operand.type);
        const resType: JavaType = FLOAT_TYPES.has(operand.type) ? operand.type : 'int';
        return { val: op === '-' ? -num : num, type: resType };
      }

      // Prefix ++ / --
      if (t.value === '++' || t.value === '--') {
        const op = next()!.value === '++' ? 1 : -1;
        const identTok = pk();
        if (identTok && identTok.type === 'IDENT') {
          const varName = next()!.value;
          const entry = findVar(varName);
          if (entry) {
            if (entry.type === 'char' && typeof entry.val === 'string') {
              entry.val = String.fromCharCode(entry.val.charCodeAt(0) + op);
            } else {
              entry.val = (Number(entry.val) || 0) + op;
            }
            return { val: entry.val, type: entry.type };
          }
        }
      }

      // Type cast: (int) expr, (double) expr, (char) expr, (String) expr, (boolean) expr
      if (
        t.value === '(' &&
        pk(1) &&
        PRIMITIVE_AND_STRING_TYPES.has(pk(1)!.value) &&
        pk(2) &&
        pk(2)!.value === ')'
      ) {
        next(); // (
        const castType = next()!.value as JavaType;
        next(); // )
        const operand = parseUnary();
        if (castType === 'char') {
          const code = operand.type === 'char' ? operand.val.charCodeAt(0) : Math.trunc(Number(operand.val) || 0);
          return { val: String.fromCharCode(code & 0xffff), type: 'char' };
        }
        if (INT_TYPES.has(castType)) {
          return { val: toInt(operand.val, operand.type), type: castType };
        }
        if (FLOAT_TYPES.has(castType)) {
          return { val: toNumeric(operand.val, operand.type), type: castType };
        }
        return { val: coerceType(operand.val, castType), type: castType };
      }

      return parsePostfix();
    }

    function parsePostfix(): TypedVal {
      let current = parsePrimary();

      while (pk()) {
        const t = pk()!;

        // Array indexing: current[idx]
        if (t.value === '[') {
          next(); // [
          const idxToks: Token[] = [];
          let depth = 1;
          while (pk()) {
            const ct = next()!;
            if (ct.value === '[') depth++;
            else if (ct.value === ']') {
              depth--;
              if (depth === 0) break;
            }
            idxToks.push(ct);
          }
          const idxVal = evaluateTokens(idxToks, currentLine);
          const arrIdx = toInt(idxVal.val, idxVal.type);
          if (!Array.isArray(current.val)) {
            throw new StepperRuntimeError('NullPointerException: El array es null', currentLine);
          }
          if (arrIdx < 0 || arrIdx >= current.val.length) {
            throw new StepperRuntimeError(
              `ArrayIndexOutOfBoundsException: Índice ${arrIdx} fuera de límites para longitud ${current.val.length}`,
              currentLine
            );
          }
          const elemType = current.type.endsWith('[]') ? current.type.slice(0, -2) : 'int';
          current = { val: current.val[arrIdx], type: elemType };
          continue;
        }

        // Member access or method call: .prop or .method(...)
        if (t.value === '.') {
          next(); // .
          const memberTok = next();
          if (!memberTok) break;
          const memberName = memberTok.value;

          if (pk() && pk()!.value === '(') {
            const args = parseArgList();
            current = invokeMethod(current, memberName, args, currentLine);
          } else {
            // Property access
            if (memberName === 'length' && Array.isArray(current.val)) {
              current = { val: current.val.length, type: 'int' };
            } else if (current.val === Math && memberName === 'PI') {
              current = { val: Math.PI, type: 'double' };
            } else if (current.val === Math && memberName === 'E') {
              current = { val: Math.E, type: 'double' };
            } else if (current.val === 'Integer' && memberName === 'MAX_VALUE') {
              current = { val: 2147483647, type: 'int' };
            } else if (current.val === 'Integer' && memberName === 'MIN_VALUE') {
              current = { val: -2147483648, type: 'int' };
            } else if (current.val === 'System' && memberName === 'out') {
              current = { val: 'System.out', type: 'void' };
            } else if (current.val === 'System' && memberName === 'in') {
              current = { val: 'System.in', type: 'void' };
            } else if (current.val && typeof current.val === 'object' && memberName in current.val) {
              current = { val: current.val[memberName], type: 'int' };
            }
          }
          continue;
        }

        break;
      }

      return current;
    }

    function parseArgList(): TypedVal[] {
      matchVal('(');
      const args: TypedVal[] = [];
      let curArgToks: Token[] = [];
      let depthParen = 0;
      let depthBracket = 0;
      let depthBrace = 0;

      while (pk()) {
        const t = next()!;
        if (t.value === '(') {
          depthParen++;
          curArgToks.push(t);
        } else if (t.value === ')') {
          if (depthParen === 0 && depthBracket === 0 && depthBrace === 0) {
            if (curArgToks.length > 0) {
              args.push(evaluateTokens(curArgToks, currentLine));
            }
            break;
          }
          depthParen--;
          curArgToks.push(t);
        } else if (t.value === '[') {
          depthBracket++;
          curArgToks.push(t);
        } else if (t.value === ']') {
          depthBracket--;
          curArgToks.push(t);
        } else if (t.value === '{') {
          depthBrace++;
          curArgToks.push(t);
        } else if (t.value === '}') {
          depthBrace--;
          curArgToks.push(t);
        } else if (t.value === ',' && depthParen === 0 && depthBracket === 0 && depthBrace === 0) {
          args.push(evaluateTokens(curArgToks, currentLine));
          curArgToks = [];
        } else {
          curArgToks.push(t);
        }
      }
      return args;
    }

    function parsePrimary(): TypedVal {
      const t = pk();
      if (!t) return { val: null, type: 'null' };

      if (t.type === 'NUMBER') {
        next();
        return { val: t.value, type: t.numType || 'int' };
      }

      if (t.type === 'STRING') {
        next();
        return { val: t.literal ?? '', type: 'String' };
      }

      if (t.type === 'CHAR') {
        next();
        return { val: t.literal ?? '\0', type: 'char' };
      }

      if (t.value === 'true' || t.value === 'false') {
        next();
        return { val: t.value === 'true', type: 'boolean' };
      }

      if (t.value === 'null') {
        next();
        return { val: null, type: 'null' };
      }

      // Parenthesized expression
      if (t.value === '(') {
        next(); // (
        const innerToks: Token[] = [];
        let depth = 1;
        while (pk()) {
          const ct = next()!;
          if (ct.value === '(') depth++;
          else if (ct.value === ')') {
            depth--;
            if (depth === 0) break;
          }
          innerToks.push(ct);
        }
        return evaluateTokens(innerToks, currentLine);
      }

      // Array literal { ... }
      if (t.value === '{') {
        const litToks: Token[] = [next()!];
        let depth = 1;
        while (pk()) {
          const ct = next()!;
          litToks.push(ct);
          if (ct.value === '{') depth++;
          else if (ct.value === '}') {
            depth--;
            if (depth === 0) break;
          }
        }
        return evaluateArrayInitializerTokens(litToks, 'int', 1, currentLine);
      }

      // `new` expression: new Scanner(...), new Random(...), new int[n], new int[r][c], new int[]{...}
      if (t.value === 'new') {
        next(); // new
        const typeTok = next();
        if (!typeTok) return { val: null, type: 'null' };
        const baseType = typeTok.value;

        if (baseType === 'Scanner') {
          if (pk() && pk()!.value === '(') parseArgList();
          return { val: scannerObj, type: 'Scanner' };
        }

        if (baseType === 'Random') {
          if (pk() && pk()!.value === '(') parseArgList();
          return { val: randomObj, type: 'Random' };
        }

        // Array allocation: new Type[dim1] or new Type[dim1][dim2] or new Type[]{...}
        const dims: Array<Token[] | null> = [];
        while (pk() && pk()!.value === '[') {
          next(); // [
          const dimToks: Token[] = [];
          let depth = 1;
          while (pk()) {
            const ct = next()!;
            if (ct.value === '[') depth++;
            else if (ct.value === ']') {
              depth--;
              if (depth === 0) break;
            }
            dimToks.push(ct);
          }
          dims.push(dimToks.length > 0 ? dimToks : null);
        }

        if (pk() && pk()!.value === '{') {
          const litToks: Token[] = [next()!];
          let depth = 1;
          while (pk()) {
            const ct = next()!;
            litToks.push(ct);
            if (ct.value === '{') depth++;
            else if (ct.value === '}') {
              depth--;
              if (depth === 0) break;
            }
          }
          return evaluateArrayInitializerTokens(litToks, baseType, dims.length || 1, currentLine);
        }

        if (dims.length === 1 && dims[0]) {
          const lenVal = evaluateTokens(dims[0], currentLine);
          const len = Math.max(0, toInt(lenVal.val, lenVal.type));
          const defVal = getDefaultValue(baseType);
          return {
            val: Array.from({ length: len }, () => defVal),
            type: `${baseType}[]`
          };
        }

        if (dims.length === 2 && dims[0]) {
          const rowsVal = evaluateTokens(dims[0], currentLine);
          const rows = Math.max(0, toInt(rowsVal.val, rowsVal.type));
          if (dims[1]) {
            const colsVal = evaluateTokens(dims[1], currentLine);
            const cols = Math.max(0, toInt(colsVal.val, colsVal.type));
            const defVal = getDefaultValue(baseType);
            return {
              val: Array.from({ length: rows }, () => Array.from({ length: cols }, () => defVal)),
              type: `${baseType}[][]`
            };
          }
          return {
            val: Array.from({ length: rows }, () => null),
            type: `${baseType}[][]`
          };
        }

        return { val: null, type: 'null' };
      }

      // Switch expression inside an expression: switch (expr) { ... }
      if (t.value === 'switch') {
        const switchToks: Token[] = [next()!];
        // Consume (...)
        if (pk() && pk()!.value === '(') {
          switchToks.push(next()!);
          let d = 1;
          while (pk() && d > 0) {
            const ct = next()!;
            switchToks.push(ct);
            if (ct.value === '(') d++;
            else if (ct.value === ')') d--;
          }
        }
        // Consume {...}
        if (pk() && pk()!.value === '{') {
          switchToks.push(next()!);
          let d = 1;
          while (pk() && d > 0) {
            const ct = next()!;
            switchToks.push(ct);
            if (ct.value === '{') d++;
            else if (ct.value === '}') d--;
          }
        }
        return evaluateInlineSwitchTokens(switchToks);
      }

      // Built-in classes or standalone functions or variables
      if (t.type === 'IDENT' || t.type === 'KEYWORD') {
        const name = next()!.value;

        // Standalone function calls: println(...), print(...), readln(...)
        if (pk() && pk()!.value === '(') {
          const args = parseArgList();
          if (name === 'println' || name === 'print') {
            const msg = args.length > 0 ? formatForPrint(args[0]) : '';
            return { val: msg + (name === 'println' ? '\n' : ''), type: 'String' };
          }
          if (name === 'readln') {
            if (args.length > 0 && args[0].val !== undefined && args[0].val !== null && args[0].val !== '') {
              readPromptsThisStep.push(String(args[0].val));
            }
            return { val: readNextLineFromBuffer(), type: 'String' };
          }
        }

        // Postfix ++ / -- on a simple variable
        if (pk() && (pk()!.value === '++' || pk()!.value === '--')) {
          const op = next()!.value === '++' ? 1 : -1;
          const entry = findVar(name);
          if (entry) {
            const oldVal = entry.val;
            if (entry.type === 'char' && typeof entry.val === 'string') {
              entry.val = String.fromCharCode(entry.val.charCodeAt(0) + op);
            } else {
              entry.val = (Number(entry.val) || 0) + op;
            }
            return { val: oldVal, type: entry.type };
          }
        }

        // Variable in scope
        const vEntry = findVar(name);
        if (vEntry !== undefined) {
          return { val: vEntry.val, type: vEntry.type };
        }

        // Built-in class identifiers
        if (name === 'Math') return { val: Math, type: 'Math' };
        if (name === 'IO') return { val: 'IO', type: 'IO' };
        if (name === 'System') return { val: 'System', type: 'System' };
        if (['Integer', 'Double', 'Float', 'Long', 'Short', 'Byte', 'Boolean', 'Character', 'String', 'Arrays', 'Locale'].includes(name)) {
          return { val: name, type: name };
        }

        return { val: undefined, type: 'null' };
      }

      next();
      return { val: null, type: 'null' };
    }

    return parseExpr();
  }

  function invokeMethod(target: TypedVal, methodName: string, args: TypedVal[], lineNum: number): TypedVal {
    // 1. IO methods
    if (target.val === 'IO') {
      if (methodName === 'readln') {
        if (args.length > 0 && args[0].val !== undefined && args[0].val !== null && args[0].val !== '') {
          readPromptsThisStep.push(String(args[0].val));
        }
        return { val: readNextLineFromBuffer(), type: 'String' };
      }
      if (methodName === 'println' || methodName === 'print') {
        const msg = args.length > 0 ? formatForPrint(args[0]) : '';
        return { val: msg + (methodName === 'println' ? '\n' : ''), type: 'String' };
      }
    }

    // 2. System.out methods
    if (target.val === 'System.out') {
      if (methodName === 'println' || methodName === 'print') {
        const msg = args.length > 0 ? formatForPrint(args[0]) : '';
        return { val: msg + (methodName === 'println' ? '\n' : ''), type: 'String' };
      }
      if (methodName === 'printf' || methodName === 'format') {
        const tpl = args.length > 0 ? String(args[0].val ?? '') : '';
        const formatted = formatJavaString(tpl, args.slice(1));
        return { val: formatted, type: 'String' };
      }
    }

    // 3. Scanner methods
    if (target.type === 'Scanner' || (target.val && target.val.__type === 'Scanner')) {
      const fn = (scannerObj as any)[methodName];
      if (typeof fn === 'function') {
        return fn(lineNum);
      }
    }

    // 4. Random methods
    if (target.type === 'Random' || (target.val && target.val.__type === 'Random')) {
      const fn = (randomObj as any)[methodName];
      if (typeof fn === 'function') {
        return fn(...args.map((a) => a.val));
      }
    }

    // 5. Math static methods
    if (target.val === Math || target.type === 'Math') {
      const a0 = args[0] ? Number(args[0].val) : 0;
      const a1 = args[1] ? Number(args[1].val) : 0;
      switch (methodName) {
        case 'sqrt': return { val: Math.sqrt(a0), type: 'double' };
        case 'pow': return { val: Math.pow(a0, a1), type: 'double' };
        case 'abs': {
          const isFloat = args[0] && FLOAT_TYPES.has(args[0].type);
          return { val: Math.abs(a0), type: isFloat ? 'double' : 'int' };
        }
        case 'max': {
          const isFloat = (args[0] && FLOAT_TYPES.has(args[0].type)) || (args[1] && FLOAT_TYPES.has(args[1].type));
          return { val: Math.max(a0, a1), type: isFloat ? 'double' : 'int' };
        }
        case 'min': {
          const isFloat = (args[0] && FLOAT_TYPES.has(args[0].type)) || (args[1] && FLOAT_TYPES.has(args[1].type));
          return { val: Math.min(a0, a1), type: isFloat ? 'double' : 'int' };
        }
        case 'round': return { val: Math.round(a0), type: 'long' };
        case 'floor': return { val: Math.floor(a0), type: 'double' };
        case 'ceil': return { val: Math.ceil(a0), type: 'double' };
        case 'random': return { val: nextPseudoRandom(), type: 'double' };
        case 'sin': return { val: Math.sin(a0), type: 'double' };
        case 'cos': return { val: Math.cos(a0), type: 'double' };
        case 'tan': return { val: Math.tan(a0), type: 'double' };
        case 'log': return { val: Math.log(a0), type: 'double' };
        case 'log10': return { val: Math.log10(a0), type: 'double' };
        case 'hypot': return { val: Math.hypot(a0, a1), type: 'double' };
      }
    }

    // 6. Wrapper classes (Integer, Double, Float, Long, Short, Byte, Boolean, Character, String, Arrays)
    if (target.val === 'Integer' || target.val === 'Long' || target.val === 'Short' || target.val === 'Byte') {
      const s = String(args[0]?.val ?? '').trim();
      if (methodName === 'parseInt' || methodName === 'parseLong' || methodName === 'parseShort' || methodName === 'parseByte' || methodName === 'valueOf') {
        const radix = args[1] ? Number(args[1].val) : 10;
        const parsed = parseInt(s, radix);
        if (isNaN(parsed) || (radix === 10 && !/^[+-]?\d+$/.test(s))) {
          throw new StepperRuntimeError(`NumberFormatException: No se puede convertir "${s}" a entero`, lineNum);
        }
        return { val: parsed, type: target.val === 'Long' ? 'long' : 'int' };
      }
      if (methodName === 'toString') return { val: String(args[0]?.val ?? ''), type: 'String' };
      if (methodName === 'max') return { val: Math.max(Number(args[0]?.val), Number(args[1]?.val)), type: 'int' };
      if (methodName === 'min') return { val: Math.min(Number(args[0]?.val), Number(args[1]?.val)), type: 'int' };
    }

    if (target.val === 'Double' || target.val === 'Float') {
      const s = String(args[0]?.val ?? '').trim();
      if (methodName === 'parseDouble' || methodName === 'parseFloat' || methodName === 'valueOf') {
        const parsed = Number(s);
        if (isNaN(parsed) || s === '') {
          throw new StepperRuntimeError(`NumberFormatException: No se puede convertir "${s}" a decimal`, lineNum);
        }
        return { val: parsed, type: target.val === 'Float' ? 'float' : 'double' };
      }
      if (methodName === 'toString') return { val: String(args[0]?.val ?? ''), type: 'String' };
    }

    if (target.val === 'Boolean') {
      const s = String(args[0]?.val ?? '').trim().toLowerCase();
      if (methodName === 'parseBoolean' || methodName === 'valueOf') {
        return { val: s === 'true', type: 'boolean' };
      }
    }

    if (target.val === 'Character') {
      const ch = String(args[0]?.val ?? '')[0] || '\0';
      switch (methodName) {
        case 'isDigit': return { val: /^[0-9]$/.test(ch), type: 'boolean' };
        case 'isLetter': return { val: /^[a-zA-ZÀ-ÿ]$/.test(ch), type: 'boolean' };
        case 'isLetterOrDigit': return { val: /^[a-zA-Z0-9À-ÿ]$/.test(ch), type: 'boolean' };
        case 'isUpperCase': return { val: ch === ch.toUpperCase() && ch !== ch.toLowerCase(), type: 'boolean' };
        case 'isLowerCase': return { val: ch === ch.toLowerCase() && ch !== ch.toUpperCase(), type: 'boolean' };
        case 'isWhitespace': return { val: /^\s$/.test(ch), type: 'boolean' };
        case 'toUpperCase': return { val: ch.toUpperCase(), type: 'char' };
        case 'toLowerCase': return { val: ch.toLowerCase(), type: 'char' };
        case 'getNumericValue': return { val: parseInt(ch, 36) || -1, type: 'int' };
        case 'toString': return { val: ch, type: 'String' };
      }
    }

    if (target.val === 'String') {
      if (methodName === 'valueOf') return { val: args[0] ? formatForPrint(args[0]) : 'null', type: 'String' };
      if (methodName === 'format') {
        const tpl = String(args[0]?.val ?? '');
        return { val: formatJavaString(tpl, args.slice(1)), type: 'String' };
      }
      if (methodName === 'join') {
        const delim = String(args[0]?.val ?? '');
        if (args[1] && Array.isArray(args[1].val)) {
          return { val: args[1].val.join(delim), type: 'String' };
        }
        return { val: args.slice(1).map((a) => String(a.val)).join(delim), type: 'String' };
      }
    }

    if (target.val === 'Arrays') {
      const arr = args[0]?.val;
      if (methodName === 'toString' || methodName === 'deepToString') {
        return { val: formatValue(arr, args[0]?.type), type: 'String' };
      }
      if (methodName === 'sort' && Array.isArray(arr)) {
        arr.sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
        return { val: null, type: 'void' };
      }
      if (methodName === 'fill' && Array.isArray(arr)) {
        arr.fill(args[1]?.val);
        return { val: null, type: 'void' };
      }
      if (methodName === 'equals' && Array.isArray(arr) && Array.isArray(args[1]?.val)) {
        const b = args[1].val;
        const eq = arr.length === b.length && arr.every((v, i) => v === b[i]);
        return { val: eq, type: 'boolean' };
      }
    }

    // 7. String instance methods (Unitat 4)
    if (target.type === 'String' || typeof target.val === 'string') {
      if (target.val === null || target.val === undefined) {
        throw new StepperRuntimeError('NullPointerException: La cadena (String) es null', lineNum);
      }
      const str = String(target.val);
      switch (methodName) {
        case 'length':
          return { val: str.length, type: 'int' };
        case 'charAt': {
          const i = toInt(args[0]?.val, args[0]?.type);
          if (i < 0 || i >= str.length) {
            throw new StepperRuntimeError(
              `StringIndexOutOfBoundsException: Índice ${i} fuera de límites para longitud ${str.length}`,
              lineNum
            );
          }
          return { val: str.charAt(i), type: 'char' };
        }
        case 'toUpperCase':
          return { val: str.toUpperCase(), type: 'String' };
        case 'toLowerCase':
          return { val: str.toLowerCase(), type: 'String' };
        case 'trim':
        case 'strip':
          return { val: str.trim(), type: 'String' };
        case 'stripLeading':
          return { val: str.trimStart(), type: 'String' };
        case 'stripTrailing':
          return { val: str.trimEnd(), type: 'String' };
        case 'substring': {
          const start = toInt(args[0]?.val, args[0]?.type);
          const end = args[1] !== undefined ? toInt(args[1].val, args[1].type) : str.length;
          if (start < 0 || end > str.length || start > end) {
            throw new StepperRuntimeError(
              `StringIndexOutOfBoundsException: substring(${start}, ${end}) fuera de límites para longitud ${str.length}`,
              lineNum
            );
          }
          return { val: str.substring(start, end), type: 'String' };
        }
        case 'contains':
          return { val: str.includes(String(args[0]?.val ?? '')), type: 'boolean' };
        case 'startsWith':
          return { val: str.startsWith(String(args[0]?.val ?? '')), type: 'boolean' };
        case 'endsWith':
          return { val: str.endsWith(String(args[0]?.val ?? '')), type: 'boolean' };
        case 'replace': {
          const oldStr = String(args[0]?.val ?? '');
          const newStr = String(args[1]?.val ?? '');
          return { val: str.split(oldStr).join(newStr), type: 'String' };
        }
        case 'replaceAll': {
          const regex = String(args[0]?.val ?? '');
          const newStr = String(args[1]?.val ?? '');
          return { val: str.replace(new RegExp(regex, 'g'), newStr), type: 'String' };
        }
        case 'replaceFirst': {
          const regex = String(args[0]?.val ?? '');
          const newStr = String(args[1]?.val ?? '');
          return { val: str.replace(new RegExp(regex), newStr), type: 'String' };
        }
        case 'repeat': {
          const count = Math.max(0, toInt(args[0]?.val, args[0]?.type));
          return { val: str.repeat(count), type: 'String' };
        }
        case 'equals':
          return {
            val: args[0]?.val !== null && args[0]?.val !== undefined && str === String(args[0].val),
            type: 'boolean'
          };
        case 'equalsIgnoreCase':
          return {
            val: args[0]?.val !== null && args[0]?.val !== undefined && str.toLowerCase() === String(args[0].val).toLowerCase(),
            type: 'boolean'
          };
        case 'compareTo': {
          const other = String(args[0]?.val ?? '');
          return { val: str === other ? 0 : (str < other ? -1 : 1), type: 'int' };
        }
        case 'compareToIgnoreCase': {
          const a = str.toLowerCase();
          const b = String(args[0]?.val ?? '').toLowerCase();
          return { val: a === b ? 0 : (a < b ? -1 : 1), type: 'int' };
        }
        case 'split': {
          const delim = String(args[0]?.val ?? '');
          return { val: javaSplit(str, delim), type: 'String[]' };
        }
        case 'formatted':
          return { val: formatJavaString(str, args), type: 'String' };
        case 'indexOf': {
          const arg0 = args[0];
          const sub = arg0 && INT_TYPES.has(arg0.type)
            ? String.fromCharCode(Number(arg0.val))
            : String(arg0?.val ?? '');
          const from = args[1] !== undefined ? toInt(args[1].val, args[1].type) : 0;
          return { val: str.indexOf(sub, from), type: 'int' };
        }
        case 'lastIndexOf': {
          const arg0 = args[0];
          const sub = arg0 && INT_TYPES.has(arg0.type)
            ? String.fromCharCode(Number(arg0.val))
            : String(arg0?.val ?? '');
          const from = args[1] !== undefined ? toInt(args[1].val, args[1].type) : undefined;
          return { val: from !== undefined ? str.lastIndexOf(sub, from) : str.lastIndexOf(sub), type: 'int' };
        }
        case 'isEmpty':
          return { val: str.length === 0, type: 'boolean' };
        case 'isBlank':
          return { val: str.trim().length === 0, type: 'boolean' };
        case 'toCharArray':
          return { val: Array.from(str), type: 'char[]' };
      }
    }

    return { val: null, type: 'null' };
  }

  function evaluateArrayInitializerTokens(litToks: Token[], elemType: JavaType, dims: number, lineNum: number): TypedVal {
    // Strip outer { and }
    let inner = litToks;
    if (inner.length >= 2 && inner[0].value === '{' && inner[inner.length - 1].value === '}') {
      inner = inner.slice(1, -1);
    }
    if (inner.length === 0) {
      return { val: [], type: `${elemType}${'[]'.repeat(dims)}` };
    }

    // Split top-level items by comma
    const items: Token[][] = [];
    let cur: Token[] = [];
    let dParen = 0;
    let dBrace = 0;
    let dBracket = 0;
    for (const tok of inner) {
      if (tok.value === '(') dParen++;
      else if (tok.value === ')') dParen--;
      else if (tok.value === '{') dBrace++;
      else if (tok.value === '}') dBrace--;
      else if (tok.value === '[') dBracket++;
      else if (tok.value === ']') dBracket--;
      else if (tok.value === ',' && dParen === 0 && dBrace === 0 && dBracket === 0) {
        if (cur.length > 0) items.push(cur);
        cur = [];
        continue;
      }
      cur.push(tok);
    }
    if (cur.length > 0) items.push(cur);

    if (dims === 2) {
      const rows = items.map((rowToks) => evaluateArrayInitializerTokens(rowToks, elemType, 1, lineNum).val);
      return { val: rows, type: `${elemType}[][]` };
    }

    const vals = items.map((itemToks) => {
      const tv = evaluateTokens(itemToks, lineNum);
      return coerceType(tv.val, elemType);
    });
    return { val: vals, type: `${elemType}[]` };
  }

  function evaluateInlineSwitchTokens(switchToks: Token[]): TypedVal {
    const savedPos = pos;
    const savedAll = allTokens.slice();
    // Parse switch node from switchToks using a local parser state
    const switchNode = parseSwitchFromTokens(switchToks);
    const sig = executeNode(switchNode);
    pos = savedPos;
    void savedAll;
    if (sig instanceof YieldSignal) {
      return sig.value;
    }
    return { val: null, type: 'null' };
  }

  // --- 3. Statement Parser ---
  let pos = 0;

  function peek(offset = 0): Token | null {
    return allTokens[pos + offset] || null;
  }

  function consume(expectedValue: string | null = null): Token | null {
    const tok = allTokens[pos];
    if (!tok) return null;
    if (expectedValue !== null && tok.value !== expectedValue) {
      throw new Error(`Error de sintaxis en la línea ${tok.line}: se esperaba '${expectedValue}' pero se encontró '${tok.value}'`);
    }
    pos++;
    return tok;
  }

  function parseSwitchFromTokens(tokList: Token[]): any {
    const prevPos = pos;
    // Temporarily parse from tokList
    const origLen = allTokens.length;
    const backup = allTokens.splice(0, origLen, ...tokList);
    pos = 0;
    try {
      return parseSwitchStatement();
    } finally {
      allTokens.splice(0, allTokens.length, ...backup);
      pos = prevPos;
    }
  }

  function parseSwitchStatement(): any {
    const switchTok = consume('switch')!;
    consume('(');
    const exprTokens: Token[] = [];
    let depth = 1;
    while (peek()) {
      const t = consume()!;
      if (t.value === '(') depth++;
      else if (t.value === ')') {
        depth--;
        if (depth === 0) break;
      }
      exprTokens.push(t);
    }
    const exprRaw = getRawSlice(exprTokens[0], exprTokens[exprTokens.length - 1]);

    consume('{');
    const cases: any[] = [];

    while (peek() && peek()!.value !== '}') {
      const cTok = peek()!;
      if (cTok.value === 'case' || cTok.value === 'default') {
        const isCase = cTok.value === 'case';
        consume();
        const matchTokensList: Token[][] = [];
        const matchRaws: string[] = [];
        if (isCase) {
          let valTokens: Token[] = [];
          let dParen = 0;
          while (peek() && !(dParen === 0 && (peek()!.value === ':' || peek()!.value === '->'))) {
            const pkTok = peek()!;
            if (pkTok.value === '(') dParen++;
            else if (pkTok.value === ')') dParen--;
            if (pkTok.value === ',' && dParen === 0) {
              if (valTokens.length > 0) {
                matchTokensList.push(valTokens);
                matchRaws.push(getRawSlice(valTokens[0], valTokens[valTokens.length - 1]));
              }
              valTokens = [];
              consume(',');
            } else {
              valTokens.push(consume()!);
            }
          }
          if (valTokens.length > 0) {
            matchTokensList.push(valTokens);
            matchRaws.push(getRawSlice(valTokens[0], valTokens[valTokens.length - 1]));
          }
        }

        const arrowOrColon = consume()!;
        const isArrow = arrowOrColon.value === '->';

        const caseStatements: any[] = [];
        if (isArrow) {
          if (peek() && peek()!.value === '{') {
            caseStatements.push(parseStatement());
          } else {
            const stmtTokens: Token[] = [];
            let dP = 0;
            let dB = 0;
            while (peek() && !(dP === 0 && dB === 0 && (peek()!.value === ';' || peek()!.value === '}'))) {
              const t = consume()!;
              if (t.value === '(') dP++;
              else if (t.value === ')') dP--;
              else if (t.value === '{') dB++;
              else if (t.value === '}') dB--;
              stmtTokens.push(t);
            }
            if (peek() && peek()!.value === ';') consume(';');
            const stmtRaw = getRawSlice(stmtTokens[0], stmtTokens[stmtTokens.length - 1]);
            caseStatements.push({
              type: 'ArrowExpression',
              line: stmtTokens[0]?.line || arrowOrColon.line,
              tokens: stmtTokens,
              hlRange: getRangeOnSingleLine(stmtTokens[0], stmtTokens[stmtTokens.length - 1]),
              raw: stmtRaw
            });
          }
        } else {
          while (peek() && peek()!.value !== 'case' && peek()!.value !== 'default' && peek()!.value !== '}') {
            const st = parseStatement();
            if (st) caseStatements.push(st);
          }
        }

        cases.push({
          isDefault: !isCase,
          line: cTok.line,
          matchTokensList,
          matchValues: matchRaws,
          isArrow,
          statements: caseStatements,
          hlRange: getRangeOnSingleLine(cTok, arrowOrColon),
          raw: getRawSlice(cTok, arrowOrColon)
        });
      } else {
        consume();
      }
    }

    const closeTok = consume('}');

    return {
      type: 'SwitchStatement',
      line: switchTok.line,
      exprTokens,
      exprRaw,
      cases,
      hlRange: getRangeOnSingleLine(switchTok, exprTokens[exprTokens.length - 1]),
      raw: getRawSlice(switchTok, closeTok)
    };
  }

  function parseStatement(): any {
    const tok = peek();
    if (!tok) return null;

    // Skip stray semicolons
    if (tok.value === ';') {
      consume(';');
      return null;
    }

    // 1. Skip package and import declarations
    if (tok.value === 'package' || tok.value === 'import') {
      while (peek() && peek()!.value !== ';') {
        consume();
      }
      if (peek() && peek()!.value === ';') consume(';');
      return null;
    }

    // 2. Unwrap class declarations: [public|private|protected] [final|abstract] class ClassName { ... }
    if (
      tok.value === 'class' ||
      (
        ['public', 'private', 'protected', 'final', 'abstract'].includes(tok.value) &&
        (peek(1)?.value === 'class' || peek(2)?.value === 'class')
      )
    ) {
      while (peek() && peek()!.value !== '{') consume();
      if (peek() && peek()!.value === '{') {
        consume('{');
        const classStmts: any[] = [];
        while (peek() && peek()!.value !== '}') {
          const s = parseStatement();
          if (s) classStmts.push(s);
        }
        if (peek() && peek()!.value === '}') consume('}');
        return {
          type: 'ClassBody',
          statements: classStmts,
          line: tok.line
        };
      }
    }

    // 3. Unwrap main method: [public] [static] void main(...) { ... }
    if (
      tok.value === 'void' ||
      (tok.value === 'static' && peek(1)?.value === 'void') ||
      (tok.value === 'public' && (peek(1)?.value === 'void' || (peek(1)?.value === 'static' && peek(2)?.value === 'void')))
    ) {
      while (peek() && peek()!.value !== '{') consume();
      if (peek() && peek()!.value === '{') {
        const bodyBlock = parseStatement();
        if (bodyBlock && bodyBlock.type === 'Block') {
          bodyBlock.isMainBlock = true;
        }
        return bodyBlock;
      }
    }

    // 4. Label: `labelName:`
    if (tok.type === 'IDENT' && peek(1) && peek(1)!.value === ':' && peek(1)!.type === 'PUNCT') {
      const labelTok = consume()!;
      consume(':');
      const stmt = parseStatement();
      if (stmt) {
        stmt.label = labelTok.value;
        stmt.labelLine = labelTok.line;
      }
      return stmt;
    }

    // 5. Block `{ ... }`
    if (tok.value === '{') {
      const openTok = consume('{')!;
      const statements: any[] = [];
      while (peek() && peek()!.value !== '}') {
        const s = parseStatement();
        if (s) statements.push(s);
      }
      const closeTok = consume('}');
      return {
        type: 'Block',
        statements,
        line: openTok.line,
        raw: getRawSlice(openTok, closeTok)
      };
    }

    // 6. `if` statement
    if (tok.value === 'if') {
      const ifTok = consume('if')!;
      consume('(');
      let depth = 1;
      const condTokens: Token[] = [];
      while (peek()) {
        const t = consume()!;
        if (t.value === '(') depth++;
        else if (t.value === ')') {
          depth--;
          if (depth === 0) break;
        }
        condTokens.push(t);
      }
      const condRaw = getRawSlice(condTokens[0], condTokens[condTokens.length - 1]);
      const condLine = condTokens[0]?.line || ifTok.line;
      const condRange = getRangeOnSingleLine(condTokens[0], condTokens[condTokens.length - 1]);

      const thenBranch = parseStatement();
      let elseBranch = null;

      if (peek() && peek()!.value === 'else') {
        consume('else');
        elseBranch = parseStatement();
      }

      return {
        type: 'IfStatement',
        line: condLine,
        condTokens,
        condRaw,
        condRange,
        thenBranch,
        elseBranch
      };
    }

    // 7. `for` loop (standard `for (init; cond; update)` and enhanced `for (Type x : arr)`)
    if (tok.value === 'for') {
      const forTok = consume('for')!;
      const openParenTok = consume('(')!;

      // Read all header tokens inside (...)
      const headerTokens: Token[] = [];
      let depth = 1;
      let closeParenTok: Token = openParenTok;
      while (peek()) {
        const t = consume()!;
        if (t.value === '(') depth++;
        else if (t.value === ')') {
          depth--;
          if (depth === 0) {
            closeParenTok = t;
            break;
          }
        }
        headerTokens.push(t);
      }

      // Check if it is enhanced for-each: contains top-level ':' and no top-level ';'
      let topColonIdx = -1;
      const topSemiIndices: number[] = [];
      let dP = 0;
      for (let i = 0; i < headerTokens.length; i++) {
        const ht = headerTokens[i];
        if (ht.value === '(' || ht.value === '[' || ht.value === '{') dP++;
        else if (ht.value === ')' || ht.value === ']' || ht.value === '}') dP--;
        else if (dP === 0) {
          if (ht.value === ';') topSemiIndices.push(i);
          else if (ht.value === ':' && topColonIdx === -1) topColonIdx = i;
        }
      }

      const body = parseStatement();

      if (topColonIdx !== -1 && topSemiIndices.length === 0) {
        // Enhanced for-each loop: for ([final] Type varName : iterable)
        const leftToks = headerTokens.slice(0, topColonIdx).filter((t) => t.value !== 'final');
        const rightToks = headerTokens.slice(topColonIdx + 1);
        const varTok = leftToks[leftToks.length - 1];
        const typeToks = leftToks.slice(0, -1);
        const varType = typeToks.map((t) => t.raw).join('') || 'int';
        const varName = varTok ? varTok.value : 'item';
        const iterableRaw = getRawSlice(rightToks[0], rightToks[rightToks.length - 1]);
        const headerRaw = getRawSlice(headerTokens[0], headerTokens[headerTokens.length - 1]);

        return {
          type: 'ForEachStatement',
          line: forTok.line,
          varType,
          varName,
          iterableTokens: rightToks,
          iterableRaw,
          headerRaw,
          hlRange: getRangeOnSingleLine(headerTokens[0], headerTokens[headerTokens.length - 1]),
          body
        };
      }

      // Standard for (init; cond; update)
      const semi1Idx = topSemiIndices[0] ?? headerTokens.length;
      const semi2Idx = topSemiIndices[1] ?? headerTokens.length;

      const initTokens = headerTokens.slice(0, semi1Idx);
      const condTokens = semi1Idx < headerTokens.length ? headerTokens.slice(semi1Idx + 1, semi2Idx) : [];
      const updateTokens = semi2Idx < headerTokens.length ? headerTokens.slice(semi2Idx + 1) : [];

      const semi1Tok = headerTokens[semi1Idx] || openParenTok;
      const semi2Tok = headerTokens[semi2Idx] || closeParenTok;

      const initRaw = getRawSlice(initTokens[0], initTokens[initTokens.length - 1]);
      const condRaw = getRawSlice(condTokens[0], condTokens[condTokens.length - 1]);
      const updateRaw = getRawSlice(updateTokens[0], updateTokens[updateTokens.length - 1]);

      const initLine = initTokens[0]?.line || forTok.line;
      const condLine = condTokens[0]?.line || semi1Tok.line || forTok.line;
      const updateLine = updateTokens[0]?.line || semi2Tok.line || forTok.line;

      const initRange = initTokens.length > 0
        ? getRangeOnSingleLine(initTokens[0], initTokens[initTokens.length - 1])
        : null;

      const condRange = condTokens.length > 0
        ? getRangeOnSingleLine(condTokens[0], condTokens[condTokens.length - 1])
        : getRangeOnSingleLine(semi1Tok, semi2Tok);

      const updateRange = updateTokens.length > 0
        ? getRangeOnSingleLine(updateTokens[0], updateTokens[updateTokens.length - 1])
        : null;

      return {
        type: 'ForStatement',
        line: forTok.line,
        initTokens,
        initRaw,
        initLine,
        initRange,
        condTokens,
        condRaw,
        condLine,
        condRange,
        updateTokens,
        updateRaw,
        updateLine,
        updateRange,
        body
      };
    }

    // 8. `while` loop
    if (tok.value === 'while') {
      const whileTok = consume('while')!;
      consume('(');
      const condTokens: Token[] = [];
      let depth = 1;
      while (peek()) {
        const t = consume()!;
        if (t.value === '(') depth++;
        else if (t.value === ')') {
          depth--;
          if (depth === 0) break;
        }
        condTokens.push(t);
      }
      const condRaw = getRawSlice(condTokens[0], condTokens[condTokens.length - 1]);
      const condLine = condTokens[0]?.line || whileTok.line;
      const condRange = getRangeOnSingleLine(condTokens[0], condTokens[condTokens.length - 1]);
      const body = parseStatement();

      return {
        type: 'WhileStatement',
        line: condLine,
        condTokens,
        condRaw,
        condRange,
        body
      };
    }

    // 9. `do-while` loop
    if (tok.value === 'do') {
      const doTok = consume('do')!;
      const body = parseStatement();
      const whileTok = consume('while')!;
      consume('(');
      const condTokens: Token[] = [];
      let depth = 1;
      while (peek()) {
        const t = consume()!;
        if (t.value === '(') depth++;
        else if (t.value === ')') {
          depth--;
          if (depth === 0) break;
        }
        condTokens.push(t);
      }
      const condRaw = getRawSlice(condTokens[0], condTokens[condTokens.length - 1]);
      const whileLine = condTokens[0]?.line || whileTok.line || doTok.line;
      const condRange = getRangeOnSingleLine(condTokens[0], condTokens[condTokens.length - 1]);
      if (peek() && peek()!.value === ';') consume(';');

      return {
        type: 'DoWhileStatement',
        line: doTok.line,
        whileLine,
        condTokens,
        condRaw,
        condRange,
        body
      };
    }

    // 10. `switch` statement
    if (tok.value === 'switch') {
      return parseSwitchStatement();
    }

    // 11. `break` statement
    if (tok.value === 'break') {
      const breakTok = consume('break')!;
      let targetLabel: string | null = null;
      let endTok = breakTok;
      if (peek() && peek()!.type === 'IDENT') {
        endTok = consume()!;
        targetLabel = endTok.value;
      }
      if (peek() && peek()!.value === ';') consume(';');
      return {
        type: 'BreakStatement',
        line: breakTok.line,
        targetLabel,
        hlRange: getRangeOnSingleLine(breakTok, endTok),
        raw: targetLabel ? `break ${targetLabel}` : 'break'
      };
    }

    // 12. `continue` statement
    if (tok.value === 'continue') {
      const contTok = consume('continue')!;
      let targetLabel: string | null = null;
      let endTok = contTok;
      if (peek() && peek()!.type === 'IDENT') {
        endTok = consume()!;
        targetLabel = endTok.value;
      }
      if (peek() && peek()!.value === ';') consume(';');
      return {
        type: 'ContinueStatement',
        line: contTok.line,
        targetLabel,
        hlRange: getRangeOnSingleLine(contTok, endTok),
        raw: targetLabel ? `continue ${targetLabel}` : 'continue'
      };
    }

    // 13. `return` statement
    if (tok.value === 'return') {
      const retTok = consume('return')!;
      const exprTokens: Token[] = [];
      while (peek() && peek()!.value !== ';') {
        exprTokens.push(consume()!);
      }
      if (peek() && peek()!.value === ';') consume(';');
      const exprRaw = getRawSlice(exprTokens[0], exprTokens[exprTokens.length - 1]);
      const endTok = exprTokens[exprTokens.length - 1] || retTok;
      return {
        type: 'ReturnStatement',
        line: retTok.line,
        exprTokens,
        exprRaw,
        hlRange: getRangeOnSingleLine(retTok, endTok),
        raw: exprRaw ? `return ${exprRaw}` : 'return'
      };
    }

    // 14. `yield` statement
    if (tok.value === 'yield') {
      const yieldTok = consume('yield')!;
      const yieldTokens: Token[] = [];
      while (peek() && peek()!.value !== ';') {
        yieldTokens.push(consume()!);
      }
      if (peek() && peek()!.value === ';') consume(';');
      const exprRaw = getRawSlice(yieldTokens[0], yieldTokens[yieldTokens.length - 1]);
      const endTok = yieldTokens[yieldTokens.length - 1] || yieldTok;
      return {
        type: 'YieldStatement',
        line: yieldTok.line,
        exprTokens: yieldTokens,
        exprRaw,
        hlRange: getRangeOnSingleLine(yieldTok, endTok),
        raw: `yield ${exprRaw}`
      };
    }

    // 15. Variable declaration / assignment / expression statement
    const stmtTokens: Token[] = [];
    const startTok = peek()!;
    let depthParen = 0;
    let depthBrace = 0;
    let depthBracket = 0;

    while (peek()) {
      const t = peek()!;
      if (t.value === '(') depthParen++;
      else if (t.value === ')') depthParen--;
      else if (t.value === '{') depthBrace++;
      else if (t.value === '}') {
        if (depthBrace === 0) break;
        depthBrace--;
      } else if (t.value === '[') depthBracket++;
      else if (t.value === ']') depthBracket--;
      else if (t.value === ';' && depthParen === 0 && depthBrace === 0 && depthBracket === 0) {
        consume(';');
        break;
      }
      stmtTokens.push(consume()!);
    }

    if (stmtTokens.length === 0) return null;

    const endTok = stmtTokens[stmtTokens.length - 1];
    const rawStmt = getRawSlice(startTok, endTok);

    return {
      type: 'ExpressionStatement',
      line: startTok.line,
      tokens: stmtTokens,
      hlRange: getRangeOnSingleLine(startTok, endTok),
      raw: rawStmt
    };
  }

  // --- 4. Execution Engine ---
  function executeStatementList(statements: any[]): any {
    for (const stmt of statements) {
      if (rawSteps.length >= MAX_STEPS) break;
      const res = executeNode(stmt);
      if (
        res instanceof BreakSignal ||
        res instanceof ContinueSignal ||
        res instanceof YieldSignal ||
        res instanceof ReturnSignal
      ) {
        return res;
      }
    }
    return null;
  }

  function executeNode(node: any): any {
    if (!node || rawSteps.length >= MAX_STEPS) return null;

    if (node.type === 'ClassBody') {
      return executeStatementList(node.statements);
    }

    if (node.type === 'Block') {
      const isMain = Boolean(node.isMainBlock);
      if (!isMain) pushScope();
      try {
        return executeStatementList(node.statements);
      } finally {
        if (!isMain) popScope();
      }
    }

    // IfStatement
    if (node.type === 'IfStatement') {
      readValuesThisStep = [];
      readPromptsThisStep = [];
      const condTv = evaluateTokens(node.condTokens, node.line);
      const condVal = Boolean(condTv.val);
      pushStep({
        lineRaw: String(node.line),
        part: 'cond',
        partName: 'Condición (if)',
        hl: node.condRaw,
        hlRange: node.condRange,
        explanation: `Se evalúa la condición <code class="w">${escapeHtml(node.condRaw)}</code>: es <strong>${condVal ? 'verdadera (true)' : 'falsa (false)'}</strong>.`
      });

      if (condVal) {
        return executeNode(node.thenBranch);
      } else if (node.elseBranch) {
        return executeNode(node.elseBranch);
      }
      return null;
    }

    // ForStatement (with exact Init / Cond / Update highlighting)
    if (node.type === 'ForStatement') {
      pushScope(); // Scope for loop variable(s) like `int i = 0`
      try {
        // Phase 1: Inicialización
        if (node.initTokens && node.initTokens.length > 0) {
          const initInfo = executeCommaSeparatedExpressions(node.initTokens, node.initLine, true);
          pushStep({
            lineRaw: String(node.initLine),
            part: 'init',
            partName: 'Inicialización',
            hl: node.initRaw,
            hlRange: node.initRange,
            explanation: initInfo
              ? `Se ejecuta la <strong>inicialización</strong> del bucle (<code class="w">${escapeHtml(node.initRaw)}</code> → ${initInfo}).`
              : `Se ejecuta la <strong>inicialización</strong> del bucle (<code class="w">${escapeHtml(node.initRaw)}</code>).`
          });
        }

        // Loop iterations
        let iteration = 0;
        while (rawSteps.length < MAX_STEPS) {
          iteration++;
          // Phase 2: Comprobación
          readValuesThisStep = [];
          readPromptsThisStep = [];
          const condTv = node.condTokens && node.condTokens.length > 0
            ? evaluateTokens(node.condTokens, node.condLine)
            : { val: true, type: 'boolean' as JavaType };
          const condVal = Boolean(condTv.val);

          if (condVal) {
            const readNote = readValuesThisStep.length > 0
              ? ` (leyendo <code class="w">${escapeHtml(readValuesThisStep.join(', '))}</code> de la entrada)`
              : '';
            pushStep({
              lineRaw: String(node.condLine),
              part: 'cond',
              partName: 'Comprobación',
              hl: node.condRaw || 'true',
              hlRange: node.condRange,
              explanation: iteration === 1
                ? `Se evalúa la <strong>comprobación</strong> del bucle (<code class="w">${escapeHtml(node.condRaw || 'true')}</code>)${readNote}: es <strong>verdadera</strong> (<code>true</code>), comienza la 1.ª iteración.`
                : `Se vuelve a evaluar la <strong>comprobación</strong> (<code class="w">${escapeHtml(node.condRaw || 'true')}</code>)${readNote}: es <strong>verdadera</strong> (<code>true</code>), continúa el bucle.`
            });

            // Phase 3: Cuerpo
            const sig = executeNode(node.body);
            if (sig instanceof ReturnSignal || sig instanceof YieldSignal) {
              return sig;
            }
            if (sig instanceof BreakSignal) {
              if (!sig.label || sig.label === node.label) {
                break;
              }
              return sig;
            }
            if (sig instanceof ContinueSignal) {
              if (sig.label && sig.label !== node.label) {
                return sig;
              }
            }

            // Phase 4: Modificación
            if (node.updateTokens && node.updateTokens.length > 0) {
              const updateInfo = executeCommaSeparatedExpressions(node.updateTokens, node.updateLine, true);
              pushStep({
                lineRaw: String(node.updateLine),
                part: 'update',
                partName: 'Modificación',
                hl: node.updateRaw,
                hlRange: node.updateRange,
                explanation: updateInfo
                  ? `Después de la iteración se ejecuta la <strong>modificación</strong> (<code class="w">${escapeHtml(node.updateRaw)}</code> → ${updateInfo}).`
                  : `Después de la iteración se ejecuta la <strong>modificación</strong> (<code class="w">${escapeHtml(node.updateRaw)}</code>).`
              });
            }
          } else {
            const readNote = readValuesThisStep.length > 0
              ? ` (leyendo <code class="w">${escapeHtml(readValuesThisStep.join(', '))}</code> de la entrada)`
              : '';
            pushStep({
              lineRaw: String(node.condLine),
              part: 'cond',
              partName: 'Comprobación',
              hl: node.condRaw || 'false',
              hlRange: node.condRange,
              explanation: `Se evalúa la <strong>comprobación</strong> (<code class="w">${escapeHtml(node.condRaw)}</code>)${readNote}: es <strong>falsa</strong> (<code>false</code>), termina el bucle.`
            });
            break;
          }
        }
      } finally {
        popScope();
      }
      return null;
    }

    // Enhanced ForEachStatement: for (Type item : iterable)
    if (node.type === 'ForEachStatement') {
      pushScope();
      try {
        const iterTv = evaluateTokens(node.iterableTokens, node.line);
        const arr = Array.isArray(iterTv.val) ? iterTv.val : [];
        declareVar(node.varName, getDefaultValue(node.varType), node.varType);

        for (let i = 0; i < arr.length && rawSteps.length < MAX_STEPS; i++) {
          const coerced = coerceType(arr[i], node.varType);
          setVar(node.varName, coerced, node.varType);
          pushStep({
            lineRaw: String(node.line),
            part: 'cond',
            partName: 'Iteración (for-each)',
            hl: node.headerRaw,
            hlRange: node.hlRange,
            explanation: `Elemento ${i + 1} de ${arr.length}: se asigna <strong>${escapeHtml(formatValue(coerced, node.varType))}</strong> a <code class="w">${escapeHtml(node.varName)}</code>.`
          });

          const sig = executeNode(node.body);
          if (sig instanceof ReturnSignal || sig instanceof YieldSignal) return sig;
          if (sig instanceof BreakSignal) {
            if (!sig.label || sig.label === node.label) break;
            return sig;
          }
          if (sig instanceof ContinueSignal) {
            if (sig.label && sig.label !== node.label) return sig;
          }
        }
      } finally {
        popScope();
      }
      return null;
    }

    // WhileStatement
    if (node.type === 'WhileStatement') {
      let iteration = 0;
      while (rawSteps.length < MAX_STEPS) {
        iteration++;
        readValuesThisStep = [];
        readPromptsThisStep = [];
        const condTv = evaluateTokens(node.condTokens, node.line);
        const condVal = Boolean(condTv.val);
        const readNote = readValuesThisStep.length > 0
          ? ` (leyendo <code class="w">${escapeHtml(readValuesThisStep.join(', '))}</code>)`
          : '';

        if (condVal) {
          pushStep({
            lineRaw: String(node.line),
            part: 'cond',
            partName: 'Comprobación (while)',
            hl: node.condRaw,
            hlRange: node.condRange,
            explanation: iteration === 1
              ? `Se evalúa la <strong>condición</strong> <code class="w">${escapeHtml(node.condRaw)}</code>${readNote}: es <strong>verdadera</strong> (<code>true</code>), entra al bucle.`
              : `Se vuelve a evaluar la <strong>condición</strong> <code class="w">${escapeHtml(node.condRaw)}</code>${readNote}: es <strong>verdadera</strong> (<code>true</code>), continúa el bucle.`
          });

          const sig = executeNode(node.body);
          if (sig instanceof ReturnSignal || sig instanceof YieldSignal) return sig;
          if (sig instanceof BreakSignal) {
            if (!sig.label || sig.label === node.label) break;
            return sig;
          }
          if (sig instanceof ContinueSignal) {
            if (sig.label && sig.label !== node.label) return sig;
            continue;
          }
        } else {
          pushStep({
            lineRaw: String(node.line),
            part: 'cond',
            partName: 'Comprobación (while)',
            hl: node.condRaw,
            hlRange: node.condRange,
            explanation: `Se evalúa la <strong>condición</strong> <code class="w">${escapeHtml(node.condRaw)}</code>${readNote}: es <strong>falsa</strong> (<code>false</code>), termina el bucle.`
          });
          break;
        }
      }
      return null;
    }

    // DoWhileStatement
    if (node.type === 'DoWhileStatement') {
      while (rawSteps.length < MAX_STEPS) {
        const sig = executeNode(node.body);
        if (sig instanceof ReturnSignal || sig instanceof YieldSignal) return sig;
        if (sig instanceof BreakSignal) {
          if (!sig.label || sig.label === node.label) break;
          return sig;
        }
        if (sig instanceof ContinueSignal) {
          if (sig.label && sig.label !== node.label) return sig;
        }

        readValuesThisStep = [];
        readPromptsThisStep = [];
        const condTv = evaluateTokens(node.condTokens, node.whileLine);
        const condVal = Boolean(condTv.val);
        pushStep({
          lineRaw: String(node.whileLine),
          part: 'cond',
          partName: 'Comprobación (do-while)',
          hl: node.condRaw,
          hlRange: node.condRange,
          explanation: `Se evalúa la condición final <code class="w">${escapeHtml(node.condRaw)}</code>: es <strong>${condVal ? 'verdadera (true)' : 'falsa (false)'}</strong>.`
        });
        if (!condVal) break;
      }
      return null;
    }

    // SwitchStatement
    if (node.type === 'SwitchStatement') {
      const switchTv = evaluateTokens(node.exprTokens, node.line);
      pushStep({
        lineRaw: String(node.line),
        part: 'cond',
        partName: 'Switch',
        hl: `switch (${node.exprRaw})`,
        hlRange: node.hlRange,
        explanation: `Se evalúa el selector <code class="w">switch (${escapeHtml(node.exprRaw)})</code> con valor <strong>${escapeHtml(formatValue(switchTv.val, switchTv.type))}</strong>.`
      });

      let matched = false;
      let executing = false;

      for (const c of node.cases) {
        if (rawSteps.length >= MAX_STEPS) break;

        let isMatch = false;
        if (c.isDefault) {
          if (!matched || executing) isMatch = true;
        } else {
          for (const mToks of c.matchTokensList) {
            const mTv = evaluateTokens(mToks, c.line);
            if (mTv.val === switchTv.val) {
              isMatch = true;
              break;
            }
          }
        }

        if (c.isArrow) {
          if (isMatch) {
            matched = true;
            pushStep({
              lineRaw: String(c.line),
              part: 'cond',
              partName: 'Caso (switch)',
              hl: c.raw,
              hlRange: c.hlRange,
              explanation: `Coincide con <code class="w">${escapeHtml(c.raw)}</code>.`
            });

            for (const st of c.statements) {
              if (st.type === 'ArrowExpression') {
                if (st.tokens[0]?.value === 'yield') {
                  const yTv = evaluateTokens(st.tokens.slice(1), st.line);
                  return new YieldSignal(yTv);
                } else if (isPrintOrAssignmentTokens(st.tokens)) {
                  executeExpressionTokens(st.tokens, st.raw, st.line, st.hlRange, false);
                } else {
                  const yTv = evaluateTokens(st.tokens, st.line);
                  return new YieldSignal(yTv);
                }
              } else {
                const sig = executeNode(st);
                if (sig instanceof YieldSignal || sig instanceof ReturnSignal) return sig;
                if (sig instanceof BreakSignal) break;
              }
            }
            break;
          }
        } else {
          if (!executing && isMatch) {
            matched = true;
            executing = true;
            pushStep({
              lineRaw: String(c.line),
              part: 'cond',
              partName: 'Caso (switch)',
              hl: c.raw,
              hlRange: c.hlRange,
              explanation: `Coincide con <code class="w">${escapeHtml(c.raw)}</code>. Comienza la ejecución del caso.`
            });
          }

          if (executing) {
            for (const st of c.statements) {
              const sig = executeNode(st);
              if (sig instanceof ReturnSignal || sig instanceof YieldSignal) return sig;
              if (sig instanceof BreakSignal) {
                if (!sig.label || sig.label === node.label) return null;
                return sig;
              }
            }
          }
        }
      }
      return null;
    }

    // BreakStatement
    if (node.type === 'BreakStatement') {
      pushStep({
        lineRaw: String(node.line),
        part: 'body',
        partName: 'Salto (break)',
        hl: node.raw,
        hlRange: node.hlRange,
        explanation: node.targetLabel
          ? `La instrucción <code class="w">${escapeHtml(node.raw)}</code> detiene el bucle etiquetado como <strong>${escapeHtml(node.targetLabel)}</strong>.`
          : `La instrucción <code class="w">break;</code> detiene el bucle o switch actual.`
      });
      return new BreakSignal(node.targetLabel);
    }

    // ContinueStatement
    if (node.type === 'ContinueStatement') {
      pushStep({
        lineRaw: String(node.line),
        part: 'body',
        partName: 'Salto (continue)',
        hl: node.raw,
        hlRange: node.hlRange,
        explanation: node.targetLabel
          ? `La instrucción <code class="w">${escapeHtml(node.raw)}</code> salta a la siguiente iteración del bucle <strong>${escapeHtml(node.targetLabel)}</strong>.`
          : `La instrucción <code class="w">continue;</code> salta directamente a la siguiente iteración.`
      });
      return new ContinueSignal(node.targetLabel);
    }

    // ReturnStatement
    if (node.type === 'ReturnStatement') {
      const retVal = node.exprTokens && node.exprTokens.length > 0
        ? evaluateTokens(node.exprTokens, node.line)
        : undefined;
      pushStep({
        lineRaw: String(node.line),
        part: 'end',
        partName: 'Retorno (return)',
        hl: node.raw,
        hlRange: node.hlRange,
        explanation: retVal !== undefined
          ? `La instrucción <code class="w">${escapeHtml(node.raw)}</code> finaliza la ejecución devolviendo <strong>${escapeHtml(formatValue(retVal.val, retVal.type))}</strong>.`
          : `La instrucción <code class="w">return;</code> finaliza la ejecución del método <code>main</code>.`
      });
      return new ReturnSignal(retVal);
    }

    // YieldStatement
    if (node.type === 'YieldStatement') {
      const yTv = evaluateTokens(node.exprTokens, node.line);
      pushStep({
        lineRaw: String(node.line),
        part: 'body',
        partName: 'Retorno (yield)',
        hl: node.raw,
        hlRange: node.hlRange,
        explanation: `Se evalúa <code class="w">${escapeHtml(node.raw)}</code> produciendo el valor <strong>${escapeHtml(formatValue(yTv.val, yTv.type))}</strong>.`
      });
      return new YieldSignal(yTv);
    }

    // ExpressionStatement
    if (node.type === 'ExpressionStatement') {
      executeExpressionTokens(node.tokens, node.raw, node.line, node.hlRange, false);
      return null;
    }

    return null;
  }

  function isPrintOrAssignmentTokens(toks: Token[]): boolean {
    if (!toks || toks.length === 0) return false;
    const raw = getRawSlice(toks[0], toks[toks.length - 1]);
    if (/^(?:(?:System\.out|IO)\.)?(?:println|print|printf|format)\s*\(/.test(raw)) return true;
    return toks.some((t) => ['=', '+=', '-=', '*=', '/=', '%=', '++', '--'].includes(t.value));
  }

  function executeCommaSeparatedExpressions(toks: Token[], lineNum: number, silent: boolean): string {
    // Check if starts with a type declaration: [final] Type var1 = val1, var2 = val2
    let idx = 0;
    if (toks[idx]?.value === 'final') idx++;
    const maybeTypeTok = toks[idx];
    const isTypeDecl = maybeTypeTok && (PRIMITIVE_AND_STRING_TYPES.has(maybeTypeTok.value) || maybeTypeTok.value === 'var') && toks[idx + 1]?.type === 'IDENT';

    // Split top-level by comma
    const parts: Token[][] = [];
    let cur: Token[] = [];
    let dP = 0;
    let dB = 0;
    let dK = 0;
    const startIdx = isTypeDecl ? idx + 1 : 0;
    const declaredType = isTypeDecl ? maybeTypeTok.value : null;

    for (let i = startIdx; i < toks.length; i++) {
      const t = toks[i];
      if (t.value === '(') dP++;
      else if (t.value === ')') dP--;
      else if (t.value === '{') dB++;
      else if (t.value === '}') dB--;
      else if (t.value === '[') dK++;
      else if (t.value === ']') dK--;
      else if (t.value === ',' && dP === 0 && dB === 0 && dK === 0) {
        if (cur.length > 0) parts.push(cur);
        cur = [];
        continue;
      }
      cur.push(t);
    }
    if (cur.length > 0) parts.push(cur);

    const summaries: string[] = [];
    for (const partToks of parts) {
      const effectiveToks = declaredType
        ? [{ type: 'KEYWORD', value: declaredType, raw: declaredType, line: lineNum, col: 1, start: 0, end: 0 } as Token, ...partToks]
        : partToks;
      const raw = getRawSlice(partToks[0], partToks[partToks.length - 1]);
      const info = executeExpressionTokens(effectiveToks, raw, lineNum, getRangeOnSingleLine(partToks[0], partToks[partToks.length - 1]), silent);
      if (info) summaries.push(info);
    }
    return summaries.join(', ');
  }

  function executeExpressionTokens(
    toks: Token[],
    rawStmt: string,
    lineNum: number,
    hlRange: HighlightRange | null | undefined,
    silent: boolean
  ): string {
    if (!toks || toks.length === 0) return '';
    const s = rawStmt.replace(/;$/, '').trim();

    readValuesThisStep = [];
    readPromptsThisStep = [];

    // Strip leading `final` modifier if present
    let cleanToks = toks;
    if (cleanToks[0]?.value === 'final') {
      cleanToks = cleanToks.slice(1);
    }
    if (cleanToks.length === 0) return '';

    // A. Output: print / println / printf / System.out.println / IO.println
    const printMatch = s.match(/^(?:(?:System\.out|IO)\.)?(println|print|printf|format)\s*\(([\s\S]*)\)$/);
    if (printMatch) {
      const fnName = printMatch[1];
      const tv = evaluateTokens(cleanToks, lineNum);
      const outStr = String(tv.val ?? '');
      const displayVal = outStr.replace(/\n$/, '');
      if (!silent) {
        pushStep({
          lineRaw: String(lineNum),
          part: 'body',
          partName: 'Salida',
          hl: s,
          hlRange,
          outDelta: outStr,
          explanation: displayVal !== ''
            ? `Se ejecuta <code class="w">${escapeHtml(s)}</code>, mostrando <code class="w">${escapeHtml(displayVal)}</code> por consola.`
            : `Se ejecuta <code class="w">${escapeHtml(s)}</code> (salto de línea por consola).`
        });
      }
      void fnName;
      return '';
    }

    // B. Scanner or Random declaration: Scanner sc = new Scanner(System.in); / Random r = new Random();
    if ((cleanToks[0]?.value === 'Scanner' || cleanToks[0]?.value === 'Random') && cleanToks[1]?.type === 'IDENT') {
      const objType = cleanToks[0].value as 'Scanner' | 'Random';
      const varName = cleanToks[1].value;
      declareVar(varName, objType === 'Scanner' ? scannerObj : randomObj, objType);
      if (!silent) {
        pushStep({
          lineRaw: String(lineNum),
          part: 'body',
          partName: 'Instrucción',
          hl: s,
          hlRange,
          explanation: objType === 'Scanner'
            ? `Se inicializa el lector <code>Scanner</code> (<code class="w">${escapeHtml(varName)}</code>) conectado a la entrada estándar.`
            : `Se inicializa el generador de números aleatorios <code>Random</code> (<code class="w">${escapeHtml(varName)}</code>).`
        });
      }
      return '';
    }

    // C. 2D Array element assignment or increment/decrement: m[r][c] = val; m[r][c]++;
    const array2dAssignMatch = s.match(/^([a-zA-Z_$][a-zA-Z0-9_$]*)\[([^\]]+)\]\[([^\]]+)\]\s*(=|\+=|-=|\*=|\/=|%=)\s*([\s\S]+)$/);
    if (array2dAssignMatch) {
      // Split carefully by top-level brackets
      const parsed2D = parseArrayElementTarget(cleanToks, 2);
      if (parsed2D && parsed2D.op && parsed2D.rhsToks) {
        const { arrName, idxToksList, op, rhsToks } = parsed2D;
        const r = toInt(evaluateTokens(idxToksList[0], lineNum).val);
        const c = toInt(evaluateTokens(idxToksList[1], lineNum).val);
        const arrEntry = findVar(arrName);
        if (!arrEntry || !Array.isArray(arrEntry.val)) {
          throw new StepperRuntimeError(`NullPointerException: La matriz '${arrName}' es null`, lineNum, s, hlRange);
        }
        if (r < 0 || r >= arrEntry.val.length) {
          throw new StepperRuntimeError(
            `ArrayIndexOutOfBoundsException: Fila ${r} fuera de límites para longitud ${arrEntry.val.length}`,
            lineNum, s, hlRange
          );
        }
        const rowArr = arrEntry.val[r];
        if (!Array.isArray(rowArr)) {
          throw new StepperRuntimeError(`NullPointerException: La fila ${arrName}[${r}] es null`, lineNum, s, hlRange);
        }
        if (c < 0 || c >= rowArr.length) {
          throw new StepperRuntimeError(
            `ArrayIndexOutOfBoundsException: Columna ${c} fuera de límites para longitud ${rowArr.length}`,
            lineNum, s, hlRange
          );
        }

        const rhsTv = evaluateTokens(rhsToks, lineNum);
        const elemType = arrEntry.type.replace(/\[\]\[\]$/, '') || 'int';
        const coercedRhs = coerceType(rhsTv.val, elemType);
        const newRow = [...rowArr];

        if (op === '=') newRow[c] = coercedRhs;
        else if (op === '+=') newRow[c] = elemType === 'String' ? String(newRow[c] ?? '') + String(coercedRhs) : coerceType(newRow[c] + coercedRhs, elemType);
        else if (op === '-=') newRow[c] = coerceType(newRow[c] - coercedRhs, elemType);
        else if (op === '*=') newRow[c] = coerceType(newRow[c] * coercedRhs, elemType);
        else if (op === '/=') newRow[c] = coerceType(INT_TYPES.has(elemType) ? Math.trunc(newRow[c] / coercedRhs) : newRow[c] / coercedRhs, elemType);
        else if (op === '%=') newRow[c] = coerceType(newRow[c] % coercedRhs, elemType);

        const newMat = [...arrEntry.val];
        newMat[r] = newRow;
        arrEntry.val = newMat;

        if (!silent) {
          const inNote = readValuesThisStep.length > 0
            ? ` (leído de la entrada)`
            : '';
          pushStep({
            lineRaw: String(lineNum),
            part: readValuesThisStep.length > 0 ? 'body' : 'body',
            partName: readValuesThisStep.length > 0 ? 'Entrada → Matriz' : 'Modificación Matriz',
            hl: s,
            hlRange,
            explanation: `Se asigna <strong>${escapeHtml(formatValue(newRow[c], elemType))}</strong>${inNote} a <code class="w">${escapeHtml(arrName)}[${r}][${c}]</code>.`
          });
        }
        return `<code class="w">${escapeHtml(arrName)}[${r}][${c}] = ${escapeHtml(formatValue(newRow[c], elemType))}</code>`;
      }
    }

    // D. 1D Array element assignment: a[i] = val; a[i] += val;
    const parsed1D = parseArrayElementTarget(cleanToks, 1);
    if (parsed1D && parsed1D.op && parsed1D.rhsToks) {
      const { arrName, idxToksList, op, rhsToks } = parsed1D;
      const idx = toInt(evaluateTokens(idxToksList[0], lineNum).val);
      const arrEntry = findVar(arrName);
      if (!arrEntry || !Array.isArray(arrEntry.val)) {
        throw new StepperRuntimeError(`NullPointerException: El array '${arrName}' es null`, lineNum, s, hlRange);
      }
      if (idx < 0 || idx >= arrEntry.val.length) {
        throw new StepperRuntimeError(
          `ArrayIndexOutOfBoundsException: Índice ${idx} fuera de límites para longitud ${arrEntry.val.length}`,
          lineNum, s, hlRange
        );
      }

      const rhsTv = evaluateTokens(rhsToks, lineNum);
      const elemType = arrEntry.type.replace(/\[\]$/, '') || 'int';
      const coercedRhs = coerceType(rhsTv.val, elemType);
      const newArr = [...arrEntry.val];

      if (op === '=') newArr[idx] = coercedRhs;
      else if (op === '+=') newArr[idx] = elemType === 'String' ? String(newArr[idx] ?? '') + String(coercedRhs) : coerceType(newArr[idx] + coercedRhs, elemType);
      else if (op === '-=') newArr[idx] = coerceType(newArr[idx] - coercedRhs, elemType);
      else if (op === '*=') newArr[idx] = coerceType(newArr[idx] * coercedRhs, elemType);
      else if (op === '/=') newArr[idx] = coerceType(INT_TYPES.has(elemType) ? Math.trunc(newArr[idx] / coercedRhs) : newArr[idx] / coercedRhs, elemType);
      else if (op === '%=') newArr[idx] = coerceType(newArr[idx] % coercedRhs, elemType);

      arrEntry.val = newArr;

      if (!silent) {
        const inNote = readValuesThisStep.length > 0
          ? ` (leído de la entrada)`
          : '';
        pushStep({
          lineRaw: String(lineNum),
          part: 'body',
          partName: readValuesThisStep.length > 0 ? 'Entrada → Array' : 'Modificación Array',
          hl: s,
          hlRange,
          explanation: `Se asigna <strong>${escapeHtml(formatValue(newArr[idx], elemType))}</strong>${inNote} a la posición <code>[${idx}]</code> de <code class="w">${escapeHtml(arrName)}</code>.`
        });
      }
      return `<code class="w">${escapeHtml(arrName)}[${idx}] = ${escapeHtml(formatValue(newArr[idx], elemType))}</code>`;
    }

    // E. 1D or 2D Array element increment/decrement: a[i]++; ++a[i]; m[r][c]++;
    if (parsed1D && parsed1D.incOp) {
      const { arrName, idxToksList, incOp } = parsed1D;
      const idx = toInt(evaluateTokens(idxToksList[0], lineNum).val);
      const arrEntry = findVar(arrName);
      if (!arrEntry || !Array.isArray(arrEntry.val)) {
        throw new StepperRuntimeError(`NullPointerException: El array '${arrName}' es null`, lineNum, s, hlRange);
      }
      if (idx < 0 || idx >= arrEntry.val.length) {
        throw new StepperRuntimeError(
          `ArrayIndexOutOfBoundsException: Índice ${idx} fuera de límites para longitud ${arrEntry.val.length}`,
          lineNum, s, hlRange
        );
      }
      const newArr = [...arrEntry.val];
      const elemType = arrEntry.type.replace(/\[\]$/, '') || 'int';
      const delta = incOp === '++' ? 1 : -1;
      newArr[idx] = elemType === 'char'
        ? String.fromCharCode(String(newArr[idx]).charCodeAt(0) + delta)
        : (Number(newArr[idx]) || 0) + delta;
      arrEntry.val = newArr;

      if (!silent) {
        pushStep({
          lineRaw: String(lineNum),
          part: 'body',
          partName: 'Modificación Array',
          hl: s,
          hlRange,
          explanation: `Se modifica <code class="w">${escapeHtml(arrName)}[${idx}]</code>: ahora vale <strong>${escapeHtml(formatValue(newArr[idx], elemType))}</strong>.`
        });
      }
      return `<code class="w">${escapeHtml(arrName)}[${idx}] = ${escapeHtml(formatValue(newArr[idx], elemType))}</code>`;
    }

    const parsed2DInc = parseArrayElementTarget(cleanToks, 2);
    if (parsed2DInc && parsed2DInc.incOp) {
      const { arrName, idxToksList, incOp } = parsed2DInc;
      const r = toInt(evaluateTokens(idxToksList[0], lineNum).val);
      const c = toInt(evaluateTokens(idxToksList[1], lineNum).val);
      const arrEntry = findVar(arrName);
      if (!arrEntry || !Array.isArray(arrEntry.val) || r < 0 || r >= arrEntry.val.length) {
        throw new StepperRuntimeError(
          `ArrayIndexOutOfBoundsException: Fila ${r} fuera de límites`,
          lineNum, s, hlRange
        );
      }
      const rowArr = arrEntry.val[r];
      if (!Array.isArray(rowArr) || c < 0 || c >= rowArr.length) {
        throw new StepperRuntimeError(
          `ArrayIndexOutOfBoundsException: Columna ${c} fuera de límites`,
          lineNum, s, hlRange
        );
      }
      const newRow = [...rowArr];
      const elemType = arrEntry.type.replace(/\[\]\[\]$/, '') || 'int';
      const delta = incOp === '++' ? 1 : -1;
      newRow[c] = elemType === 'char'
        ? String.fromCharCode(String(newRow[c]).charCodeAt(0) + delta)
        : (Number(newRow[c]) || 0) + delta;
      const newMat = [...arrEntry.val];
      newMat[r] = newRow;
      arrEntry.val = newMat;

      if (!silent) {
        pushStep({
          lineRaw: String(lineNum),
          part: 'body',
          partName: 'Modificación Matriz',
          hl: s,
          hlRange,
          explanation: `Se modifica <code class="w">${escapeHtml(arrName)}[${r}][${c}]</code>: ahora vale <strong>${escapeHtml(formatValue(newRow[c], elemType))}</strong>.`
        });
      }
      return `<code class="w">${escapeHtml(arrName)}[${r}][${c}] = ${escapeHtml(formatValue(newRow[c], elemType))}</code>`;
    }

    // F. Array declaration (1D and 2D): Type[] a = ...; or Type[][] m = ...; or Type a[] = ...;
    const arrayDecl = parseArrayDeclaration(cleanToks);
    if (arrayDecl) {
      const { elemType, dims, varName, rhsToks } = arrayDecl;
      const fullType = `${elemType}${'[]'.repeat(dims)}`;
      let arrVal: any = null;
      if (rhsToks && rhsToks.length > 0) {
        if (rhsToks[0].value === '{') {
          arrVal = evaluateArrayInitializerTokens(rhsToks, elemType, dims, lineNum).val;
        } else {
          arrVal = evaluateTokens(rhsToks, lineNum).val;
        }
      }
      declareVar(varName, arrVal, fullType);
      if (!silent) {
        pushStep({
          lineRaw: String(lineNum),
          part: 'body',
          partName: dims === 2 ? 'Matriz' : 'Array',
          hl: s,
          hlRange,
          explanation: rhsToks && rhsToks.length > 0
            ? `Se crea ${dims === 2 ? 'la matriz ' : 'el array '}<code class="w">${escapeHtml(varName)}</code> con valor <strong>${escapeHtml(formatValue(arrVal, fullType))}</strong>.`
            : `Se declara ${dims === 2 ? 'la matriz ' : 'el array '}<code class="w">${escapeHtml(varName)}</code> de tipo <code>${fullType}</code> (inicializado a <strong>null</strong>).`
        });
      }
      return `<code class="w">${escapeHtml(varName)} = ${escapeHtml(formatValue(arrVal, fullType))}</code>`;
    }

    // G. Multi-variable declaration on one line: e.g. `int a = 1, b = 2;` or `int a, b;`
    if (
      (PRIMITIVE_AND_STRING_TYPES.has(cleanToks[0]?.value) || cleanToks[0]?.value === 'var') &&
      hasTopLevelComma(cleanToks)
    ) {
      const summary = executeCommaSeparatedExpressions(cleanToks, lineNum, true);
      if (!silent) {
        pushStep({
          lineRaw: String(lineNum),
          part: 'body',
          partName: 'Declaración',
          hl: s,
          hlRange,
          explanation: `Se declaran las variables: ${summary}.`
        });
      }
      return summary;
    }

    // H. Variable declaration or assignment: [Type | var] varName [= | += | -= | *= | /= | %= rhs]
    const varDeclOrAssign = parseSimpleVarDeclOrAssign(cleanToks);
    if (varDeclOrAssign) {
      const { declaredType, varName, op, rhsToks } = varDeclOrAssign;

      if (!op) {
        // Declaration without initializer: e.g. `int a;`
        const effectiveType = declaredType && declaredType !== 'var' ? declaredType : 'int';
        const defVal = getDefaultValue(effectiveType);
        declareVar(varName, defVal, effectiveType);
        if (!silent) {
          pushStep({
            lineRaw: String(lineNum),
            part: 'body',
            partName: 'Declaración',
            hl: s,
            hlRange,
            explanation: `Se declara la variable <code class="w">${escapeHtml(varName)}</code> de tipo <code>${effectiveType}</code> (valor inicial: <strong>${escapeHtml(formatValue(defVal, effectiveType))}</strong>).`
          });
        }
        return `<code class="w">${escapeHtml(varName)} = ${escapeHtml(formatValue(defVal, effectiveType))}</code>`;
      }

      const rhsTv = evaluateTokens(rhsToks!, lineNum);
      let effectiveType: JavaType;
      if (declaredType) {
        effectiveType = declaredType === 'var' ? inferJavaType(rhsTv) : declaredType;
        const coerced = coerceType(rhsTv.val, effectiveType);
        declareVar(varName, coerced, effectiveType);
      } else {
        const updated = applyAssignmentToScope(varName, op, rhsTv, lineNum);
        effectiveType = updated.type;
      }

      const finalEntry = findVar(varName)!;
      const formattedVal = formatValue(finalEntry.val, finalEntry.type);

      if (!silent) {
        const hasInput = readValuesThisStep.length > 0;
        const rhsRaw = getRawSlice(rhsToks![0], rhsToks![rhsToks!.length - 1]);
        pushStep({
          lineRaw: String(lineNum),
          part: 'body',
          partName: hasInput ? 'Entrada' : 'Asignación',
          hl: s,
          hlRange,
          explanation: hasInput
            ? `Se lee <code class="w">${escapeHtml(formattedVal)}</code> de la entrada (${rhsRaw.includes('IO.readln') || rhsRaw.includes('readln') ? 'IO.readln' : 'Scanner'}) y se asigna a <code class="w">${escapeHtml(varName)}</code>.`
            : `Se asigna el valor <strong>${escapeHtml(formattedVal)}</strong> a <code class="w">${escapeHtml(varName)}</code>.`
        });
      }
      return `<code class="w">${escapeHtml(varName)} = ${escapeHtml(formattedVal)}</code>`;
    }

    // I. Variable increment / decrement: i++, i--, ++i, --i
    if (
      cleanToks.length === 2 &&
      ((cleanToks[0].type === 'IDENT' && (cleanToks[1].value === '++' || cleanToks[1].value === '--')) ||
        ((cleanToks[0].value === '++' || cleanToks[0].value === '--') && cleanToks[1].type === 'IDENT'))
    ) {
      const isPrefix = cleanToks[0].value === '++' || cleanToks[0].value === '--';
      const varName = isPrefix ? cleanToks[1].value : cleanToks[0].value;
      const op = (isPrefix ? cleanToks[0].value : cleanToks[1].value) === '++' ? 1 : -1;
      const entry = findVar(varName);
      if (entry) {
        if (entry.type === 'char' && typeof entry.val === 'string') {
          entry.val = String.fromCharCode(entry.val.charCodeAt(0) + op);
        } else {
          entry.val = (Number(entry.val) || 0) + op;
        }
        const formatted = formatValue(entry.val, entry.type);
        if (!silent) {
          pushStep({
            lineRaw: String(lineNum),
            part: 'body',
            partName: 'Modificación',
            hl: s,
            hlRange,
            explanation: `Se modifica la variable <code class="w">${escapeHtml(varName)}</code> (<code class="w">${escapeHtml(s)}</code>). Ahora vale <strong>${escapeHtml(formatted)}</strong>.`
          });
        }
        return `<code class="w">${escapeHtml(varName)} = ${escapeHtml(formatted)}</code>`;
      }
    }

    // J. General expression / standalone method call (e.g. sc.nextLine(), Arrays.sort(arr))
    evaluateTokens(cleanToks, lineNum);
    if (!silent) {
      const hasInput = readValuesThisStep.length > 0;
      pushStep({
        lineRaw: String(lineNum),
        part: 'body',
        partName: hasInput ? 'Entrada' : 'Instrucción',
        hl: s,
        hlRange,
        explanation: hasInput
          ? `Se ejecuta <code class="w">${escapeHtml(s)}</code> leyendo <code class="w">${escapeHtml(readValuesThisStep.join(', '))}</code> de la entrada.`
          : `Se ejecuta <code class="w">${escapeHtml(s)}</code>.`
      });
    }
    return '';
  }

  function applyAssignmentToScope(varName: string, op: string, rhs: TypedVal, lineNum: number): VarEntry {
    const existing = findVar(varName);
    const targetType = existing ? existing.type : inferJavaType(rhs);
    const curVal = existing ? existing.val : getDefaultValue(targetType);
    let newVal: any;

    if (op === '=') {
      newVal = coerceType(rhs.val, targetType);
    } else if (op === '+=' && (targetType === 'String' || typeof curVal === 'string')) {
      newVal = String(curVal ?? '') + formatForPrint(rhs);
    } else {
      const a = targetType === 'char' ? String(curVal).charCodeAt(0) : Number(curVal) || 0;
      const b = rhs.type === 'char' ? String(rhs.val).charCodeAt(0) : Number(rhs.val) || 0;
      if (op === '+=') newVal = coerceType(a + b, targetType);
      else if (op === '-=') newVal = coerceType(a - b, targetType);
      else if (op === '*=') newVal = coerceType(a * b, targetType);
      else if (op === '/=') {
        if (b === 0 && INT_TYPES.has(targetType)) {
          throw new StepperRuntimeError('ArithmeticException: División por cero (/ by zero)', lineNum);
        }
        newVal = coerceType(INT_TYPES.has(targetType) ? Math.trunc(a / b) : a / b, targetType);
      } else if (op === '%=') {
        if (b === 0 && INT_TYPES.has(targetType)) {
          throw new StepperRuntimeError('ArithmeticException: División por cero (% by zero)', lineNum);
        }
        newVal = coerceType(a % b, targetType);
      }
    }
    return setVar(varName, newVal, targetType);
  }

  function hasTopLevelComma(toks: Token[]): boolean {
    let dP = 0;
    let dB = 0;
    let dK = 0;
    for (const t of toks) {
      if (t.value === '(') dP++;
      else if (t.value === ')') dP--;
      else if (t.value === '{') dB++;
      else if (t.value === '}') dB--;
      else if (t.value === '[') dK++;
      else if (t.value === ']') dK--;
      else if (t.value === ',' && dP === 0 && dB === 0 && dK === 0) return true;
    }
    return false;
  }

  function parseArrayElementTarget(
    toks: Token[],
    expectedDims: 1 | 2
  ): { arrName: string; idxToksList: Token[][]; op?: string; rhsToks?: Token[]; incOp?: '++' | '--' } | null {
    let p = 0;
    let prefixInc: '++' | '--' | undefined;
    if (toks[p]?.value === '++' || toks[p]?.value === '--') {
      prefixInc = toks[p].value;
      p++;
    }
    if (toks[p]?.type !== 'IDENT') return null;
    const arrName = toks[p].value;
    p++;

    const idxToksList: Token[][] = [];
    while (p < toks.length && toks[p].value === '[') {
      p++; // [
      const idxToks: Token[] = [];
      let depth = 1;
      while (p < toks.length) {
        const ct = toks[p++];
        if (ct.value === '[') depth++;
        else if (ct.value === ']') {
          depth--;
          if (depth === 0) break;
        }
        idxToks.push(ct);
      }
      idxToksList.push(idxToks);
    }

    if (idxToksList.length !== expectedDims) return null;

    if (prefixInc && p === toks.length) {
      return { arrName, idxToksList, incOp: prefixInc };
    }
    if (!prefixInc && p === toks.length - 1 && (toks[p].value === '++' || toks[p].value === '--')) {
      return { arrName, idxToksList, incOp: toks[p].value };
    }
    if (!prefixInc && p < toks.length && ['=', '+=', '-=', '*=', '/=', '%='].includes(toks[p].value)) {
      const op = toks[p].value;
      const rhsToks = toks.slice(p + 1);
      if (rhsToks.length > 0) {
        return { arrName, idxToksList, op, rhsToks };
      }
    }
    return null;
  }

  function parseArrayDeclaration(
    toks: Token[]
  ): { elemType: JavaType; dims: number; varName: string; rhsToks: Token[] | null } | null {
    let p = 0;
    if (!PRIMITIVE_AND_STRING_TYPES.has(toks[p]?.value)) return null;
    const elemType = toks[p].value as JavaType;
    p++;

    let dims = 0;
    while (toks[p]?.value === '[' && toks[p + 1]?.value === ']') {
      dims++;
      p += 2;
    }

    if (toks[p]?.type !== 'IDENT') return null;
    const varName = toks[p].value;
    p++;

    // Also support C-style `int a[]`
    while (toks[p]?.value === '[' && toks[p + 1]?.value === ']') {
      dims++;
      p += 2;
    }

    if (dims === 0) return null;

    if (p === toks.length) {
      return { elemType, dims, varName, rhsToks: null };
    }
    if (toks[p]?.value === '=') {
      return { elemType, dims, varName, rhsToks: toks.slice(p + 1) };
    }
    return null;
  }

  function parseSimpleVarDeclOrAssign(
    toks: Token[]
  ): { declaredType: JavaType | null; varName: string; op: string | null; rhsToks: Token[] | null } | null {
    let p = 0;
    let declaredType: JavaType | null = null;
    if (PRIMITIVE_AND_STRING_TYPES.has(toks[p]?.value) || toks[p]?.value === 'var') {
      declaredType = toks[p].value as JavaType;
      p++;
    }
    if (toks[p]?.type !== 'IDENT') return null;
    const varName = toks[p].value;
    p++;

    if (['return', 'break', 'continue', 'yield', 'case', 'default'].includes(varName)) return null;

    if (p === toks.length && declaredType) {
      return { declaredType, varName, op: null, rhsToks: null };
    }

    if (toks[p] && ['=', '+=', '-=', '*=', '/=', '%='].includes(toks[p].value)) {
      const op = toks[p].value;
      const rhsToks = toks.slice(p + 1);
      if (rhsToks.length > 0) {
        return { declaredType, varName, op, rhsToks };
      }
    }
    return null;
  }

  // --- 5. Run Parser & Simulator ---
  let runtimeError: StepperRuntimeError | null = null;
  try {
    const program: any[] = [];
    while (pos < allTokens.length) {
      const s = parseStatement();
      if (s) program.push(s);
    }
    executeStatementList(program);
  } catch (err: any) {
    if (err instanceof StepperRuntimeError) {
      runtimeError = err;
    } else {
      return {
        normalizedLines,
        cleanCode,
        timeline: [],
        error: err?.message || String(err)
      };
    }
  }

  // --- 6. Build Synchronized Timeline ---
  // stateSnapshots[0] = initial state before any statement has executed
  // stateSnapshots[k + 1] = state after rawSteps[k] has executed
  // timeline[k] highlights rawSteps[k] (about to execute) with stateSnapshots[k],
  // so pressing Next (▶) executes the highlighted instruction and shows its effects in timeline[k + 1].
  const timeline: TimelineStep[] = [];
  let prevMemMap = new Map<string, string>();
  let cumulativeOutRaw = '';
  let cumulativeOutHtml = '';

  interface StateSnapshot {
    memEntries: MemEntry[];
    inHtml: string;
    outHtml: string;
    outRaw: string;
  }

  const stateSnapshots: StateSnapshot[] = [
    {
      memEntries: [],
      inHtml: renderInputConsoleHtml(fullInput, 0),
      outHtml: '',
      outRaw: ''
    }
  ];

  rawSteps.forEach((rawStep) => {
    const nextMemMap = new Map<string, string>();
    const memEntries: MemEntry[] = rawStep.memSnapshot.map((item) => {
      nextMemMap.set(item.key, item.value);
      const changed = !prevMemMap.has(item.key) || prevMemMap.get(item.key) !== item.value;
      return {
        key: item.key,
        value: item.value,
        type: item.type,
        changed
      };
    });
    prevMemMap = nextMemMap;

    if (rawStep.outDelta) {
      cumulativeOutRaw += rawStep.outDelta;
      cumulativeOutHtml += `<span class="out">${escapeHtml(rawStep.outDelta)}</span>`;
    }

    stateSnapshots.push({
      memEntries,
      inHtml: renderInputConsoleHtml(fullInput, rawStep.consumedOffset),
      outHtml: cumulativeOutHtml,
      outRaw: cumulativeOutRaw
    });
  });

  rawSteps.forEach((rawStep, idx) => {
    const lines = String(rawStep.lineRaw)
      .split(',')
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => !isNaN(n));
    const snapshot = stateSnapshots[idx];

    timeline.push({
      index: timeline.length,
      lines,
      hl: rawStep.hl,
      hlRange: rawStep.hlRange ?? null,
      part: rawStep.part,
      partName: rawStep.partName,
      explanation: rawStep.explanation,
      memEntries: snapshot.memEntries,
      inHtml: snapshot.inHtml,
      outHtml: snapshot.outHtml,
      outRaw: snapshot.outRaw,
      isError: rawStep.isError
    });
  });

  const finalSnapshot = stateSnapshots[stateSnapshots.length - 1];

  if (runtimeError) {
    timeline.push({
      index: timeline.length,
      lines: runtimeError.line ? [runtimeError.line] : [],
      hl: runtimeError.hl || null,
      hlRange: runtimeError.hlRange ?? null,
      part: 'error',
      partName: 'Error en ejecución',
      explanation: `<span style="color:#fca5a5;">${escapeHtml(runtimeError.message)}</span>`,
      memEntries: finalSnapshot.memEntries,
      inHtml: renderInputConsoleHtml(fullInput, inputPos),
      outHtml: finalSnapshot.outHtml,
      outRaw: finalSnapshot.outRaw,
      isError: true
    });
  } else if (rawSteps.length >= MAX_STEPS) {
    timeline.push({
      index: timeline.length,
      lines: [],
      hl: null,
      hlRange: null,
      part: 'error',
      partName: 'Límite alcanzado',
      explanation: `Se ha alcanzado el límite de <strong>${MAX_STEPS} pasos</strong>. Es posible que el código contenga un bucle infinito.`,
      memEntries: finalSnapshot.memEntries,
      inHtml: finalSnapshot.inHtml,
      outHtml: finalSnapshot.outHtml,
      outRaw: finalSnapshot.outRaw,
      isError: true
    });
  } else if (rawSteps.length > 0) {
    timeline.push({
      index: timeline.length,
      lines: [],
      hl: null,
      hlRange: null,
      part: 'end',
      partName: 'Fin',
      explanation: 'El programa ha finalizado su ejecución.',
      memEntries: finalSnapshot.memEntries,
      inHtml: finalSnapshot.inHtml,
      outHtml: finalSnapshot.outHtml,
      outRaw: finalSnapshot.outRaw
    });
  }

  return {
    normalizedLines,
    cleanCode,
    timeline
  };
}
