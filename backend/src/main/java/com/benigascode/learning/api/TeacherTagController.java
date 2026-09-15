package com.benigascode.learning.api;

import com.benigascode.identity.domain.User;
import com.benigascode.identity.dto.UserDTO;
import com.benigascode.identity.service.UserService;
import com.benigascode.learning.dto.*;
import com.benigascode.learning.service.ContextService;
import com.benigascode.learning.service.TagService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/teacher/tags")
@PreAuthorize("hasAnyRole('TEACHER', 'ADMIN')")
public class TeacherTagController {

    private final TagService tagService;
    private final ContextService contextService;
    private final UserService userService;

    public TeacherTagController(TagService tagService, ContextService contextService, UserService userService) {
        this.tagService = tagService;
        this.contextService = contextService;
        this.userService = userService;
    }

    @GetMapping
    public ResponseEntity<List<TagDTO>> listTags(@RequestParam(required = false) String category) {
        return ResponseEntity.ok(tagService.listTags(category));
    }

    @GetMapping("/categories")
    public ResponseEntity<List<String>> listCategories() {
        return ResponseEntity.ok(tagService.listCategories());
    }

    @PostMapping
    public ResponseEntity<TagDTO> createTag(@Valid @RequestBody CreateTagRequest request) {
        TagDTO created = tagService.createTag(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteTag(@PathVariable UUID id) {
        tagService.deleteTag(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/students/{studentId}")
    public ResponseEntity<List<StudentTagDTO>> getStudentTags(
            @PathVariable UUID studentId,
            @RequestParam(defaultValue = "false") boolean activeOnly) {
        return ResponseEntity.ok(tagService.getStudentTags(studentId, activeOnly));
    }

    @PostMapping("/students/{studentId}")
    public ResponseEntity<StudentTagDTO> assignTag(
            @PathVariable UUID studentId,
            @Valid @RequestBody AssignStudentTagRequest request) {
        User teacher = userService.getCurrentUser();
        StudentTagDTO created = tagService.assignTagToStudent(studentId, request, teacher);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @DeleteMapping("/assignments/{assignmentId}")
    public ResponseEntity<Void> revokeAssignment(@PathVariable UUID assignmentId) {
        User teacher = userService.getCurrentUser();
        tagService.revokeTagAssignment(assignmentId, teacher);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/students/{studentId}/{tagId}")
    public ResponseEntity<Void> revokeTag(
            @PathVariable UUID studentId,
            @PathVariable UUID tagId) {
        User teacher = userService.getCurrentUser();
        tagService.revokeTagFromStudent(studentId, tagId, teacher);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/context/preview")
    public ResponseEntity<ContextPreviewDTO> previewContext(@RequestBody ContextDTO context) {
        List<UUID> tagIds = context.getSafeTagIds();
        List<User> matching = contextService.findMatchingStudents(tagIds);
        List<UserDTO> dtoList = matching.stream().map(UserDTO::fromEntity).toList();
        return ResponseEntity.ok(new ContextPreviewDTO(dtoList.size(), dtoList));
    }
}
