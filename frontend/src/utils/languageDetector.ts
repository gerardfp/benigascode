/**
 * Utility to heuristically detect whether a source code snippet is Java or Python.
 */
export function detectLanguage(code: string | undefined | null, fallback: 'java' | 'python' = 'java'): 'java' | 'python' {
  if (!code || !code.trim()) {
    return fallback;
  }

  const clean = code.trim();

  let javaScore = 0;
  let pythonScore = 0;

  // Comments
  if (clean.includes('//') || clean.includes('/*')) {
    javaScore += 3;
  }
  if (clean.includes('#')) {
    pythonScore += 2;
  }

  // Strong Java indicators
  if (/\b(?:public\s+|private\s+|protected\s+)?(?:final\s+|abstract\s+)?class\s+\w+\s*\{/.test(clean)) javaScore += 6;
  if (/\b(?:public|private|protected)\s+(?:static\s+)?(?:void|[A-Z]\w*|int|double|boolean|String|char|long|float)\s+\w+\s*\(/.test(clean)) javaScore += 5;
  if (/System\.(?:out|err)\.(?:print|println|printf)/.test(clean)) javaScore += 6;
  if (/import\s+java[x]?\./.test(clean)) javaScore += 6;
  if (/\b(?:Scanner|ArrayList|HashMap|List|Map|String|Integer|Double|Boolean)\s+\w+\s*=/.test(clean)) javaScore += 4;
  if (clean.includes('public static void main')) javaScore += 8;

  // Strong Python indicators
  if (/(?:^|\n)\s*def\s+\w+\s*\([^)]*\)\s*:/.test(clean)) pythonScore += 5;
  if (/(?:^|\n|\s)print\s*\(/.test(clean)) pythonScore += 4;
  if (/(?:^|\n|\s)input\s*\(/.test(clean)) pythonScore += 4;
  if (/(?:^|\n)(?:import\s+\w+|from\s+\w+\s+import)/.test(clean)) pythonScore += 4;
  if (/if\s+__name__\s*==\s*['"]__main__['"]\s*:/.test(clean)) pythonScore += 8;
  if (/(?:^|\n)\s*elif\s+/.test(clean)) pythonScore += 5;

  // Structural characters
  const semicolons = (clean.match(/;/g) || []).length;
  const openBraces = (clean.match(/\{/g) || []).length;
  const colons = (clean.match(/:/g) || []).length;

  if (semicolons >= 2) javaScore += Math.min(semicolons, 10);
  if (openBraces >= 1) javaScore += Math.min(openBraces * 2, 8);

  if (colons >= 1 && openBraces === 0 && semicolons === 0) {
    pythonScore += 4;
  }
  if (/(?::\s*\n\s+)/.test(clean)) {
    pythonScore += 3;
  }

  if (pythonScore > javaScore) {
    return 'python';
  } else if (javaScore > pythonScore) {
    return 'java';
  }

  return fallback;
}

