package com.benigascode.submissions.api;

import com.benigascode.identity.domain.User;
import com.benigascode.identity.service.UserService;
import com.benigascode.submissions.dto.StudentProgressDTO;
import com.benigascode.submissions.dto.SubmissionDTO;
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

    @GetMapping("/courses/{courseId}/submissions")
    public ResponseEntity<List<SubmissionDTO>> getSubmissionsForCourse(@PathVariable UUID courseId) {
        User teacher = userService.getCurrentUser();
        return ResponseEntity.ok(submissionService.getSubmissionsForCourse(courseId, teacher));
    }

    @GetMapping("/courses/{courseId}/progress")
    public ResponseEntity<List<StudentProgressDTO>> getCourseProgress(@PathVariable UUID courseId) {
        User teacher = userService.getCurrentUser();
        return ResponseEntity.ok(progressService.getCourseProgress(courseId, teacher));
    }

    @GetMapping("/students/{studentId}/progress")
    public ResponseEntity<List<StudentProgressDTO>> getStudentProgress(@PathVariable UUID studentId) {
        User teacher = userService.getCurrentUser();
        return ResponseEntity.ok(progressService.getStudentProgress(studentId, teacher));
    }
}
