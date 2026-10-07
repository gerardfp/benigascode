package com.benigascode.content.service;

import com.benigascode.content.domain.Exercise;
import com.benigascode.content.domain.ExerciseVersion;
import com.benigascode.content.dto.TestCaseDTO;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

public class ExerciseMarkdownRoundTripTest {

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    void testParseCanonicalExample() {
        String md = """
                ---
                slug: suma-dos-numeros
                tags: [basico, matematicas, i/o]
                ---
                # Suma de dos números

                Escribe un programa que lea dos números enteros.

                ## Entrada
                Dos números.

                ## Salida
                La suma.

                ## Plantillas

                ```java
                import java.util.Scanner;
                public class Main {
                    public static void main(String[] args) {
                        Scanner sc = new Scanner(System.in);
                    }
                }
                ```

                ```python
                def main():
                    pass
                ```

                ## Tests

                ### Test
                ```input
                3 5
                ```
                ```output
                8
                ```
                ```explanation
                La suma de 3 y 5 es 8.
                ```

                ### Test private 2
                ```input
                -15 4
                ```
                ```output
                -11
                ```
                """;

        ExerciseMarkdownParser.ParseResult res = ExerciseMarkdownParser.parse(md, "fallback");
        assertTrue(res.success());
        ExerciseMarkdownParser.ParsedExercise ex = res.exercise();

        assertEquals("suma-dos-numeros", ex.slug());
        assertEquals("Suma de dos números", ex.title());
        assertEquals(List.of("basico", "matematicas", "i/o"), ex.tags());
        assertTrue(ex.statement().contains("Escribe un programa que lea dos números enteros."));
        assertTrue(ex.statement().contains("## Entrada"));
        assertTrue(ex.statement().contains("## Salida"));

        assertEquals(2, ex.templates().size());
        assertTrue(ex.templates().containsKey("java"));
        assertTrue(ex.templates().containsKey("python"));

        assertEquals(2, ex.testCases().size());
        TestCaseDTO tc1 = ex.testCases().get(0);
        assertTrue(tc1.isPublic());
        assertEquals(1.0, tc1.weight());
        assertEquals("3 5\n", tc1.input());
        assertEquals("8\n", tc1.effectiveExpected());
        assertEquals("La suma de 3 y 5 es 8.", tc1.explanation());

        TestCaseDTO tc2 = ex.testCases().get(1);
        assertFalse(tc2.isPublic());
        assertEquals(2.0, tc2.weight());
        assertEquals("-15 4\n", tc2.input());
        assertEquals("-11\n", tc2.effectiveExpected());
    }

    @Test
    void testSerializationAndRoundTrip() throws Exception {
        Exercise exercise = new Exercise("fibonacci-memo");
        ExerciseVersion ev = new ExerciseVersion();
        ev.setExercise(exercise);
        ev.setTitle("Fibonacci con memoización");
        ev.setStatement("Calcula el enésimo término de la sucesión de Fibonacci.");
        ev.setLanguage("java");
        ev.setRuntimeId("java-26");
        ev.setTags(objectMapper.writeValueAsString(List.of("dp", "recursividad")));
        ev.setTemplatesConfig(objectMapper.writeValueAsString(Map.of(
                "java", "public class Main { public static void main(String[] args) {} }\n",
                "python", "def fib(n): return n\n"
        )));

        Map<String, Object> testSuite = Map.of(
                "public", List.of(
                        Map.of("id", "pub-1", "name", "Test 1", "input", "5\n", "expected", "5\n", "weight", 1.0, "explanation", "F(5) = 5")
                ),
                "private", List.of(
                        Map.of("id", "priv-1", "name", "Test 2", "input", "10\n", "expected", "55\n", "weight", 2.5)
                )
        );
        ev.setTestsConfig(objectMapper.writeValueAsString(testSuite));

        // Serializar a Markdown
        String serializedMd = ExerciseMarkdownSerializer.serialize(exercise, ev, objectMapper);

        // Volver a parsear
        ExerciseMarkdownParser.ParseResult res = ExerciseMarkdownParser.parse(serializedMd, null);
        assertTrue(res.success());
        ExerciseMarkdownParser.ParsedExercise pe = res.exercise();

        assertEquals("fibonacci-memo", pe.slug());
        assertEquals("Fibonacci con memoización", pe.title());
        assertEquals(List.of("dp", "recursividad"), pe.tags());
        assertEquals("Calcula el enésimo término de la sucesión de Fibonacci.", pe.statement());
        assertEquals(2, pe.templates().size());
        assertEquals(2, pe.testCases().size());

        TestCaseDTO tcPublic = pe.testCases().get(0);
        assertTrue(tcPublic.isPublic());
        assertEquals(1.0, tcPublic.weight());
        assertEquals("5\n", tcPublic.input());
        assertEquals("5\n", tcPublic.effectiveExpected());
        assertEquals("F(5) = 5", tcPublic.explanation());

        TestCaseDTO tcPrivate = pe.testCases().get(1);
        assertFalse(tcPrivate.isPublic());
        assertEquals(2.5, tcPrivate.weight());
        assertEquals("10\n", tcPrivate.input());
        assertEquals("55\n", tcPrivate.effectiveExpected());
    }
}
