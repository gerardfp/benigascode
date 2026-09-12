package com.benigascode.evaluation.api;

import com.benigascode.evaluation.dto.EvaluationDTO;
import com.benigascode.evaluation.service.EvaluationService;
import com.benigascode.identity.domain.User;
import com.benigascode.identity.service.UserService;
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

    @GetMapping("/exercises/{exerciseId}/evaluations/latest")
    public ResponseEntity<EvaluationDTO> getLatestEvaluationForExercise(@PathVariable UUID exerciseId) {
        User user = userService.getCurrentUser();
        EvaluationDTO eval = evaluationService.getLatestEvaluationForExercise(exerciseId, user);
        return eval != null ? ResponseEntity.ok(eval) : ResponseEntity.noContent().build();
    }
}
