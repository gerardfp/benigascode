package com.benigascode.submissions.service;

import com.benigascode.common.exception.ResourceNotFoundException;
import com.benigascode.content.domain.Exercise;
import com.benigascode.content.domain.ExerciseVersion;
import com.benigascode.content.repository.ExerciseRepository;
import com.benigascode.content.repository.ExerciseVersionRepository;
import com.benigascode.content.service.ContentService;
import com.benigascode.common.util.LanguageDetector;
import com.benigascode.identity.domain.User;
import com.benigascode.submissions.domain.StudentWorkspace;
import com.benigascode.submissions.dto.SaveWorkspaceRequest;
import com.benigascode.submissions.dto.StudentWorkspaceDTO;
import com.benigascode.submissions.repository.StudentWorkspaceRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.UUID;

@Service
public class StudentWorkspaceService {

    private final StudentWorkspaceRepository workspaceRepository;
    private final ExerciseRepository exerciseRepository;
    private final ExerciseVersionRepository exerciseVersionRepository;
    private final ContentService contentService;

    public StudentWorkspaceService(StudentWorkspaceRepository workspaceRepository,
                                   ExerciseRepository exerciseRepository,
                                   ExerciseVersionRepository exerciseVersionRepository,
                                   ContentService contentService) {
        this.workspaceRepository = workspaceRepository;
        this.exerciseRepository = exerciseRepository;
        this.exerciseVersionRepository = exerciseVersionRepository;
        this.contentService = contentService;
    }

    private Exercise resolveExercise(UUID idOrVersionId) {
        return exerciseRepository.findById(idOrVersionId)
                .or(() -> exerciseVersionRepository.findById(idOrVersionId).map(ExerciseVersion::getExercise))
                .orElseThrow(() -> new ResourceNotFoundException("Ejercicio no encontrado"));
    }

    @Transactional(readOnly = true)
    public StudentWorkspaceDTO getWorkspace(UUID exerciseIdOrVersionId, User student) {
        Exercise exercise = resolveExercise(exerciseIdOrVersionId);
        return workspaceRepository.findByStudentIdAndExerciseId(student.getId(), exercise.getId())
                .map(ws -> new StudentWorkspaceDTO(exercise.getId(), ws.getSourceCode(), ws.getUpdatedAt(), false, ws.getLanguage()))
                .orElseGet(() -> {
                    ExerciseVersion version = exerciseVersionRepository.findLatestByExerciseId(exercise.getId()).orElse(null);
                    String starterCode = version != null ? contentService.resolveStarterCode(version, null) : "";
                    if (starterCode == null) {
                        starterCode = "";
                    }
                    String defaultFallback = (version != null && version.getLanguage() != null && !"multi".equalsIgnoreCase(version.getLanguage())) ? version.getLanguage() : "java";
                    String lang = LanguageDetector.detect(starterCode, defaultFallback);
                    return new StudentWorkspaceDTO(exercise.getId(), starterCode, null, true, lang);
                });
    }

    @Transactional
    public StudentWorkspaceDTO saveWorkspace(UUID exerciseIdOrVersionId, SaveWorkspaceRequest request, User student) {
        Exercise exercise = resolveExercise(exerciseIdOrVersionId);
        String lang = request.language();
        if (lang == null || lang.isBlank()) {
            lang = LanguageDetector.detect(request.sourceCode());
        }
        final String detectedLang = lang;

        StudentWorkspace workspace = workspaceRepository.findByStudentIdAndExerciseId(student.getId(), exercise.getId())
                .orElseGet(() -> new StudentWorkspace(student, exercise, request.sourceCode(), detectedLang));

        workspace.setSourceCode(request.sourceCode());
        workspace.setLanguage(detectedLang);
        workspace.setUpdatedAt(Instant.now());
        workspace = workspaceRepository.save(workspace);

        return new StudentWorkspaceDTO(exercise.getId(), workspace.getSourceCode(), workspace.getUpdatedAt(), false, workspace.getLanguage());
    }
}
