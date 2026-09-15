package com.benigascode.submissions.api;

import com.benigascode.identity.domain.User;
import com.benigascode.identity.service.UserService;
import com.benigascode.submissions.dto.*;
import com.benigascode.submissions.service.StudentProgressService;
import com.benigascode.submissions.service.SubmissionService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/teacher")
@PreAuthorize("hasAnyRole('TEACHER', 'ADMIN')")
public class TeacherSubmissionController {

    private final SubmissionService submissionService;
    private final StudentProgressService progressService;
    private final UserService userService;

    public TeacherSubmissionController(SubmissionService submissionService,
                                       StudentProgressService progressService,
                                       UserService userService) {
        this.submissionService = submissionService;
        this.progressService = progressService;
        this.userService = userService;
    }

    // 1. Insights generales, por grupo o por alumno
    @GetMapping("/insights")
    public ResponseEntity<TeacherInsightsDTO> getTeacherInsights(
            @RequestParam(required = false) UUID courseId,
            @RequestParam(required = false) UUID groupId,
            @RequestParam(required = false) UUID studentId) {
        User teacher = userService.getCurrentUser();
        return ResponseEntity.ok(progressService.getTeacherInsights(courseId, groupId, studentId, teacher));
    }

    // 2. Explorador integral de entregas con filtros avanzados
    @GetMapping("/submissions")
    public ResponseEntity<List<TeacherSubmissionItemDTO>> getSubmissions(
            @RequestParam(required = false) UUID courseId,
            @RequestParam(required = false) UUID groupId,
            @RequestParam(required = false) UUID studentId,
            @RequestParam(required = false) UUID exerciseId,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String search) {
        User teacher = userService.getCurrentUser();
        return ResponseEntity.ok(submissionService.getTeacherSubmissions(courseId, groupId, studentId, exerciseId, status, search, teacher));
    }

    // 3. Detalle completo de una entrega con código y tests
    @GetMapping("/submissions/{id}")
    public ResponseEntity<TeacherSubmissionDetailDTO> getSubmissionDetail(@PathVariable UUID id) {
        User teacher = userService.getCurrentUser();
        return ResponseEntity.ok(submissionService.getTeacherSubmissionDetail(id, teacher));
    }

    // Endpoints por espacio docente y legados por compatibilidad
    @GetMapping({"/spaces/{id}/submissions", "/courses/{id}/submissions"})
    public ResponseEntity<List<SubmissionDTO>> getSubmissionsForSpace(@PathVariable UUID id) {
        User teacher = userService.getCurrentUser();
        return ResponseEntity.ok(submissionService.getSubmissionsForCourse(id, teacher));
    }

    @GetMapping({"/spaces/{id}/progress", "/courses/{id}/progress"})
    public ResponseEntity<List<StudentProgressDTO>> getSpaceProgress(@PathVariable UUID id) {
        User teacher = userService.getCurrentUser();
        return ResponseEntity.ok(progressService.getCourseProgress(id, teacher));
    }

    @GetMapping("/students/{studentId}/progress")
    public ResponseEntity<List<StudentProgressDTO>> getStudentProgress(@PathVariable UUID studentId) {
        User teacher = userService.getCurrentUser();
        return ResponseEntity.ok(progressService.getStudentProgress(studentId, teacher));
    }
}
