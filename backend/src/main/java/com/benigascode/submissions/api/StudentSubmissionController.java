package com.benigascode.submissions.api;

import com.benigascode.identity.domain.User;
import com.benigascode.identity.service.UserService;
import com.benigascode.submissions.dto.*;
import com.benigascode.submissions.service.StudentProgressService;
import com.benigascode.submissions.service.StudentWorkspaceService;
import com.benigascode.submissions.service.SubmissionService;
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
    private final StudentWorkspaceService workspaceService;
    private final StudentProgressService progressService;
    private final UserService userService;

    public StudentSubmissionController(SubmissionService submissionService,
                                       StudentWorkspaceService workspaceService,
                                       StudentProgressService progressService,
                                       UserService userService) {
        this.submissionService = submissionService;
        this.workspaceService = workspaceService;
        this.progressService = progressService;
        this.userService = userService;
    }

    // 1. Entregar solución oficial en una actividad docente
    @PostMapping("/activities/{activityId}/exercises/{exerciseId}/submissions")
    public ResponseEntity<SubmissionDTO> submitInActivity(
            @PathVariable UUID activityId,
            @PathVariable UUID exerciseId,
            @Valid @RequestBody CreateSubmissionRequest request) {
        User student = userService.getCurrentUser();
        SubmissionDTO submission = submissionService.createSubmission(activityId, exerciseId, request, student);
        return ResponseEntity.status(HttpStatus.CREATED).body(submission);
    }

    // 2. Entregar solución oficial directa de ejercicio (práctica independiente)
    @PostMapping("/exercises/{exerciseId}/submissions")
    public ResponseEntity<SubmissionDTO> submitDirect(
            @PathVariable UUID exerciseId,
            @Valid @RequestBody CreateSubmissionRequest request) {
        User student = userService.getCurrentUser();
        SubmissionDTO submission = submissionService.createDirectSubmission(exerciseId, request, student);
        return ResponseEntity.status(HttpStatus.CREATED).body(submission);
    }

    // 3. Workspace del alumno (borrador editable)
    @GetMapping("/exercises/{exerciseId}/workspace")
    public ResponseEntity<StudentWorkspaceDTO> getWorkspace(@PathVariable UUID exerciseId) {
        User student = userService.getCurrentUser();
        return ResponseEntity.ok(workspaceService.getWorkspace(exerciseId, student));
    }

    @PutMapping("/exercises/{exerciseId}/workspace")
    public ResponseEntity<StudentWorkspaceDTO> saveWorkspace(
            @PathVariable UUID exerciseId,
            @Valid @RequestBody SaveWorkspaceRequest request) {
        User student = userService.getCurrentUser();
        return ResponseEntity.ok(workspaceService.saveWorkspace(exerciseId, request, student));
    }

    // 4. Historial de entregas del alumno en un ejercicio
    @GetMapping("/exercises/{exerciseId}/submissions")
    public ResponseEntity<List<SubmissionDTO>> getExerciseSubmissions(@PathVariable UUID exerciseId) {
        User student = userService.getCurrentUser();
        return ResponseEntity.ok(submissionService.getSubmissionHistory(exerciseId, student));
    }

    // 5. Última entrega del alumno en un ejercicio
    @GetMapping("/exercises/{exerciseId}/submissions/latest")
    public ResponseEntity<SubmissionDTO> getLatestExerciseSubmission(
            @PathVariable UUID exerciseId,
            @RequestParam(required = false) UUID activityId) {
        User student = userService.getCurrentUser();
        SubmissionDTO sub = submissionService.getLatestSubmission(exerciseId, activityId, student);
        return sub != null ? ResponseEntity.ok(sub) : ResponseEntity.noContent().build();
    }

    // 6. Consultar entrega por ID
    @GetMapping("/submissions/{id}")
    public ResponseEntity<SubmissionDTO> getSubmission(@PathVariable UUID id) {
        User user = userService.getCurrentUser();
        return ResponseEntity.ok(submissionService.getSubmissionById(id, user));
    }

    // 7. Listado global de todas mis entregas
    @GetMapping("/me/submissions")
    public ResponseEntity<List<SubmissionDTO>> listMySubmissions() {
        User student = userService.getCurrentUser();
        return ResponseEntity.ok(submissionService.getMySubmissions(student));
    }

    // 8. Progreso del alumno actual
    @GetMapping("/me/progress")
    public ResponseEntity<List<StudentProgressDTO>> getMyProgress() {
        User student = userService.getCurrentUser();
        return ResponseEntity.ok(progressService.getMyProgress(student));
    }

    // 8.1 Progreso del alumno en un ejercicio específico
    @GetMapping("/me/progress/exercises/{exerciseId}")
    public ResponseEntity<StudentProgressDTO> getMyProgressForExercise(@PathVariable UUID exerciseId) {
        User student = userService.getCurrentUser();
        return progressService.getMyProgressForExercise(exerciseId, student)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    // 8.2 Insights analíticos del alumno
    @GetMapping("/me/insights")
    public ResponseEntity<StudentInsightsDTO> getMyInsights() {
        User student = userService.getCurrentUser();
        return ResponseEntity.ok(progressService.getMyInsights(student));
    }

    // 9. Pruebas preliminares públicas
    @PostMapping("/exercises/{exerciseVersionId}/preview-runs")
    public ResponseEntity<PreviewRunResponse> preview(
            @PathVariable UUID exerciseVersionId,
            @Valid @RequestBody PreviewRunRequest request) {
        User user = userService.getCurrentUser();
        return ResponseEntity.ok(submissionService.previewRun(exerciseVersionId, request, user));
    }
}
