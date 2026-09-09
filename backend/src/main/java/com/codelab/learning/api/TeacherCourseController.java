package com.codelab.learning.api;

import com.codelab.identity.domain.User;
import com.codelab.identity.service.UserService;
import com.codelab.learning.dto.*;
import com.codelab.learning.service.LearningService;
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

    @PostMapping("/{id}/enroll")
    public ResponseEntity<Void> enrollStudent(@PathVariable UUID id, @Valid @RequestBody EnrollStudentRequest request) {
        User user = userService.getCurrentUser();
        learningService.enrollStudent(id, request.userId(), request.groupId(), user);
        return ResponseEntity.ok().build();
    }
}

