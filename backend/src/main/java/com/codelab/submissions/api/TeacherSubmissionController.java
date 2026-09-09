package com.codelab.submissions.api;

import com.codelab.identity.domain.User;
import com.codelab.identity.service.UserService;
import com.codelab.submissions.dto.SubmissionDTO;
import com.codelab.submissions.service.SubmissionService;
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
    private final UserService userService;

    public TeacherSubmissionController(SubmissionService submissionService, UserService userService) {
        this.submissionService = submissionService;
        this.userService = userService;
    }

    @GetMapping("/courses/{courseId}/submissions")
    public ResponseEntity<List<SubmissionDTO>> getSubmissionsForCourse(@PathVariable UUID courseId) {
        User teacher = userService.getCurrentUser();
        return ResponseEntity.ok(submissionService.getSubmissionsForCourse(courseId, teacher));
    }
}

