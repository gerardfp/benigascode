package com.benigascode.submissions.service;

import com.benigascode.activities.domain.Activity;
import com.benigascode.common.exception.AccessDeniedException;
import com.benigascode.content.domain.Exercise;
import com.benigascode.evaluation.domain.Evaluation;
import com.benigascode.identity.domain.Role;
import com.benigascode.identity.domain.User;
import com.benigascode.learning.repository.CourseMembershipRepository;
import com.benigascode.submissions.domain.StudentProgress;
import com.benigascode.submissions.domain.Submission;
import com.benigascode.submissions.dto.StudentProgressDTO;
import com.benigascode.submissions.repository.StudentProgressRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class StudentProgressService {

    private final StudentProgressRepository studentProgressRepository;
    private final CourseMembershipRepository membershipRepository;

    public StudentProgressService(StudentProgressRepository studentProgressRepository,
                                  CourseMembershipRepository membershipRepository) {
        this.studentProgressRepository = studentProgressRepository;
        this.membershipRepository = membershipRepository;
    }

    @Transactional
    public void updateProgress(Submission submission, Evaluation evaluation) {
        User student = submission.getStudent();
        Exercise exercise = submission.getExerciseVersion().getExercise();
        Activity activity = submission.getActivityVersion() != null ? submission.getActivityVersion().getActivity() : null;

        Optional<StudentProgress> existingOpt = activity != null ?
                studentProgressRepository.findByStudentIdAndExerciseIdAndActivityId(student.getId(), exercise.getId(), activity.getId()) :
                studentProgressRepository.findByStudentIdAndExerciseIdAndActivityIsNull(student.getId(), exercise.getId());

        StudentProgress progress = existingOpt.orElseGet(() -> new StudentProgress(student, exercise, activity));

        progress.setTotalSubmissions(progress.getTotalSubmissions() + 1);
        progress.setConsumedAttempts(progress.getConsumedAttempts() + 1);
        progress.setLastSubmission(submission);
        progress.setLastEvaluation(evaluation);
        progress.setLastStatus(evaluation.getStatus());

        BigDecimal score = evaluation.getScore() != null ? evaluation.getScore() : BigDecimal.ZERO;
        if (score.compareTo(progress.getBestScore()) > 0) {
            progress.setBestScore(score);
        }

        if (score.compareTo(BigDecimal.valueOf(100)) >= 0) {
            progress.setStatus("MASTERED");
            if (progress.getCompletedAt() == null) {
                progress.setCompletedAt(Instant.now());
            }
        } else if (score.compareTo(BigDecimal.valueOf(50)) >= 0) {
            if (!"MASTERED".equals(progress.getStatus())) {
                progress.setStatus("PASSED");
            }
            if (progress.getCompletedAt() == null) {
                progress.setCompletedAt(Instant.now());
            }
        } else {
            if (!"MASTERED".equals(progress.getStatus()) && !"PASSED".equals(progress.getStatus())) {
                progress.setStatus("ATTEMPTED");
            }
        }

        progress.setUpdatedAt(Instant.now());
        studentProgressRepository.save(progress);
    }

    @Transactional(readOnly = true)
    public List<StudentProgressDTO> getMyProgress(User student) {
        return studentProgressRepository.findByStudentIdOrderByUpdatedAtDesc(student.getId()).stream()
                .map(StudentProgressDTO::fromEntity)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<StudentProgressDTO> getCourseProgress(UUID courseId, User teacher) {
        if (teacher.getRole() != Role.ADMIN && !membershipRepository.existsByUserIdAndCourseIdAndRole(teacher.getId(), courseId, "TEACHER")) {
            throw new AccessDeniedException("No tienes permisos de profesor en este curso");
        }
        return studentProgressRepository.findByCourseId(courseId).stream()
                .map(StudentProgressDTO::fromEntity)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<StudentProgressDTO> getStudentProgress(UUID studentId, User teacher) {
        if (teacher.getRole() != Role.ADMIN && teacher.getRole() != Role.TEACHER) {
            throw new AccessDeniedException("No tienes permisos para ver el progreso de otros alumnos");
        }
        return studentProgressRepository.findByStudentIdOrderByUpdatedAtDesc(studentId).stream()
                .map(StudentProgressDTO::fromEntity)
                .toList();
    }
}

