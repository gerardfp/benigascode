package com.benigascode.content.api;

import com.benigascode.content.domain.ContentSync;
import com.benigascode.content.dto.*;
import com.benigascode.content.repository.ContentSyncRepository;
import com.benigascode.content.service.ContentExportService;
import com.benigascode.content.service.ContentService;
import com.benigascode.content.service.ContentSyncService;
import com.benigascode.identity.domain.User;
import com.benigascode.identity.service.UserService;
import jakarta.validation.Valid;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping({"/api/v1/teacher", "/api/v1/teacher/content"})
@PreAuthorize("hasAnyRole('TEACHER', 'ADMIN')")
public class TeacherContentController {

    private final ContentSyncService syncService;
    private final ContentSyncRepository syncRepository;
    private final ContentService contentService;
    private final ContentExportService exportService;
    private final UserService userService;

    public TeacherContentController(ContentSyncService syncService,
                                    ContentSyncRepository syncRepository,
                                    ContentService contentService,
                                    ContentExportService exportService,
                                    UserService userService) {
        this.syncService = syncService;
        this.syncRepository = syncRepository;
        this.contentService = contentService;
        this.exportService = exportService;
        this.userService = userService;
    }

    // ==================== EJERCICIOS ====================

    @GetMapping("/exercises")
    public ResponseEntity<List<ExerciseDTO>> listExercises(@RequestParam(required = false) String search) {
        return ResponseEntity.ok(contentService.listTeacherExercises(search));
    }

    @GetMapping("/exercises/{id}")
    public ResponseEntity<TeacherExerciseDetailDTO> getExerciseDetail(@PathVariable UUID id) {
        return ResponseEntity.ok(contentService.getTeacherExerciseDetail(id));
    }

    @PostMapping("/exercises")
    public ResponseEntity<TeacherExerciseDetailDTO> createExercise(@Valid @RequestBody SaveExerciseRequest request) {
        User teacher = userService.getCurrentUser();
        return ResponseEntity.ok(contentService.createExercise(request, teacher));
    }

    @PutMapping("/exercises/{id}")
    public ResponseEntity<TeacherExerciseDetailDTO> updateExercise(@PathVariable UUID id,
                                                                   @Valid @RequestBody SaveExerciseRequest request) {
        User teacher = userService.getCurrentUser();
        return ResponseEntity.ok(contentService.updateExercise(id, request, teacher));
    }

