package com.benigascode.learning.api;

import com.benigascode.content.dto.CollectionDTO;
import com.benigascode.identity.domain.User;
import com.benigascode.identity.dto.UserDTO;
import com.benigascode.identity.service.UserService;
import com.benigascode.learning.dto.CreateTeachingSpaceRequest;
import com.benigascode.learning.dto.TeachingSpaceDTO;
import com.benigascode.learning.dto.UpdateTeachingSpaceRequest;
import com.benigascode.learning.service.TeachingSpaceService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping({"/api/v1/teacher/spaces", "/api/v1/teacher/teaching-spaces"})
@PreAuthorize("hasAnyRole('TEACHER', 'ADMIN')")
public class TeacherTeachingSpaceController {

    private final TeachingSpaceService teachingSpaceService;
    private final UserService userService;

    public TeacherTeachingSpaceController(TeachingSpaceService teachingSpaceService, UserService userService) {
        this.teachingSpaceService = teachingSpaceService;
        this.userService = userService;
    }

    @GetMapping
    public ResponseEntity<List<TeachingSpaceDTO>> listSpaces() {
        User user = userService.getCurrentUser();
        return ResponseEntity.ok(teachingSpaceService.getSpacesForUser(user));
    }

    @PostMapping
    public ResponseEntity<TeachingSpaceDTO> createSpace(@Valid @RequestBody CreateTeachingSpaceRequest request) {
        User user = userService.getCurrentUser();
        TeachingSpaceDTO created = teachingSpaceService.createSpace(request, user);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @GetMapping("/{id}")
    public ResponseEntity<TeachingSpaceDTO> getSpace(@PathVariable UUID id) {
        User user = userService.getCurrentUser();
        return ResponseEntity.ok(teachingSpaceService.getSpaceById(id, user));
    }

    @PutMapping("/{id}")
    public ResponseEntity<TeachingSpaceDTO> updateSpace(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateTeachingSpaceRequest request) {
        User user = userService.getCurrentUser();
        return ResponseEntity.ok(teachingSpaceService.updateSpace(id, request, user));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteSpace(@PathVariable UUID id) {
        User user = userService.getCurrentUser();
        teachingSpaceService.deleteSpace(id, user);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}/students")
    public ResponseEntity<List<UserDTO>> getSpaceStudents(@PathVariable UUID id) {
        User user = userService.getCurrentUser();
        return ResponseEntity.ok(teachingSpaceService.getStudentsInSpace(id, user));
    }

    @GetMapping("/{id}/teachers")
    public ResponseEntity<List<UserDTO>> getSpaceTeachers(@PathVariable UUID id) {
        return ResponseEntity.ok(teachingSpaceService.getTeachersInSpace(id));
    }

    @PostMapping("/{id}/teachers/{teacherId}")
    public ResponseEntity<Void> addTeacher(@PathVariable UUID id, @PathVariable UUID teacherId) {
        User user = userService.getCurrentUser();
        teachingSpaceService.addTeacherToSpace(id, teacherId, user);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/{id}/teachers/{teacherId}")
    public ResponseEntity<Void> removeTeacher(@PathVariable UUID id, @PathVariable UUID teacherId) {
        User user = userService.getCurrentUser();
        teachingSpaceService.removeTeacherFromSpace(id, teacherId, user);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}/collections")
    public ResponseEntity<List<CollectionDTO>> getSpaceCollections(@PathVariable UUID id) {
        return ResponseEntity.ok(teachingSpaceService.getCollectionsInSpace(id));
    }

    @PostMapping("/{id}/collections/{collectionId}")
    public ResponseEntity<Void> addCollection(@PathVariable UUID id, @PathVariable UUID collectionId) {
        User user = userService.getCurrentUser();
        teachingSpaceService.addCollectionToSpace(id, collectionId, user);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/{id}/collections/{collectionId}")
    public ResponseEntity<Void> removeCollection(@PathVariable UUID id, @PathVariable UUID collectionId) {
        User user = userService.getCurrentUser();
        teachingSpaceService.removeCollectionFromSpace(id, collectionId, user);
        return ResponseEntity.noContent().build();
    }
}

