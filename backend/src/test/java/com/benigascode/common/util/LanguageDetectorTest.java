package com.benigascode.common.util;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.assertEquals;

class LanguageDetectorTest {

    @Test
    void testDetectJavaCode() {
        String javaCode = """
            import java.util.Scanner;

            public class Main {
                public static void main(String[] args) {
                    Scanner sc = new Scanner(System.in);
                    int n = sc.nextInt();
                    System.out.println("Result: " + n);
                }
            }
            """;
        assertEquals("java", LanguageDetector.detect(javaCode));
    }

    @Test
    void testDetectSimpleJavaCode() {
        String javaCode = "public class Solution { public static void main(String[] args) { System.out.println(42); } }";
        assertEquals("java", LanguageDetector.detect(javaCode));
    }

    @Test
    void testDetectPythonCode() {
        String pythonCode = """
            def solve():
                n = int(input().strip())
                print(f"Result: {n}")

            if __name__ == '__main__':
                solve()
            """;
        assertEquals("python", LanguageDetector.detect(pythonCode));
    }

    @Test
    void testDetectSimplePythonCode() {
        String pythonCode = """
            # Simple python solution
            name = input()
            print("Hello " + name)
            """;
        assertEquals("python", LanguageDetector.detect(pythonCode));
    }

    @Test
    void testFallbackOnEmpty() {
        assertEquals("java", LanguageDetector.detect(""));
        assertEquals("python", LanguageDetector.detect(null, "python"));
    }
}