    @DeleteMapping("/exercises/{id}")
    public ResponseEntity<Void> deleteExercise(@PathVariable UUID id) {
        User teacher = userService.getCurrentUser();
        contentService.deleteExercise(id, teacher);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/exercises/batch-assign-tag")
    public ResponseEntity<Void> batchAssignTag(@Valid @RequestBody BatchExerciseTagRequest request) {
        User teacher = userService.getCurrentUser();
        contentService.batchAssignTag(request.exerciseIds(), request.tag(), request.tagId(), teacher);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/exercises/batch-revoke-tag")
    public ResponseEntity<Void> batchRevokeTag(@Valid @RequestBody BatchExerciseTagRequest request) {
        User teacher = userService.getCurrentUser();
        contentService.batchRevokeTag(request.exerciseIds(), request.tag(), request.tagId(), teacher);
        return ResponseEntity.noContent().build();
    }

    // ==================== ASSETS DE IMÁGENES ====================

    @GetMapping("/exercises/{id}/assets")
    public ResponseEntity<List<AssetDTO>> listAssets(@PathVariable UUID id) {
        return ResponseEntity.ok(contentService.listAssets(id));
    }

    @PostMapping(value = "/exercises/{id}/assets", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<AssetDTO> uploadAsset(
            @PathVariable UUID id,
            @RequestParam("file") MultipartFile file) throws Exception {
        String filename = file.getOriginalFilename() != null ? file.getOriginalFilename() : "asset_" + System.currentTimeMillis();
        String contentType = file.getContentType() != null ? file.getContentType() : MediaType.APPLICATION_OCTET_STREAM_VALUE;
        AssetDTO asset = contentService.saveAsset(id, filename, contentType, file.getBytes());
        return ResponseEntity.ok(asset);
    }

    @DeleteMapping("/exercises/{id}/assets/{assetIdentifier}")
    public ResponseEntity<Void> deleteAsset(@PathVariable UUID id, @PathVariable String assetIdentifier) {
        contentService.deleteAsset(id, assetIdentifier);
        return ResponseEntity.noContent().build();
    }

    // ==================== COLECCIONES ====================

    @GetMapping("/collections")
    public ResponseEntity<List<TeacherCollectionDetailDTO>> listCollections(@RequestParam(required = false) String search) {
        return ResponseEntity.ok(contentService.listTeacherCollections(search));
    }

    @GetMapping("/collections/{id}")
    public ResponseEntity<TeacherCollectionDetailDTO> getCollectionDetail(@PathVariable UUID id) {
        return ResponseEntity.ok(contentService.getTeacherCollectionDetail(id));
    }

    @PostMapping("/collections")
    public ResponseEntity<TeacherCollectionDetailDTO> createCollection(@Valid @RequestBody SaveCollectionRequest request) {
        User teacher = userService.getCurrentUser();
        return ResponseEntity.ok(contentService.createCollection(request, teacher));
    }

    @PutMapping("/collections/{id}")
    public ResponseEntity<TeacherCollectionDetailDTO> updateCollection(@PathVariable UUID id,
                                                                       @Valid @RequestBody SaveCollectionRequest request) {
        User teacher = userService.getCurrentUser();
        return ResponseEntity.ok(contentService.updateCollection(id, request, teacher));
    }

    @DeleteMapping("/collections/{id}")
    public ResponseEntity<Void> deleteCollection(@PathVariable UUID id) {
        User teacher = userService.getCurrentUser();
        contentService.deleteCollection(id, teacher);
        return ResponseEntity.noContent().build();
    }

    // ==================== EXPORTACIÓN / IMPORTACIÓN ====================

    @GetMapping({"/export/collection/{id}", "/collections/{id}/export.zip"})
    public ResponseEntity<byte[]> exportCollectionZip(@PathVariable UUID id) throws Exception {
        byte[] zipBytes = exportService.exportCollectionZip(id);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"collection_" + id + ".zip\"")
                .contentType(MediaType.parseMediaType("application/zip"))
                .body(zipBytes);
    }

    @GetMapping({"/export/exercise/{id}", "/exercises/{id}/export.zip"})
    public ResponseEntity<byte[]> exportExerciseZip(@PathVariable UUID id) throws Exception {
        byte[] zipBytes = exportService.exportExerciseZip(id);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"exercise_" + id + ".zip\"")
                .contentType(MediaType.parseMediaType("application/zip"))
                .body(zipBytes);
    }

    // Importación bajo demanda desde directorio
    @PostMapping("/import")
    public ResponseEntity<ContentSync> importFromDirectory(@RequestParam(required = false) String directoryPath) {
        ContentSync sync = syncService.syncFromDirectory(directoryPath, "manual_import_" + System.currentTimeMillis());
        return ResponseEntity.ok(sync);
    }

    @PostMapping("/sync")
    public ResponseEntity<ContentSync> triggerSync(@RequestParam(required = false) String directoryPath,
                                                   @RequestParam(required = false) String gitCommit) {
        ContentSync sync = syncService.syncFromDirectory(directoryPath, gitCommit);
        return ResponseEntity.ok(sync);
    }

    @GetMapping("/sync-status")
    public ResponseEntity<List<ContentSync>> getSyncStatus() {
        return ResponseEntity.ok(syncRepository.findTop10ByOrderByStartedAtDesc());
    }

    @PostMapping("/collections/{collectionId}/access-keys")
    public ResponseEntity<CreateAccessKeyResponse> createAccessKey(
            @PathVariable UUID collectionId,
            @RequestParam(required = false) Integer maxUses,
            @RequestParam(required = false) Instant expiresAt) {
        User teacher = userService.getCurrentUser();
        CreateAccessKeyResponse response = contentService.generateAccessKey(collectionId, maxUses, expiresAt, teacher);
        return ResponseEntity.ok(response);
    }
}
