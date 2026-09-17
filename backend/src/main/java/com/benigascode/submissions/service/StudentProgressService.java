package com.benigascode.submissions.service;

import com.benigascode.activities.domain.Activity;
import com.benigascode.common.exception.AccessDeniedException;
import com.benigascode.common.exception.ResourceNotFoundException;
import com.benigascode.content.domain.Collection;
import com.benigascode.content.domain.CollectionVersion;
import com.benigascode.content.domain.Exercise;
import com.benigascode.content.domain.ExerciseVersion;
import com.benigascode.content.repository.CollectionRepository;
import com.benigascode.content.repository.CollectionVersionRepository;
import com.benigascode.content.repository.ExerciseRepository;
import com.benigascode.content.repository.ExerciseVersionRepository;
import com.benigascode.evaluation.domain.Evaluation;
import com.benigascode.evaluation.domain.TestResult;
import com.benigascode.evaluation.repository.EvaluationRepository;
import com.benigascode.evaluation.repository.TestResultRepository;
import com.benigascode.identity.domain.Role;
import com.benigascode.identity.domain.User;
import com.benigascode.identity.repository.UserRepository;
import com.benigascode.learning.domain.StudentTag;
import com.benigascode.learning.domain.TeachingSpace;
import com.benigascode.learning.repository.StudentTagRepository;
import com.benigascode.learning.repository.TagRepository;
import com.benigascode.learning.repository.TeachingSpaceRepository;
import com.benigascode.learning.service.ContextService;
import com.benigascode.submissions.domain.StudentProgress;
import com.benigascode.submissions.domain.Submission;
import com.benigascode.submissions.dto.StudentInsightsDTO;
import com.benigascode.submissions.dto.StudentProgressDTO;
import com.benigascode.submissions.dto.TeacherInsightsDTO;
import com.benigascode.submissions.repository.StudentProgressRepository;
import com.benigascode.submissions.repository.SubmissionRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class StudentProgressService {

    private static final Logger log = LoggerFactory.getLogger(StudentProgressService.class);

    private final StudentProgressRepository studentProgressRepository;
    private final SubmissionRepository submissionRepository;
    private final EvaluationRepository evaluationRepository;
    private final TestResultRepository testResultRepository;
    private final ExerciseRepository exerciseRepository;
    private final ExerciseVersionRepository exerciseVersionRepository;
    private final CollectionRepository collectionRepository;
    private final CollectionVersionRepository collectionVersionRepository;
    private final TeachingSpaceRepository teachingSpaceRepository;
    private final TagRepository tagRepository;
    private final StudentTagRepository studentTagRepository;
    private final ContextService contextService;
    private final UserRepository userRepository;
    private final ObjectMapper objectMapper;

    public StudentProgressService(StudentProgressRepository studentProgressRepository,
                                  SubmissionRepository submissionRepository,
                                  EvaluationRepository evaluationRepository,
                                  TestResultRepository testResultRepository,
                                  ExerciseRepository exerciseRepository,
                                  ExerciseVersionRepository exerciseVersionRepository,
                                  CollectionRepository collectionRepository,
                                  CollectionVersionRepository collectionVersionRepository,
                                  TeachingSpaceRepository teachingSpaceRepository,
                                  TagRepository tagRepository,
                                  StudentTagRepository studentTagRepository,
                                  ContextService contextService,
                                  UserRepository userRepository,
                                  ObjectMapper objectMapper) {
        this.studentProgressRepository = studentProgressRepository;
        this.submissionRepository = submissionRepository;
        this.evaluationRepository = evaluationRepository;
        this.testResultRepository = testResultRepository;
        this.exerciseRepository = exerciseRepository;
        this.exerciseVersionRepository = exerciseVersionRepository;
        this.collectionRepository = collectionRepository;
        this.collectionVersionRepository = collectionVersionRepository;
        this.teachingSpaceRepository = teachingSpaceRepository;
        this.tagRepository = tagRepository;
        this.studentTagRepository = studentTagRepository;
        this.contextService = contextService;
        this.userRepository = userRepository;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public void updateProgress(Submission submission, Evaluation evaluation) {
        User student = submission.getStudent();
        Exercise exercise = submission.getExerciseVersion().getExercise();
        Activity activity = submission.getActivityVersion() != null ? submission.getActivityVersion().getActivity() : null;

        Optional<StudentProgress> existingOpt = studentProgressRepository.findByStudentIdAndExerciseId(student.getId(), exercise.getId());
        StudentProgress progress = existingOpt.orElseGet(() -> new StudentProgress(student, exercise, activity));

        if (progress.getFirstSubmissionAt() == null) {
            progress.setFirstSubmissionAt(Instant.now());
        }
        if (progress.getFirstCollectionId() == null && submission.getCollectionId() != null) {
            progress.setFirstCollectionId(submission.getCollectionId());
        }
        if (activity != null && progress.getActivity() == null) {
            progress.setActivity(activity);
        }

        progress.setTotalSubmissions(progress.getTotalSubmissions() + 1);
        progress.setConsumedAttempts(progress.getConsumedAttempts() + 1);
        progress.setLastSubmission(submission);
        progress.setLastEvaluation(evaluation);
        progress.setLastStatus(evaluation.getStatus());
        if (submission.getLanguage() != null && !submission.getLanguage().isBlank()) {
            progress.setLastLanguage(submission.getLanguage());
        }

        BigDecimal score = evaluation.getScore() != null ? evaluation.getScore() : BigDecimal.ZERO;
        if (score.compareTo(progress.getBestScore()) > 0) {
            progress.setBestScore(score);
        }

        List<TestResult> results = testResultRepository.findByEvaluationId(evaluation.getId());
        int passed = (int) results.stream().filter(r -> "PASSED".equalsIgnoreCase(r.getStatus())).count();
        int total = results.size();
        if (total > 0) {
            if (passed > progress.getTestsPassed() || progress.getTotalTests() == 0) {
                progress.setTestsPassed(passed);
                progress.setTotalTests(total);
            }
        }

        if (score.compareTo(BigDecimal.valueOf(100)) >= 0) {
            progress.setStatus("MASTERED");
            if (progress.getTotalTests() > 0 && progress.getTestsPassed() < progress.getTotalTests()) {
                progress.setTestsPassed(progress.getTotalTests());
            }
            if (progress.getCompletedAt() == null) {
                progress.setCompletedAt(Instant.now());
            }
            if (progress.getFirstSolvedAt() == null) {
                progress.setFirstSolvedAt(Instant.now());
            }
        } else if (score.compareTo(BigDecimal.valueOf(50)) >= 0) {
            if (!"MASTERED".equals(progress.getStatus())) {
                progress.setStatus("PASSED");
            }
            if (progress.getCompletedAt() == null) {
                progress.setCompletedAt(Instant.now());
            }
            if (progress.getFirstSolvedAt() == null) {
                progress.setFirstSolvedAt(Instant.now());
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
    public Optional<StudentProgressDTO> getMyProgressForExercise(UUID exerciseIdOrVersionId, User student) {
        return studentProgressRepository.findByStudentIdAndExerciseId(student.getId(), exerciseIdOrVersionId)
                .or(() -> exerciseVersionRepository.findById(exerciseIdOrVersionId)
                        .flatMap(v -> v.getExercise() != null ? studentProgressRepository.findByStudentIdAndExerciseId(student.getId(), v.getExercise().getId()) : Optional.empty()))
                .map(StudentProgressDTO::fromEntity);
    }

    @Transactional(readOnly = true)
    public List<StudentProgressDTO> getSpaceProgress(UUID spaceId, User teacher) {
        if (teacher.getRole() != Role.ADMIN && !teachingSpaceRepository.isTeacherOfSpace(spaceId, teacher.getId())) {
            throw new AccessDeniedException("No tienes permisos de profesor en este espacio docente");
        }

        TeachingSpace space = teachingSpaceRepository.findById(spaceId)
                .orElseThrow(() -> new ResourceNotFoundException("Espacio docente no encontrado: " + spaceId));

        List<User> students = contextService.resolveStudentsForSpace(space);
        if (students.isEmpty()) {
            return Collections.emptyList();
        }

        List<UUID> studentIds = students.stream().map(User::getId).toList();
        return studentProgressRepository.findByStudentIdInOrderByUpdatedAtDesc(studentIds).stream()
                .map(StudentProgressDTO::fromEntity)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<StudentProgressDTO> getCourseProgress(UUID courseId, User teacher) {
        return getSpaceProgress(courseId, teacher);
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

    // ==================== INSIGHTS DEL ALUMNO ====================

    @Transactional(readOnly = true)
    public StudentInsightsDTO getMyInsights(User student) {
        List<Collection> collections = collectionRepository.findAll();
        List<StudentProgress> allMyProgress = studentProgressRepository.findByStudentIdOrderByUpdatedAtDesc(student.getId());
        Map<UUID, StudentProgress> progressByExerciseId = new HashMap<>();
        for (StudentProgress sp : allMyProgress) {
            if (sp.getActivity() == null && !progressByExerciseId.containsKey(sp.getExercise().getId())) {
                progressByExerciseId.put(sp.getExercise().getId(), sp);
            }
        }

        List<StudentInsightsDTO.CollectionProgressSummary> colSummaries = new ArrayList<>();
        Map<String, int[]> tagStats = new LinkedHashMap<>(); // tag -> [total, completed, attempted]
        Map<UUID, StudentInsightsDTO.StudentExerciseDetailItem> uniqueExercises = new LinkedHashMap<>();

        for (Collection col : collections) {
            Optional<CollectionVersion> cvOpt = collectionVersionRepository.findLatestByCollectionId(col.getId());
            if (cvOpt.isEmpty()) continue;

            CollectionVersion cv = cvOpt.get();
            int colTotal = 0;
            int colCompleted = 0;
            int colAttempted = 0;
            double colScoreSum = 0.0;

            try {
                JsonNode items = objectMapper.readTree(cv.getItems());
                if (items.isArray()) {
                    for (JsonNode item : items) {
                        if ("EXERCISE".equalsIgnoreCase(item.path("type").asText())) {
                            String slug = item.path("id").asText();
                            Optional<Exercise> exOpt = exerciseRepository.findBySlug(slug);
                            if (exOpt.isEmpty()) continue;
                            Exercise ex = exOpt.get();
                            Optional<ExerciseVersion> evOpt = exerciseVersionRepository.findLatestByExerciseId(ex.getId());
                            if (evOpt.isEmpty()) continue;
                            ExerciseVersion ev = evOpt.get();

                            colTotal++;

                            // Tags del ejercicio
                            List<String> tags = new ArrayList<>();
                            try {
                                if (ev.getTags() != null && !ev.getTags().isBlank()) {
                                    tags = objectMapper.readValue(ev.getTags(), new TypeReference<List<String>>() {});
                                }
                            } catch (Exception ignored) {}
                            if (tags.isEmpty()) {
                                tags.add("general");
                            }

                            StudentProgress sp = progressByExerciseId.get(ex.getId());
                            String status = "NOT_STARTED";
                            double bestScore = 0.0;
                            int testsPassed = 0;
                            int totalTests = 0;
                            double passPct = 0.0;
                            int submissions = 0;
                            Instant lastAt = null;

                            try {
                                JsonNode tcRoot = objectMapper.readTree(ev.getTestsConfig());
                                int pub = tcRoot.has("public") && tcRoot.get("public").isArray() ? tcRoot.get("public").size() : 0;
                                int priv = tcRoot.has("private") && tcRoot.get("private").isArray() ? tcRoot.get("private").size() : 0;
                                totalTests = pub + priv;
                            } catch (Exception ignored) {}

                            if (sp != null) {
                                status = sp.getStatus();
                                bestScore = sp.getBestScore() != null ? sp.getBestScore().doubleValue() : 0.0;
                                testsPassed = sp.getTestsPassed();
                                if (sp.getTotalTests() > 0) totalTests = sp.getTotalTests();
                                submissions = sp.getTotalSubmissions();
                                lastAt = sp.getUpdatedAt();

                                if (bestScore >= 100.0 || "MASTERED".equalsIgnoreCase(status) || "PASSED".equalsIgnoreCase(status)) {
                                    passPct = 100.0;
                                    if (totalTests > 0 && testsPassed < totalTests) testsPassed = totalTests;
                                } else if (totalTests > 0) {
                                    passPct = Math.round(((double) testsPassed * 100.0 / totalTests) * 10.0) / 10.0;
                                } else {
                                    passPct = bestScore;
                                }

                                if (passPct >= 100.0 || "MASTERED".equalsIgnoreCase(status) || ("PASSED".equalsIgnoreCase(status) && bestScore >= 100.0)) {
                                    colCompleted++;
                                } else if (submissions > 0 || "ATTEMPTED".equalsIgnoreCase(status) || bestScore > 0.0) {
                                    colAttempted++;
                                }
                                colScoreSum += bestScore;
                            }

                            boolean isCompleted = passPct >= 100.0 || "MASTERED".equalsIgnoreCase(status);
                            boolean isAttempted = !isCompleted && (submissions > 0 || bestScore > 0.0);

                            for (String tag : tags) {
                                String cleanTag = tag.trim().toLowerCase();
                                int[] counts = tagStats.computeIfAbsent(cleanTag, k -> new int[3]);
                                counts[0]++;
                                if (isCompleted) counts[1]++;
                                else if (isAttempted) counts[2]++;
                            }

                            uniqueExercises.putIfAbsent(ex.getId(), new StudentInsightsDTO.StudentExerciseDetailItem(
                                    ex.getId(),
                                    ev.getId(),
                                    ex.getSlug(),
                                    ev.getTitle(),
                                    col.getId(),
                                    cv.getTitle(),
                                    tags,
                                    status,
                                    bestScore,
                                    testsPassed,
                                    totalTests,
                                    passPct,
                                    submissions,
                                    lastAt
                            ));
                        }
                    }
                }
            } catch (Exception e) {
                log.error("Error al procesar colección en insights " + col.getSlug(), e);
            }

            double colCompletionPct = colTotal > 0 ? Math.round(((double) colCompleted * 100.0 / colTotal) * 10.0) / 10.0 : 0.0;
            double colAvgScore = colTotal > 0 ? Math.round((colScoreSum / colTotal) * 10.0) / 10.0 : 0.0;

            colSummaries.add(new StudentInsightsDTO.CollectionProgressSummary(
                    col.getId(),
                    col.getSlug(),
                    cv.getTitle(),
                    colTotal,
                    colCompleted,
                    colAttempted,
                    colCompletionPct,
                    colAvgScore
            ));
        }

        List<StudentInsightsDTO.TagProgressSummary> tagSummaries = new ArrayList<>();
        tagStats.forEach((tag, counts) -> {
            int tot = counts[0];
            int comp = counts[1];
            int att = counts[2];
            double pct = tot > 0 ? Math.round(((double) comp * 100.0 / tot) * 10.0) / 10.0 : 0.0;
            tagSummaries.add(new StudentInsightsDTO.TagProgressSummary(tag, tot, comp, att, pct));
        });
        tagSummaries.sort((a, b) -> Integer.compare(b.totalExercises(), a.totalExercises()));

        List<Submission> allSubs = submissionRepository.findByStudentIdOrderByCreatedAtDesc(student.getId());
        DateTimeFormatter df = DateTimeFormatter.ISO_LOCAL_DATE;
        Map<String, int[]> dailyMap = new TreeMap<>();

        LocalDate today = LocalDate.now(ZoneId.of("UTC"));
        for (int i = 29; i >= 0; i--) {
            dailyMap.put(today.minusDays(i).format(df), new int[2]);
        }

        for (Submission s : allSubs) {
            String dateKey = df.format(s.getCreatedAt().atZone(ZoneId.of("UTC")));
            int[] counts = dailyMap.get(dateKey);
            if (counts != null) {
                counts[0]++;
                Optional<Evaluation> evalOpt = evaluationRepository.findLatestBySubmissionId(s.getId());
                if (evalOpt.isPresent() && "CORRECT".equalsIgnoreCase(evalOpt.get().getStatus())) {
                    counts[1]++;
                }
            }
        }

        List<StudentInsightsDTO.DailyActivityItem> timeline = new ArrayList<>();
        dailyMap.forEach((date, c) -> timeline.add(new StudentInsightsDTO.DailyActivityItem(date, c[0], c[1])));

        int totalExercises = uniqueExercises.size();
        int completedCount = (int) uniqueExercises.values().stream().filter(e -> e.passPercentage() >= 100.0 || "MASTERED".equalsIgnoreCase(e.status())).count();
        int attemptedCount = (int) uniqueExercises.values().stream().filter(e -> e.passPercentage() < 100.0 && (e.totalSubmissions() > 0 || e.bestScore() > 0.0)).count();
        int notStartedCount = Math.max(0, totalExercises - completedCount - attemptedCount);
        double globalCompletionPct = totalExercises > 0 ? Math.round(((double) completedCount * 100.0 / totalExercises) * 10.0) / 10.0 : 0.0;
        double globalAvgScore = totalExercises > 0 ? Math.round((uniqueExercises.values().stream().mapToDouble(StudentInsightsDTO.StudentExerciseDetailItem::bestScore).sum() / totalExercises) * 10.0) / 10.0 : 0.0;

        return new StudentInsightsDTO(
                totalExercises,
                completedCount,
                attemptedCount,
                notStartedCount,
                allSubs.size(),
                globalCompletionPct,
                globalAvgScore,
                colSummaries,
                tagSummaries,
                timeline,
                new ArrayList<>(uniqueExercises.values())
        );
    }

    // ==================== INSIGHTS DEL PROFESOR ====================

    public static double computePercentile(List<Double> values, double percentile) {
        if (values.isEmpty()) return 0.0;
        List<Double> sorted = new ArrayList<>(values);
        Collections.sort(sorted);
        int index = (int) Math.ceil((percentile / 100.0) * sorted.size()) - 1;
        index = Math.max(0, Math.min(index, sorted.size() - 1));
        return Math.round(sorted.get(index) * 10.0) / 10.0;
    }

    @Transactional(readOnly = true)
    public TeacherInsightsDTO getTeacherInsights(UUID spaceId, UUID tagId, UUID studentId, User teacher) {
        if (teacher.getRole() != Role.ADMIN && teacher.getRole() != Role.TEACHER) {
            throw new AccessDeniedException("Operación restringida a profesores");
        }

        // 1. Modo Individual por Alumno
        if (studentId != null) {
            User student = userRepository.findById(studentId)
                    .orElseThrow(() -> new ResourceNotFoundException("Alumno no encontrado"));

            StudentInsightsDTO studentDetail = getMyInsights(student);

            String spaceName = "Espacio Docente";
            String groupName = "General";

            List<StudentTag> activeTags = studentTagRepository.findActiveByStudentId(studentId);
            for (StudentTag st : activeTags) {
                if ("group".equalsIgnoreCase(st.getTag().getCategory())) {
                    groupName = st.getTag().getValue();
                    break;
                }
            }

            List<TeachingSpace> spaces = contextService.findSpacesForStudent(student);
            if (!spaces.isEmpty()) {
                spaceName = spaces.get(0).getName();
            }

            return new TeacherInsightsDTO(
                    "STUDENT",
                    spaceId,
                    spaceName,
                    tagId,
                    groupName,
                    student.getId(),
                    student.getFullName(),
                    1,
                    studentDetail.totalSubmissions(),
                    studentDetail.completedExercises(),
                    studentDetail.completionPercentage(),
                    studentDetail.averageScore(),
                    studentDetail.averageScore(),
                    Map.of("p25", studentDetail.averageScore(), "p50", studentDetail.averageScore(), "p75", studentDetail.averageScore(), "p90", studentDetail.averageScore()),
                    List.of(),
                    Map.of(),
                    studentDetail.activityTimeline().stream()
                            .map(d -> new TeacherInsightsDTO.DailyActivityItem(d.date(), d.submissionsCount(), d.passedCount()))
                            .toList(),
                    List.of(),
                    List.of(),
                    studentDetail
            );
        }

        // 2. Modo Espacio / Contexto / General
        List<TeachingSpace> spaces;
        if (teacher.getRole() == Role.ADMIN) {
            spaces = teachingSpaceRepository.findAll();
        } else {
            spaces = teachingSpaceRepository.findByTeacherId(teacher.getId());
        }

        TeachingSpace selectedSpace = null;
        if (spaceId != null) {
            selectedSpace = teachingSpaceRepository.findById(spaceId)
                    .orElseThrow(() -> new ResourceNotFoundException("Espacio docente no encontrado: " + spaceId));
            spaces = List.of(selectedSpace);
        }

        // Determinar alumnos según contexto
        Set<User> matchedStudents = new LinkedHashSet<>();
        for (TeachingSpace sp : spaces) {
            matchedStudents.addAll(contextService.resolveStudentsForSpace(sp));
        }

        // Filtrar por tag si se solicitó
        if (tagId != null) {
            matchedStudents = matchedStudents.stream()
                    .filter(st -> studentTagRepository.findActiveByStudentId(st.getId()).stream()
                            .anyMatch(item -> item.getTag().getId().equals(tagId)))
                    .collect(Collectors.toCollection(LinkedHashSet::new));
        }

        // Submissions relevantes
        List<Submission> allSubmissions;
        if (selectedSpace != null) {
            allSubmissions = submissionRepository.findByTeachingSpaceId(selectedSpace.getId());
        } else {
            allSubmissions = submissionRepository.findAllByOrderByCreatedAtDesc();
        }

        // Leaderboard de alumnos
        List<TeacherInsightsDTO.StudentLeaderboardItem> leaderboard = new ArrayList<>();
        int totalExercisesSolvedSum = 0;
        List<Double> allStudentAvgScores = new ArrayList<>();

        for (User st : matchedStudents) {
            List<StudentProgress> spList = studentProgressRepository.findByStudentIdOrderByUpdatedAtDesc(st.getId());
            int solved = (int) spList.stream().filter(sp -> sp.getBestScore() != null && sp.getBestScore().compareTo(BigDecimal.valueOf(100)) >= 0).count();
            int attempted = (int) spList.stream().filter(sp -> (sp.getBestScore() == null || sp.getBestScore().compareTo(BigDecimal.valueOf(100)) < 0) && sp.getTotalSubmissions() > 0).count();
            int subsCount = spList.stream().mapToInt(StudentProgress::getTotalSubmissions).sum();
            double avgScore = spList.isEmpty() ? 0.0 : Math.round((spList.stream().mapToDouble(sp -> sp.getBestScore() != null ? sp.getBestScore().doubleValue() : 0.0).sum() / spList.size()) * 10.0) / 10.0;
            Instant lastActive = spList.isEmpty() ? null : spList.get(0).getUpdatedAt();

            String grpName = "General";
            UUID grpTagId = null;
            List<StudentTag> activeTags = studentTagRepository.findActiveByStudentId(st.getId());
            for (StudentTag sTag : activeTags) {
                if ("group".equalsIgnoreCase(sTag.getTag().getCategory())) {
                    grpName = sTag.getTag().getValue();
                    grpTagId = sTag.getTag().getId();
                    break;
                }
            }

            totalExercisesSolvedSum += solved;
            allStudentAvgScores.add(avgScore);

            leaderboard.add(new TeacherInsightsDTO.StudentLeaderboardItem(
                    st.getId(),
                    st.getFullName(),
                    st.getUsername(),
                    grpTagId,
                    grpName,
                    solved,
                    attempted,
                    avgScore,
                    subsCount,
                    lastActive
            ));
        }
        leaderboard.sort((a, b) -> Integer.compare(b.exercisesSolved(), a.exercisesSolved()));

        // Resumen por espacios docentes
        List<TeacherInsightsDTO.GroupSummaryItem> spaceSummaries = new ArrayList<>();
        for (TeachingSpace sp : spaces) {
            List<User> spStudents = contextService.resolveStudentsForSpace(sp);
            int stCount = spStudents.size();
            Set<UUID> spStudentIds = spStudents.stream().map(User::getId).collect(Collectors.toSet());

            List<TeacherInsightsDTO.StudentLeaderboardItem> spLeaderboard = leaderboard.stream()
                    .filter(l -> spStudentIds.contains(l.studentId()))
                    .toList();

            int totalSpSubs = spLeaderboard.stream().mapToInt(TeacherInsightsDTO.StudentLeaderboardItem::totalSubmissions).sum();
            double spAvg = stCount > 0 ? Math.round((spLeaderboard.stream().mapToDouble(TeacherInsightsDTO.StudentLeaderboardItem::averageScore).sum() / stCount) * 10.0) / 10.0 : 0.0;
            int totalSolvedInSp = spLeaderboard.stream().mapToInt(TeacherInsightsDTO.StudentLeaderboardItem::exercisesSolved).sum();
            double passRate = totalSpSubs > 0 ? Math.round(((double) totalSolvedInSp * 100.0 / totalSpSubs) * 10.0) / 10.0 : 0.0;

            spaceSummaries.add(new TeacherInsightsDTO.GroupSummaryItem(
                    sp.getId(),
                    sp.getName(),
                    sp.getId(),
                    sp.getName(),
                    stCount,
                    totalSpSubs,
                    spAvg,
                    passRate
            ));
        }

        // Cuellos de botella / dificultad de ejercicios
        Map<UUID, int[]> exStats = new HashMap<>(); // exId -> [totalSubs, passedSubs]
        Map<UUID, Exercise> exMap = new HashMap<>();

        for (Submission s : allSubmissions) {
            if (s.getExerciseVersion() != null && s.getExerciseVersion().getExercise() != null) {
                Exercise ex = s.getExerciseVersion().getExercise();
                exMap.put(ex.getId(), ex);
                int[] c = exStats.computeIfAbsent(ex.getId(), k -> new int[2]);
                c[0]++;
                Optional<Evaluation> ev = evaluationRepository.findLatestBySubmissionId(s.getId());
                if (ev.isPresent() && "CORRECT".equalsIgnoreCase(ev.get().getStatus())) {
                    c[1]++;
                }
            }
        }

        List<TeacherInsightsDTO.DifficultExerciseItem> difficultExercises = new ArrayList<>();
        exStats.forEach((exId, counts) -> {
            int tot = counts[0];
            int passed = counts[1];
            double rate = tot > 0 ? Math.round(((double) passed * 100.0 / tot) * 10.0) / 10.0 : 0.0;
            Exercise ex = exMap.get(exId);
            Optional<ExerciseVersion> ev = exerciseVersionRepository.findLatestByExerciseId(exId);
            String title = ev.map(ExerciseVersion::getTitle).orElse(ex.getSlug());
            difficultExercises.add(new TeacherInsightsDTO.DifficultExerciseItem(exId, ex.getSlug(), title, tot, passed, rate));
        });
        difficultExercises.sort(Comparator.comparingDouble(TeacherInsightsDTO.DifficultExerciseItem::passRate));

        // Distribución de puntuaciones
        Map<String, Integer> scoreDist = new LinkedHashMap<>();
        scoreDist.put("0-49%", 0);
        scoreDist.put("50-69%", 0);
        scoreDist.put("70-89%", 0);
        scoreDist.put("90-100%", 0);

        List<Double> allEvaluationScores = new ArrayList<>();
        for (Submission s : allSubmissions) {
            Optional<Evaluation> ev = evaluationRepository.findLatestBySubmissionId(s.getId());
            if (ev.isPresent()) {
                double sc = ev.get().getScore() != null ? ev.get().getScore().doubleValue() : 0.0;
                allEvaluationScores.add(sc);
                if (sc < 50.0) scoreDist.put("0-49%", scoreDist.get("0-49%") + 1);
                else if (sc < 70.0) scoreDist.put("50-69%", scoreDist.get("50-69%") + 1);
                else if (sc < 90.0) scoreDist.put("70-89%", scoreDist.get("70-89%") + 1);
                else scoreDist.put("90-100%", scoreDist.get("90-100%") + 1);
            }
        }

        // Timeline de actividad (últimos 30 días)
        DateTimeFormatter df = DateTimeFormatter.ISO_LOCAL_DATE;
        Map<String, int[]> dailyMap = new TreeMap<>();
        LocalDate today = LocalDate.now(ZoneId.of("UTC"));
        for (int i = 29; i >= 0; i--) {
            dailyMap.put(today.minusDays(i).format(df), new int[2]);
        }
        for (Submission s : allSubmissions) {
            String dateKey = df.format(s.getCreatedAt().atZone(ZoneId.of("UTC")));
            int[] c = dailyMap.get(dateKey);
            if (c != null) {
                c[0]++;
                Optional<Evaluation> ev = evaluationRepository.findLatestBySubmissionId(s.getId());
                if (ev.isPresent() && "CORRECT".equalsIgnoreCase(ev.get().getStatus())) {
                    c[1]++;
                }
            }
        }
        List<TeacherInsightsDTO.DailyActivityItem> timeline = new ArrayList<>();
        dailyMap.forEach((date, c) -> timeline.add(new TeacherInsightsDTO.DailyActivityItem(date, c[0], c[1])));

        int totalStudents = matchedStudents.size();
        double overallAvg = totalStudents > 0 ? Math.round((allStudentAvgScores.stream().mapToDouble(Double::doubleValue).sum() / totalStudents) * 10.0) / 10.0 : 0.0;
        double overallPass = allSubmissions.size() > 0 ? Math.round(((double) totalExercisesSolvedSum * 100.0 / allSubmissions.size()) * 10.0) / 10.0 : 0.0;

        // Métricas contextuales avanzadas: Media, Mediana y Percentiles (p25, p50, p75, p90)
        List<Double> scoresForPercentiles = allEvaluationScores.isEmpty() ? allStudentAvgScores : allEvaluationScores;
        double medianScore = computePercentile(scoresForPercentiles, 50.0);
        Map<String, Double> percentiles = new LinkedHashMap<>();
        percentiles.put("p25", computePercentile(scoresForPercentiles, 25.0));
        percentiles.put("p50", medianScore);
        percentiles.put("p75", computePercentile(scoresForPercentiles, 75.0));
        percentiles.put("p90", computePercentile(scoresForPercentiles, 90.0));

        String scope = selectedSpace != null ? "SPACE" : "GENERAL";
        String selSpaceName = selectedSpace != null ? selectedSpace.getName() : null;

        return new TeacherInsightsDTO(
                scope,
                spaceId,
                selSpaceName,
                tagId,
                null,
                null,
                null,
                totalStudents,
                allSubmissions.size(),
                totalExercisesSolvedSum,
                overallPass,
                overallAvg,
                medianScore,
                percentiles,
                difficultExercises.stream().limit(8).toList(),
                scoreDist,
                timeline,
                spaceSummaries,
                leaderboard,
                null
        );
    }
}
