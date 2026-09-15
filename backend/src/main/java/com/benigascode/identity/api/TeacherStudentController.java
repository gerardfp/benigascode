package com.benigascode.identity.api;

import com.benigascode.identity.domain.User;
import com.benigascode.identity.dto.StudentTagRequest;
import com.benigascode.identity.dto.TeacherStudentDTO;
import com.benigascode.identity.service.TeacherStudentService;
import com.benigascode.identity.service.UserService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/teacher/students")
@PreAuthorize("hasAnyRole('TEACHER', 'ADMIN')")
public class TeacherStudentController {

    private final TeacherStudentService studentService;
    private final UserService userService;

    public TeacherStudentController(TeacherStudentService studentService, UserService userService) {
        this.studentService = studentService;
        this.userService = userService;
    }

    @GetMapping
    public ResponseEntity<List<TeacherStudentDTO>> listStudents(
            @RequestParam(required = false) UUID courseId,
            @RequestParam(required = false) UUID spaceId,
            @RequestParam(required = false) String tag,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String value,
            @RequestParam(required = false) String search) {
        UUID effectiveSpaceId = spaceId != null ? spaceId : courseId;
        return ResponseEntity.ok(studentService.listStudents(effectiveSpaceId, tag, category, value, search));
    }

    @PostMapping("/{studentId}/courses/{courseId}")
    public ResponseEntity<Void> assignCourse(
            @PathVariable UUID studentId,
            @PathVariable UUID courseId,
            @RequestParam(required = false) UUID groupId) {
        User teacher = userService.getCurrentUser();
        studentService.assignCourse(studentId, courseId, groupId, teacher);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/{studentId}/courses/{courseId}")
    public ResponseEntity<Void> unassignCourse(
            @PathVariable UUID studentId,
            @PathVariable UUID courseId) {
        User teacher = userService.getCurrentUser();
        studentService.unassignCourse(studentId, courseId, teacher);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{studentId}/tags")
    public ResponseEntity<Void> addTag(
            @PathVariable UUID studentId,
            @Valid @RequestBody StudentTagRequest request) {
        User teacher = userService.getCurrentUser();
        studentService.addTag(studentId, request.tag(), teacher);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/{studentId}/tags/{tag}")
    public ResponseEntity<Void> removeTag(
            @PathVariable UUID studentId,
            @PathVariable String tag) {
        User teacher = userService.getCurrentUser();
        studentService.removeTag(studentId, tag, teacher);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/tags")
    public ResponseEntity<List<String>> listAllTags() {
        return ResponseEntity.ok(studentService.listAllTags());
    }
}

