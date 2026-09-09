package com.codelab.content.api;

import com.codelab.content.domain.ContentSync;
import com.codelab.content.dto.CreateAccessKeyResponse;
import com.codelab.content.repository.ContentSyncRepository;
import com.codelab.content.service.ContentService;
import com.codelab.content.service.ContentSyncService;
import com.codelab.identity.domain.User;
import com.codelab.identity.service.UserService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/teacher/content")
@PreAuthorize("hasAnyRole('TEACHER', 'ADMIN')")
public class TeacherContentController {

    private final ContentSyncService syncService;
    private final ContentSyncRepository syncRepository;
    private final ContentService contentService;
    private final UserService userService;

    public TeacherContentController(ContentSyncService syncService,
                                    ContentSyncRepository syncRepository,
                                    ContentService contentService,
                                    UserService userService) {
        this.syncService = syncService;
        this.syncRepository = syncRepository;
        this.contentService = contentService;
        this.userService = userService;
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

