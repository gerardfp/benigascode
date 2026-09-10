package com.benigascode.content.api;

import com.benigascode.content.dto.*;
import com.benigascode.content.service.ContentService;
import com.benigascode.identity.domain.User;
import com.benigascode.identity.service.UserService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1")
public class StudentCollectionController {

    private final ContentService contentService;
    private final UserService userService;

    public StudentCollectionController(ContentService contentService, UserService userService) {
        this.contentService = contentService;
        this.userService = userService;
    }

    @GetMapping("/me/collections")
    public ResponseEntity<List<CollectionDTO>> listMyCollections() {
        User user = userService.getCurrentUser();
        return ResponseEntity.ok(contentService.getAccessibleCollections(user));
    }

    @PostMapping("/collections/access")
    public ResponseEntity<CollectionDTO> claimAccess(@Valid @RequestBody AccessKeyRequest request) {
        User user = userService.getCurrentUser();
        CollectionDTO collection = contentService.claimAccessWithKey(request.accessKey(), user);
        return ResponseEntity.ok(collection);
    }

    @GetMapping("/collections/{id}")
    public ResponseEntity<CollectionDTO> getCollection(@PathVariable UUID id) {
        User user = userService.getCurrentUser();
        return ResponseEntity.ok(contentService.getCollectionById(id, user));
    }

    @GetMapping("/collections/{id}/exercises")
    public ResponseEntity<List<ExerciseDTO>> getExercisesForCollection(@PathVariable UUID id) {
        User user = userService.getCurrentUser();
        return ResponseEntity.ok(contentService.getExercisesForCollection(id, user));
    }

    @GetMapping("/exercises/{id}")
    public ResponseEntity<ExerciseDTO> getExercise(@PathVariable UUID id) {
    public ResponseEntity<ExerciseDTO> getExercise(
            @PathVariable UUID id,
            @RequestParam(required = false) UUID collectionId) {
        User user = userService.getCurrentUser();
        return ResponseEntity.ok(contentService.getExerciseVersion(id, user));
        return ResponseEntity.ok(contentService.getExerciseVersion(id, collectionId, user));
    }

    @GetMapping("/exercises/{id}/public-tests")
    public ResponseEntity<List<PublicTestDTO>> getPublicTests(@PathVariable UUID id) {
        User user = userService.getCurrentUser();
        return ResponseEntity.ok(contentService.getPublicTests(id, user));
    }
}

