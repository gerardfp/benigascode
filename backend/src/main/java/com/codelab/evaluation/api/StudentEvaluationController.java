package com.codelab.evaluation.api;

import com.codelab.evaluation.dto.EvaluationDTO;
import com.codelab.evaluation.service.EvaluationService;
import com.codelab.identity.domain.User;
import com.codelab.identity.service.UserService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1")
public class StudentEvaluationController {

    private final EvaluationService evaluationService;
    private final UserService userService;

    public StudentEvaluationController(EvaluationService evaluationService, UserService userService) {
        this.evaluationService = evaluationService;
        this.userService = userService;
    }

    @GetMapping("/submissions/{id}/evaluations")
    public ResponseEntity<List<EvaluationDTO>> getEvaluations(@PathVariable UUID id) {
        User user = userService.getCurrentUser();
        return ResponseEntity.ok(evaluationService.getEvaluationsForSubmission(id, user));
    }
}

