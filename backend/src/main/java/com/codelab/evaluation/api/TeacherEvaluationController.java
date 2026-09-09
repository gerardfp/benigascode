package com.codelab.evaluation.api;

import com.codelab.evaluation.dto.EvaluationDTO;
import com.codelab.evaluation.dto.ReevaluateRequest;
import com.codelab.evaluation.service.EvaluationService;
import com.codelab.identity.domain.User;
import com.codelab.identity.service.UserService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/teacher")
@PreAuthorize("hasAnyRole('TEACHER', 'ADMIN')")
public class TeacherEvaluationController {

    private final EvaluationService evaluationService;
    private final UserService userService;

    public TeacherEvaluationController(EvaluationService evaluationService, UserService userService) {
        this.evaluationService = evaluationService;
        this.userService = userService;
    }

    @PostMapping("/evaluations/{submissionId}/reevaluate")
    public ResponseEntity<EvaluationDTO> reevaluate(
            @PathVariable UUID submissionId,
            @Valid @RequestBody ReevaluateRequest request) {
        User teacher = userService.getCurrentUser();
        EvaluationDTO evaluation = evaluationService.reevaluate(submissionId, request.reason(), teacher);
        return ResponseEntity.ok(evaluation);
    }
}

