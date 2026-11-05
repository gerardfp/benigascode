package com.benigascode.submissions.service;

import com.benigascode.content.domain.Exercise;
import com.benigascode.content.repository.ExerciseRepository;
import com.benigascode.content.repository.ExerciseVersionRepository;
import com.benigascode.content.service.ContentService;
import com.benigascode.identity.domain.User;
import com.benigascode.submissions.domain.StudentWorkspace;
import com.benigascode.submissions.dto.PreviewRunRequest;
import com.benigascode.submissions.repository.StudentWorkspaceRepository;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import java.util.Optional;
import java.util.UUID;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class StudentWorkspaceServiceTest {
    @Test
    void recordsPreviewWithoutOverwritingSavedDraft() {
        var repository = mock(StudentWorkspaceRepository.class);
        var exercises = mock(ExerciseRepository.class);
        var student = mock(User.class);
        UUID studentId = UUID.randomUUID();
        when(student.getId()).thenReturn(studentId);
        var exercise = new Exercise("example");
        exercise.setId(UUID.randomUUID());
        var workspace = new StudentWorkspace(student, exercise, "saved draft", "python");
        when(exercises.findById(exercise.getId())).thenReturn(Optional.of(exercise));
        when(repository.findByStudentIdAndExerciseId(studentId, exercise.getId())).thenReturn(Optional.of(workspace));
        var service = new StudentWorkspaceService(repository, exercises, mock(ExerciseVersionRepository.class), mock(ContentService.class));
        service.recordPreview(exercise.getId(), new PreviewRunRequest("temporary code", "java"), student);
        assertNotNull(workspace.getLastPreviewAt());
        assertEquals("saved draft", workspace.getSourceCode());
        assertEquals("python", workspace.getLanguage());
        verify(repository).save(workspace);
    }

    @Test
    void recordsFirstPreviewWithoutAnySubmissionOrDraft() {
        var repository = mock(StudentWorkspaceRepository.class);
        var exercises = mock(ExerciseRepository.class);
        var student = mock(User.class);
        when(student.getId()).thenReturn(UUID.randomUUID());
        var exercise = new Exercise("example");
        exercise.setId(UUID.randomUUID());
        when(exercises.findById(exercise.getId())).thenReturn(Optional.of(exercise));
        when(repository.findByStudentIdAndExerciseId(student.getId(), exercise.getId())).thenReturn(Optional.empty());
        var service = new StudentWorkspaceService(repository, exercises, mock(ExerciseVersionRepository.class), mock(ContentService.class));
        service.recordPreview(exercise.getId(), new PreviewRunRequest("print(1)", "python"), student);
        var captured = ArgumentCaptor.forClass(StudentWorkspace.class);
        verify(repository).save(captured.capture());
        assertNotNull(captured.getValue().getLastPreviewAt());
        assertEquals("print(1)", captured.getValue().getSourceCode());
    }
}
