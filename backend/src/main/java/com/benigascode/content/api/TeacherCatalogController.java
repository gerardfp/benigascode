package com.benigascode.content.api;

import com.benigascode.content.dto.*;
import com.benigascode.content.service.CatalogImportExportService;
import com.benigascode.identity.domain.User;
import com.benigascode.identity.service.UserService;
import jakarta.validation.Valid;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/v1/teacher/catalog")
@PreAuthorize("hasAnyRole('TEACHER', 'ADMIN')")
public class TeacherCatalogController {

    private final CatalogImportExportService catalogService;
    private final UserService userService;

    public TeacherCatalogController(CatalogImportExportService catalogService,
                                    UserService userService) {
        this.catalogService = catalogService;
        this.userService = userService;
    }

    /**
     * Comprueba y simula la importación del catálogo, identificando qué elementos son nuevos,
     * cuáles colisionan y qué acción se ejecutará según la estrategia seleccionada.
     */
    @PostMapping("/import/preview")
    public ResponseEntity<CatalogImportPreviewDTO> previewImport(@Valid @RequestBody CatalogImportRequest request) {
        CatalogImportPreviewDTO preview = catalogService.previewImport(request);
        return ResponseEntity.ok(preview);
    }

    /**
     * Comprueba y simula la importación del catálogo desde un archivo ZIP.
     */
    @PostMapping(value = "/import/zip/preview", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<CatalogImportPreviewDTO> previewZipImport(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "conflictStrategy", defaultValue = "OVERWRITE") CatalogConflictStrategy conflictStrategy) {
        CatalogImportPreviewDTO preview = catalogService.previewZipImport(file, conflictStrategy);
        return ResponseEntity.ok(preview);
    }

    /**
     * Ejecuta la importación del catálogo con resolución de conflictos (OVERWRITE, SKIP, NEW_SLUG).
     */
    @PostMapping("/import/execute")
    public ResponseEntity<CatalogImportResultDTO> executeImport(@Valid @RequestBody CatalogImportRequest request) {
        CatalogImportResultDTO result = catalogService.executeImport(request);
        return ResponseEntity.ok(result);
    }

    /**
     * Ejecuta la importación del catálogo desde un archivo ZIP con resolución de conflictos.
     */
    @PostMapping(value = "/import/zip/execute", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<CatalogImportResultDTO> executeZipImport(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "conflictStrategy", defaultValue = "OVERWRITE") CatalogConflictStrategy conflictStrategy) {
        CatalogImportResultDTO result = catalogService.executeZipImport(file, conflictStrategy);
        return ResponseEntity.ok(result);
    }

    /**
     * Exporta el catálogo completo a un repositorio Git haciendo commit y push.
     */
    @PostMapping("/export/push")
    public ResponseEntity<CatalogExportPushResultDTO> pushExport(@Valid @RequestBody CatalogExportPushRequest request) {
        User teacher = userService.getCurrentUser();
        CatalogExportPushResultDTO result = catalogService.exportCatalogToGit(request, teacher);
        return ResponseEntity.ok(result);
    }
}

