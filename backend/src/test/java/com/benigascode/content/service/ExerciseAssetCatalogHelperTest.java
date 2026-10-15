package com.benigascode.content.service;

import com.benigascode.content.domain.Exercise;
import com.benigascode.content.domain.ExerciseAsset;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

public class ExerciseAssetCatalogHelperTest {

    @Test
    void testPrepareAssetsForExport_ConsecutiveNumberingAndPurgeUnreferenced() {
        Exercise ex = new Exercise("mi-ejercicio");
        ex.setId(UUID.randomUUID());

        ExerciseAsset asset1 = new ExerciseAsset(ex, "primera-foto.png", "image/png", new byte[]{1, 2, 3});
        asset1.setId(UUID.randomUUID());

        ExerciseAsset asset2 = new ExerciseAsset(ex, "segunda-foto.jpg", "image/jpeg", new byte[]{4, 5, 6});
        asset2.setId(UUID.randomUUID());

        ExerciseAsset assetOrphan = new ExerciseAsset(ex, "no-usada.gif", "image/gif", new byte[]{7, 8, 9});
        assetOrphan.setId(UUID.randomUUID());

        String statement = """
                # Enunciado
                Aquí tenemos la segunda imagen primero:
                ![Segunda Imagen](segunda-foto.jpg)
                
                Y aquí tenemos la primera imagen después:
                <img src="primera-foto.png" width="300">
                """;

        ExerciseAssetCatalogHelper.PreparedExportAssets prepared =
                ExerciseAssetCatalogHelper.prepareAssetsForExport("mi-ejercicio", statement, List.of(asset1, asset2, assetOrphan));

        // 1. Debe haber 2 assets referenciados y 1 no referenciado
        assertEquals(2, prepared.referencedAssets().size());
        assertEquals(1, prepared.unreferencedAssets().size());
        assertEquals("no-usada.gif", prepared.unreferencedAssets().get(0).getFilename());

        // 2. Orden según aparición en el statement: segunda-foto.jpg aparece antes que primera-foto.png
        ExerciseAssetCatalogHelper.ExportedAssetItem item0 = prepared.referencedAssets().get(0);
        assertEquals("mi-ejercicio-img0.jpg", item0.newFilename());
        assertEquals("assets/mi-ejercicio-img0.jpg", item0.relativePath());
        assertSame(asset2, item0.asset());

        ExerciseAssetCatalogHelper.ExportedAssetItem item1 = prepared.referencedAssets().get(1);
        assertEquals("mi-ejercicio-img1.png", item1.newFilename());
        assertEquals("assets/mi-ejercicio-img1.png", item1.relativePath());
        assertSame(asset1, item1.asset());

        // 3. El statement debe haber sido reescrito hacia assets/mi-ejercicio-img0.jpg y assets/mi-ejercicio-img1.png
        assertTrue(prepared.updatedStatement().contains("![Segunda Imagen](assets/mi-ejercicio-img0.jpg)"));
        assertTrue(prepared.updatedStatement().contains("src=\"assets/mi-ejercicio-img1.png\""));
        assertFalse(prepared.updatedStatement().contains("segunda-foto.jpg"));
        assertFalse(prepared.updatedStatement().contains("primera-foto.png"));
    }

    @Test
    void testPrepareAssetsForExport_HandlesApiPathsAndAlreadyPrefixed() {
        Exercise ex = new Exercise("slug-test");
        ex.setId(UUID.randomUUID());

        ExerciseAsset asset = new ExerciseAsset(ex, "slug-test-img0.png", "image/png", new byte[]{10, 20});
        asset.setId(UUID.randomUUID());

        String statement = """
                Observa el diagrama:
                ![Diagrama](/api/v1/exercises/12345/assets/slug-test-img0.png)
                """;

        ExerciseAssetCatalogHelper.PreparedExportAssets prepared =
                ExerciseAssetCatalogHelper.prepareAssetsForExport("slug-test", statement, List.of(asset));

        assertEquals(1, prepared.referencedAssets().size());
        assertEquals(0, prepared.unreferencedAssets().size());
        assertEquals("slug-test-img0.png", prepared.referencedAssets().get(0).newFilename());
        assertEquals("assets/slug-test-img0.png", prepared.referencedAssets().get(0).relativePath());
        assertTrue(prepared.updatedStatement().contains("![Diagrama](assets/slug-test-img0.png)"));
    }

