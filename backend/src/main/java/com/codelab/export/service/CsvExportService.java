package com.codelab.export.service;

import com.codelab.evaluation.domain.Evaluation;
import com.codelab.evaluation.repository.EvaluationRepository;
import com.codelab.submissions.domain.Submission;
import com.codelab.submissions.repository.SubmissionRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.StringWriter;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class CsvExportService {

    private final SubmissionRepository submissionRepository;
    private final EvaluationRepository evaluationRepository;

    public CsvExportService(SubmissionRepository submissionRepository, EvaluationRepository evaluationRepository) {
        this.submissionRepository = submissionRepository;
        this.evaluationRepository = evaluationRepository;
    }

    @Transactional(readOnly = true)
    public String exportSubmissionsCsv(UUID courseId) {
        List<Submission> submissions = submissionRepository.findByCourseId(courseId);

        StringWriter writer = new StringWriter();
        writer.write("submission_id,student_id,student_name,activity_name,exercise_title,language,status,score,created_at\n");

        for (Submission s : submissions) {
            Optional<Evaluation> evalOpt = evaluationRepository.findLatestBySubmissionId(s.getId());
            String score = evalOpt.map(e -> e.getScore().toString()).orElse("N/A");
            String evalStatus = evalOpt.map(Evaluation::getStatus).orElse(s.getStatus());

            writer.write(String.format("\"%s\",\"%s\",\"%s\",\"%s\",\"%s\",\"%s\",\"%s\",\"%s\",\"%s\"\n",
                    s.getId(),
                    s.getStudent().getId(),
                    escapeCsv(s.getStudent().getFullName()),
                    escapeCsv(s.getActivityVersion().getActivity().getName()),
                    escapeCsv(s.getExerciseVersion().getTitle()),
                    s.getLanguage(),
                    evalStatus,
                    score,
                    s.getCreatedAt().toString()
            ));
        }

        return writer.toString();
    }

    private String escapeCsv(String val) {
        if (val == null) return "";
        return val.replace("\"", "\"\"");
    }
}

