package com.codelab.submissions.api;

import com.codelab.identity.domain.User;
import com.codelab.identity.service.UserService;
import com.codelab.submissions.dto.CreateSubmissionRequest;
import com.codelab.submissions.dto.PreviewRunRequest;
import com.codelab.submissions.dto.PreviewRunResponse;
import com.codelab.submissions.dto.SubmissionDTO;
import com.codelab.submissions.service.SubmissionService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1")
public class StudentSubmissionController {

    private final SubmissionService submissionService;
    private final UserService userService;

    public StudentSubmissionController(SubmissionService submissionService, UserService userService) {
        this.submissionService = submissionService;
        this.userService = userService;
    }

    @PostMapping("/activities/{activityId}/exercises/{exerciseId}/submissions")
    public ResponseEntity<SubmissionDTO> submit(
            @PathVariable UUID activityId,
            @PathVariable UUID exerciseId,
            @Valid @RequestBody CreateSubmissionRequest request) {
        User student = userService.getCurrentUser();
        SubmissionDTO submission = submissionService.createSubmission(activityId, exerciseId, request, student);
        return ResponseEntity.status(HttpStatus.CREATED).body(submission);
    }

    @GetMapping("/submissions/{id}")
    public ResponseEntity<SubmissionDTO> getSubmission(@PathVariable UUID id) {
        User user = userService.getCurrentUser();
        return ResponseEntity.ok(submissionService.getSubmissionById(id, user));
    }

    @GetMapping("/me/submissions")
    public ResponseEntity<List<SubmissionDTO>> listMySubmissions() {
        User student = userService.getCurrentUser();
        return ResponseEntity.ok(submissionService.getMySubmissions(student));
    }

    @PostMapping("/exercises/{exerciseVersionId}/preview-runs")
    public ResponseEntity<PreviewRunResponse> preview(
            @PathVariable UUID exerciseVersionId,
            @Valid @RequestBody PreviewRunRequest request) {
        User user = userService.getCurrentUser();
        return ResponseEntity.ok(submissionService.previewRun(exerciseVersionId, request, user));
    }
}

