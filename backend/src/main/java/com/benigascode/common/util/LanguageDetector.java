package com.benigascode.common.util;

import java.util.regex.Pattern;

public class LanguageDetector {

    private static final Pattern JAVA_CLASS_PATTERN = Pattern.compile("\\b(?:public\\s+|private\\s+|protected\\s+)?(?:final\\s+|abstract\\s+)?class\\s+\\w+\\s*\\{");
    private static final Pattern JAVA_METHOD_PATTERN = Pattern.compile("\\b(?:public|private|protected)\\s+(?:static\\s+)?(?:void|[A-Z]\\w*|int|double|boolean|String|char|long|float)\\s+\\w+\\s*\\(");
    private static final Pattern JAVA_SYSTEM_OUT = Pattern.compile("System\\.(?:out|err)\\.(?:print|println|printf)");
    private static final Pattern JAVA_IMPORT = Pattern.compile("import\\s+java[x]?\\.");
    private static final Pattern JAVA_TYPES = Pattern.compile("\\b(?:Scanner|ArrayList|HashMap|List|Map|String|Integer|Double|Boolean)\\s+\\w+\\s*=");

    private static final Pattern PYTHON_DEF = Pattern.compile("(?:^|\\n)\\s*def\\s+\\w+\\s*\\([^)]*\\)\\s*:");
    private static final Pattern PYTHON_PRINT = Pattern.compile("(?:^|\\n|\\s)print\\s*\\(");
    private static final Pattern PYTHON_INPUT = Pattern.compile("(?:^|\\n|\\s)input\\s*\\(");
    private static final Pattern PYTHON_IMPORT = Pattern.compile("(?:^|\\n)(?:import\\s+\\w+|from\\s+\\w+\\s+import)");
    private static final Pattern PYTHON_IF_NAME = Pattern.compile("if\\s+__name__\\s*==\\s*['\"]__main__['\"]\\s*:");
    private static final Pattern PYTHON_ELIF = Pattern.compile("(?:^|\\n)\\s*elif\\s+");
    private static final Pattern PYTHON_COLON_BLOCK = Pattern.compile("(?::\\s*\\n\\s+)");

    public static String detect(String code) {
        return detect(code, "java");
    }

    public static String detect(String code, String fallback) {
        if (code == null || code.trim().isEmpty()) {
            return fallback != null ? fallback.toLowerCase() : "java";
        }

        String cleaned = code.trim();

        // Puntuaciones heurísticas
        int javaScore = 0;
        int pythonScore = 0;

        // Comentarios típicos
        if (cleaned.contains("//") || cleaned.contains("/*")) {
            javaScore += 3;
        }
        if (cleaned.contains("#")) {
            pythonScore += 2;
        }

        // Patrones fuertes de Java
        if (JAVA_CLASS_PATTERN.matcher(cleaned).find()) javaScore += 6;
        if (JAVA_METHOD_PATTERN.matcher(cleaned).find()) javaScore += 5;
        if (JAVA_SYSTEM_OUT.matcher(cleaned).find()) javaScore += 6;
        if (JAVA_IMPORT.matcher(cleaned).find()) javaScore += 6;
        if (JAVA_TYPES.matcher(cleaned).find()) javaScore += 4;
        if (cleaned.contains("public static void main")) javaScore += 8;

        // Patrones fuertes de Python
        if (PYTHON_DEF.matcher(cleaned).find()) pythonScore += 5;
        if (PYTHON_PRINT.matcher(cleaned).find()) pythonScore += 4;
        if (PYTHON_INPUT.matcher(cleaned).find()) pythonScore += 4;
        if (PYTHON_IMPORT.matcher(cleaned).find()) pythonScore += 4;
        if (PYTHON_IF_NAME.matcher(cleaned).find()) pythonScore += 8;
        if (PYTHON_ELIF.matcher(cleaned).find()) pythonScore += 5;

        // Estructura sintáctica (punto y coma vs dos puntos y sangría)
        int semicolons = countOccurrences(cleaned, ';');
        int openBraces = countOccurrences(cleaned, '{');
        int colons = countOccurrences(cleaned, ':');

        if (semicolons >= 2) javaScore += Math.min(semicolons, 10);
        if (openBraces >= 1) javaScore += Math.min(openBraces * 2, 8);

        if (colons >= 1 && openBraces == 0 && semicolons == 0) {
            pythonScore += 4;
        }
        if (PYTHON_COLON_BLOCK.matcher(cleaned).find()) {
            pythonScore += 3;
        }

        if (pythonScore > javaScore) {
            return "python";
        } else if (javaScore > pythonScore) {
            return "java";
        }

        return fallback != null ? fallback.toLowerCase() : "java";
    }

    private static int countOccurrences(String str, char ch) {
        int count = 0;
        for (int i = 0; i < str.length(); i++) {
            if (str.charAt(i) == ch) count++;
        }
        return count;
    }
}