    @Test
    void testPrepareAssetsForExport_SameAssetMultipleTimes() {
        Exercise ex = new Exercise("demo");
        ex.setId(UUID.randomUUID());

        ExerciseAsset asset = new ExerciseAsset(ex, "diagram.png", "image/png", new byte[]{1});
        asset.setId(UUID.randomUUID());

        String statement = """
                Imagen arriba: ![Arriba](diagram.png)
                Imagen abajo: ![Abajo](diagram.png)
                """;

        ExerciseAssetCatalogHelper.PreparedExportAssets prepared =
                ExerciseAssetCatalogHelper.prepareAssetsForExport("demo", statement, List.of(asset));

        // Solo un asset referenciado (img0), aunque aparezca 2 veces
        assertEquals(1, prepared.referencedAssets().size());
        assertEquals("demo-img0.png", prepared.referencedAssets().get(0).newFilename());

        // Ambas apariciones deben reemplazarse
        assertTrue(prepared.updatedStatement().contains("![Arriba](assets/demo-img0.png)"));
        assertTrue(prepared.updatedStatement().contains("![Abajo](assets/demo-img0.png)"));
        assertFalse(prepared.updatedStatement().contains("(diagram.png)"));
    }

    @Test
    void testPrepareAssetsForExport_ImagesInTestExplanations() {
        Exercise ex = new Exercise("calc");
        ex.setId(UUID.randomUUID());

        ExerciseAsset statAsset = new ExerciseAsset(ex, "enunciado.png", "image/png", new byte[]{1});
        statAsset.setId(UUID.randomUUID());

        ExerciseAsset pubAsset = new ExerciseAsset(ex, "paso1.png", "image/png", new byte[]{2});
        pubAsset.setId(UUID.randomUUID());

        ExerciseAsset privAsset = new ExerciseAsset(ex, "secreto.jpg", "image/jpeg", new byte[]{3});
        privAsset.setId(UUID.randomUUID());

        ExerciseAsset orphan = new ExerciseAsset(ex, "huerfana.gif", "image/gif", new byte[]{4});
        orphan.setId(UUID.randomUUID());

        String statement = "Enunciado con imagen ![Enunciado](enunciado.png)";
        String testsConfig = """
                {
                  "public": [
                    {
                      "id": "pub-1",
                      "name": "Test 1",
                      "explanation": "Ver paso 1: ![Paso](paso1.png) y recordar enunciado: ![Recuerda](enunciado.png)"
                    }
                  ],
                  "private": [
                    {
                      "id": "priv-1",
                      "name": "Test Oculto",
                      "explanation": "Solución secreta: <img src=\\"secreto.jpg\\" width=\\"200\\">"
                    }
                  ]
                }
                """;

        ExerciseAssetCatalogHelper.PreparedExportAssets prepared =
                ExerciseAssetCatalogHelper.prepareAssetsForExport("calc", statement, testsConfig, List.of(statAsset, pubAsset, privAsset, orphan), null);

        // 3 assets referenciados y 1 huérfano
        assertEquals(3, prepared.referencedAssets().size());
        assertEquals(1, prepared.unreferencedAssets().size());
        assertEquals("huerfana.gif", prepared.unreferencedAssets().get(0).getFilename());

        // Orden: 1) enunciado.png (img0), 2) paso1.png (img1), 3) secreto.jpg (img2)
        assertEquals("calc-img0.png", prepared.referencedAssets().get(0).newFilename());
        assertEquals("calc-img1.png", prepared.referencedAssets().get(1).newFilename());
        assertEquals("calc-img2.jpg", prepared.referencedAssets().get(2).newFilename());

        // Statement reescrito
        assertTrue(prepared.updatedStatement().contains("![Enunciado](assets/calc-img0.png)"));

        // TestsConfig reescrito
        String rewrittenTests = prepared.updatedTestsConfig();
        assertTrue(rewrittenTests.contains("![Paso](assets/calc-img1.png)"));
        assertTrue(rewrittenTests.contains("![Recuerda](assets/calc-img0.png)"));
        assertTrue(rewrittenTests.contains("assets/calc-img2.jpg"));
        assertFalse(rewrittenTests.contains("paso1.png"));
        assertFalse(rewrittenTests.contains("secreto.jpg"));
    }

    @Test
    void testPrepareAssetsForExport_ImageOnlyInExplanation() {
        Exercise ex = new Exercise("demo-exp");
        ex.setId(UUID.randomUUID());

        ExerciseAsset expAsset = new ExerciseAsset(ex, "diagrama-explicativo.png", "image/png", new byte[]{5});
        expAsset.setId(UUID.randomUUID());

        String statement = "Enunciado sin ninguna imagen.";
        String testsConfig = """
                {
                  "public": [
                    {
                      "id": "pub-1",
                      "explanation": "Aquí está la explicación: ![Explicacion](diagrama-explicativo.png)"
                    }
                  ]
                }
                """;

        ExerciseAssetCatalogHelper.PreparedExportAssets prepared =
                ExerciseAssetCatalogHelper.prepareAssetsForExport("demo-exp", statement, testsConfig, List.of(expAsset), null);

        assertEquals(1, prepared.referencedAssets().size());
        assertEquals(0, prepared.unreferencedAssets().size());
        assertEquals("demo-exp-img0.png", prepared.referencedAssets().get(0).newFilename());
        assertTrue(prepared.updatedTestsConfig().contains("![Explicacion](assets/demo-exp-img0.png)"));
    }
}
