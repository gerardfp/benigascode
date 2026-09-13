package com.benigascode.learning.api;

import com.benigascode.identity.domain.User;
import com.benigascode.identity.dto.TeacherStudentDTO;
import com.benigascode.identity.dto.UserDTO;
import com.benigascode.identity.service.UserService;
import com.benigascode.learning.dto.*;
import com.benigascode.learning.service.LearningService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/teacher/courses")
@PreAuthorize("hasAnyRole('TEACHER', 'ADMIN')")
public class TeacherCourseController {

    private final LearningService learningService;
    private final UserService userService;

    public TeacherCourseController(LearningService learningService, UserService userService) {
        this.learningService = learningService;
        this.userService = userService;
    }

    // --- CURSOS ---

    @GetMapping
    public ResponseEntity<List<CourseDTO>> listCourses() {
        User user = userService.getCurrentUser();
        return ResponseEntity.ok(learningService.getCoursesForUser(user));
    }

    @PostMapping
    public ResponseEntity<CourseDTO> createCourse(@Valid @RequestBody CreateCourseRequest request) {
        User user = userService.getCurrentUser();
        CourseDTO course = learningService.createCourse(request, user);
        return ResponseEntity.status(HttpStatus.CREATED).body(course);
    }

    @GetMapping("/{id}")
    public ResponseEntity<CourseDTO> getCourse(@PathVariable UUID id) {
        User user = userService.getCurrentUser();
        return ResponseEntity.ok(learningService.getCourseById(id, user));
    }

    // --- PROFESORES DEL CURSO ---

    @GetMapping("/{id}/teachers")
    public ResponseEntity<List<UserDTO>> getCourseTeachers(@PathVariable UUID id) {
        return ResponseEntity.ok(learningService.getTeachersForCourse(id));
    }

    @GetMapping("/{id}/available-teachers")
    public ResponseEntity<List<UserDTO>> getAvailableTeachers(@PathVariable UUID id) {
        return ResponseEntity.ok(learningService.getAvailableTeachersForCourse(id));
    }

    @PostMapping("/{id}/teachers/{teacherId}")
    public ResponseEntity<Void> addTeacherToCourse(@PathVariable UUID id, @PathVariable UUID teacherId) {
        User currentUser = userService.getCurrentUser();
        learningService.addTeacherToCourse(id, teacherId, currentUser);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/{id}/teachers/{teacherId}")
    public ResponseEntity<Void> removeTeacherFromCourse(@PathVariable UUID id, @PathVariable UUID teacherId) {
        User currentUser = userService.getCurrentUser();
        learningService.removeTeacherFromCourse(id, teacherId, currentUser);
        return ResponseEntity.noContent().build();
    }

    // --- ALUMNOS DEL CURSO ---

    @GetMapping("/{id}/students")
    public ResponseEntity<List<TeacherStudentDTO>> getCourseStudents(@PathVariable UUID id) {
        return ResponseEntity.ok(learningService.getStudentsForCourse(id));
    }

    @PostMapping("/{id}/students")
    public ResponseEntity<Void> enrollStudentToCourse(@PathVariable UUID id, @Valid @RequestBody EnrollStudentRequest request) {
        User user = userService.getCurrentUser();
        learningService.enrollStudent(id, request.userId(), request.groupId(), user);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/{id}/enroll")
    public ResponseEntity<Void> enrollStudentLegacy(@PathVariable UUID id, @Valid @RequestBody EnrollStudentRequest request) {
        User user = userService.getCurrentUser();
        learningService.enrollStudent(id, request.userId(), request.groupId(), user);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/{id}/students/{studentId}")
    public ResponseEntity<Void> unenrollStudentFromCourse(@PathVariable UUID id, @PathVariable UUID studentId) {
        User user = userService.getCurrentUser();
        learningService.unenrollStudent(id, studentId, user);
        return ResponseEntity.noContent().build();
    }

    // --- GRUPOS ---

    @GetMapping("/{id}/groups")
    public ResponseEntity<List<GroupDTO>> listGroups(@PathVariable UUID id) {
        User user = userService.getCurrentUser();
        return ResponseEntity.ok(learningService.getGroupsForCourse(id, user));
    }

    @PostMapping("/{id}/groups")
    public ResponseEntity<GroupDTO> createGroup(@PathVariable UUID id, @Valid @RequestBody CreateGroupRequest request) {
        User user = userService.getCurrentUser();
        GroupDTO group = learningService.createGroup(id, request, user);
        return ResponseEntity.status(HttpStatus.CREATED).body(group);
    }

    // --- COLECCIONES Y ASIGNACIONES ---

    @GetMapping("/{id}/collections")
    public ResponseEntity<List<CourseCollectionDTO>> getCourseCollections(@PathVariable UUID id) {
        return ResponseEntity.ok(learningService.getCourseCollectionsWithDetails(id));
    }

    @PostMapping("/{id}/collections/{collectionId}")
    public ResponseEntity<Void> assignCollectionToCourse(
            @PathVariable UUID id,
            @PathVariable UUID collectionId,
            @RequestBody(required = false) AssignCourseCollectionRequest request) {
        learningService.assignCollectionToCourse(id, collectionId, request);
        return ResponseEntity.ok().build();
    }

    @PutMapping("/{id}/collections/{collectionId}/assignments")
    public ResponseEntity<Void> updateCollectionAssignments(
            @PathVariable UUID id,
            @PathVariable UUID collectionId,
            @RequestBody AssignCourseCollectionRequest request) {
        learningService.updateCollectionAssignment(id, collectionId, request);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/{id}/collections/{collectionId}")
    public ResponseEntity<Void> removeCollectionFromCourse(@PathVariable UUID id, @PathVariable UUID collectionId) {
        learningService.removeCollectionFromCourse(id, collectionId);
        return ResponseEntity.noContent().build();
    }
}
