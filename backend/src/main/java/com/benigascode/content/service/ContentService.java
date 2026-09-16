package com.benigascode.content.service;

import com.benigascode.common.exception.AccessDeniedException;
import com.benigascode.common.exception.ResourceNotFoundException;
import com.benigascode.common.exception.ValidationException;
import com.benigascode.content.domain.*;
import com.benigascode.content.domain.Collection;
import com.benigascode.content.dto.*;
import com.benigascode.content.repository.*;
import com.benigascode.identity.domain.Role;
import com.benigascode.identity.domain.User;
import com.benigascode.learning.domain.TeachingSpace;
import com.benigascode.learning.repository.TeachingSpaceRepository;
import com.benigascode.learning.service.ContextService;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import com.benigascode.submissions.domain.StudentProgress;
import com.benigascode.submissions.domain.Submission;
import com.benigascode.submissions.repository.StudentProgressRepository;
import com.benigascode.submissions.repository.SubmissionRepository;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class ContentService {

    private static final Logger log = LoggerFactory.getLogger(ContentService.class);

    private final CollectionRepository collectionRepository;
    private final CollectionVersionRepository collectionVersionRepository;
    private final ExerciseRepository exerciseRepository;
    private final ExerciseVersionRepository exerciseVersionRepository;
    private final ExerciseAssetRepository exerciseAssetRepository;
    private final AccessKeyRepository accessKeyRepository;
    private final AccessGrantRepository accessGrantRepository;
    private final StudentProgressRepository studentProgressRepository;
    private final SubmissionRepository submissionRepository;
    private final TeachingSpaceRepository teachingSpaceRepository;
    private final ContextService contextService;
    private final ObjectMapper objectMapper;

    public ContentService(CollectionRepository collectionRepository,
                          CollectionVersionRepository collectionVersionRepository,
                          ExerciseRepository exerciseRepository,
                          ExerciseVersionRepository exerciseVersionRepository,
                          ExerciseAssetRepository exerciseAssetRepository,
                          AccessKeyRepository accessKeyRepository,
                          AccessGrantRepository accessGrantRepository,
                          StudentProgressRepository studentProgressRepository,
                          SubmissionRepository submissionRepository,
                          TeachingSpaceRepository teachingSpaceRepository,
                          ContextService contextService,
                          ObjectMapper objectMapper) {
        this.collectionRepository = collectionRepository;
        this.collectionVersionRepository = collectionVersionRepository;
        this.exerciseRepository = exerciseRepository;
        this.exerciseVersionRepository = exerciseVersionRepository;
        this.exerciseAssetRepository = exerciseAssetRepository;
        this.accessKeyRepository = accessKeyRepository;
        this.accessGrantRepository = accessGrantRepository;
        this.studentProgressRepository = studentProgressRepository;
        this.submissionRepository = submissionRepository;
        this.teachingSpaceRepository = teachingSpaceRepository;
        this.contextService = contextService;
        this.objectMapper = objectMapper;
    }

    @Transactional(readOnly = true)
    public List<CollectionDTO> getMyCollections(User user) {
        if (user.getRole() == Role.TEACHER || user.getRole() == Role.ADMIN) {
            return collectionRepository.findAll().stream()
                    .map(c -> CollectionDTO.from(c, collectionVersionRepository.findLatestByCollectionId(c.getId()).orElse(null)))
                    .toList();
        }

        Set<Collection> myCollections = new LinkedHashSet<>();

        // 1. Colecciones en espacios docentes a los que el alumno pertenece
        List<TeachingSpace> studentSpaces = contextService.findSpacesForStudent(user);
        for (TeachingSpace ts : studentSpaces) {
            myCollections.addAll(ts.getCollections());
        }

        // 2. Colecciones en las que el alumno ha participado (al menos un intento de ejercicio)
        List<UUID> participatedColIds = submissionRepository.findParticipatedCollectionIdsByStudentId(user.getId());
        if (participatedColIds != null && !participatedColIds.isEmpty()) {
            myCollections.addAll(collectionRepository.findAllById(participatedColIds));
        }

        // Comprobar también entregas del alumno en ejercicios que pertenezcan a colecciones
        List<Submission> allSubs = submissionRepository.findByStudentIdOrderByCreatedAtDesc(user.getId());
        Set<String> attemptedExerciseSlugs = allSubs.stream()
                .filter(s -> s.getExerciseVersion() != null && s.getExerciseVersion().getExercise() != null)
                .map(s -> s.getExerciseVersion().getExercise().getSlug())
                .collect(Collectors.toSet());

        if (!attemptedExerciseSlugs.isEmpty()) {
            List<Collection> allCollections = collectionRepository.findAll();
            for (Collection col : allCollections) {
                if (myCollections.contains(col)) continue;
                collectionVersionRepository.findLatestByCollectionId(col.getId()).ifPresent(cv -> {
                    if (collectionVersionContainsAnyExercise(cv, attemptedExerciseSlugs)) {
                        myCollections.add(col);
                    }
                });
            }
        }

        // 3. Colecciones concedidas mediante clave directa (access_grants)
        myCollections.addAll(collectionRepository.findAccessibleCollectionsByUserId(user.getId()));

        return myCollections.stream()
                .map(c -> CollectionDTO.from(c, collectionVersionRepository.findLatestByCollectionId(c.getId()).orElse(null)))
                .toList();
    }

    private boolean collectionVersionContainsAnyExercise(CollectionVersion cv, Set<String> exerciseSlugs) {
        if (cv.getItems() == null || cv.getItems().isBlank()) return false;
        try {
            JsonNode items = objectMapper.readTree(cv.getItems());
            if (items.isArray()) {
                for (JsonNode it : items) {
                    if ("EXERCISE".equalsIgnoreCase(it.path("type").asText()) && exerciseSlugs.contains(it.path("id").asText())) {
                        return true;
                    }
                }
            }
        } catch (Exception ignored) {}
        return false;
    }

    @Transactional(readOnly = true)
    public List<CollectionDTO> getPublicCollections(User user) {
        return collectionRepository.findPublicCollections().stream()
                .map(c -> CollectionDTO.from(c, collectionVersionRepository.findLatestByCollectionId(c.getId()).orElse(null)))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<CollectionDTO> getAccessibleCollections(User user) {
        if (user.getRole() == Role.TEACHER || user.getRole() == Role.ADMIN) {
            return collectionRepository.findAll().stream()
                    .map(c -> CollectionDTO.from(c, collectionVersionRepository.findLatestByCollectionId(c.getId()).orElse(null)))
                    .toList();
        }

        Set<Collection> accessible = new HashSet<>();
        // 1. Colecciones públicas
        accessible.addAll(collectionRepository.findPublicCollections());
        // 2. Colecciones en espacios docentes a los que el alumno pertenece según su contexto
        List<TeachingSpace> studentSpaces = contextService.findSpacesForStudent(user);
        for (TeachingSpace ts : studentSpaces) {
            accessible.addAll(ts.getCollections());
        }
        // 3. Colecciones concedidas mediante clave directa (access_grants)
        accessible.addAll(collectionRepository.findAccessibleCollectionsByUserId(user.getId()));

        return accessible.stream()
                .map(c -> CollectionDTO.from(c, collectionVersionRepository.findLatestByCollectionId(c.getId()).orElse(null)))
                .toList();
    }

    @Transactional(readOnly = true)
    public CollectionDTO getCollectionById(UUID collectionId, User user) {
        Collection collection = collectionRepository.findById(collectionId)
                .orElseThrow(() -> new ResourceNotFoundException("Colección no encontrada"));

        assertCanAccessCollection(user, collection);

        CollectionVersion version = collectionVersionRepository.findLatestByCollectionId(collectionId)
                .orElse(null);
        return CollectionDTO.from(collection, version);
    }

    @Transactional(readOnly = true)
    public List<ExerciseDTO> getExercisesForCollection(UUID collectionId, User user) {
        Collection collection = collectionRepository.findById(collectionId)
                .orElseThrow(() -> new ResourceNotFoundException("Colección no encontrada"));

        assertCanAccessCollection(user, collection);

        CollectionVersion version = collectionVersionRepository.findLatestByCollectionId(collectionId)
                .orElseThrow(() -> new ResourceNotFoundException("Versión de colección no disponible"));

        List<ExerciseDTO> exercises = new ArrayList<>();
        try {
            JsonNode itemsNode = objectMapper.readTree(version.getItems());
            if (itemsNode.isArray()) {
                for (JsonNode item : itemsNode) {
                    if ("EXERCISE".equalsIgnoreCase(item.path("type").asText())) {
                        String slug = item.path("id").asText();
                        exerciseRepository.findBySlug(slug)
                                .flatMap(e -> exerciseVersionRepository.findLatestByExerciseId(e.getId()))
                                .ifPresent(ev -> exercises.add(ExerciseDTO.fromVersion(ev)));
                    }
                }
            }
        } catch (Exception e) {
            // Silently fallback to empty list
        }
        return exercises;
    }

    @Transactional(readOnly = true)
    public CollectionProgressDTO getCollectionProgress(UUID collectionId, User user) {
        Collection collection = collectionRepository.findById(collectionId)
                .orElseThrow(() -> new ResourceNotFoundException("Colección no encontrada"));

        assertCanAccessCollection(user, collection);

        CollectionVersion colVersion = collectionVersionRepository.findLatestByCollectionId(collectionId)
                .orElseThrow(() -> new ResourceNotFoundException("Versión de colección no disponible"));

        List<CollectionProgressDTO.ExerciseProgressItemDTO> items = new ArrayList<>();
        int completedCount = 0;
        int attemptedCount = 0;
        double sumScore = 0.0;

        try {
            JsonNode itemsNode = objectMapper.readTree(colVersion.getItems());
            if (itemsNode.isArray()) {
                for (JsonNode item : itemsNode) {
                    if ("EXERCISE".equalsIgnoreCase(item.path("type").asText())) {
                        String slug = item.path("id").asText();
                        Optional<Exercise> exOpt = exerciseRepository.findBySlug(slug);
                        if (exOpt.isPresent()) {
                            Exercise ex = exOpt.get();
                            Optional<ExerciseVersion> evOpt = exerciseVersionRepository.findLatestByExerciseId(ex.getId());
                            if (evOpt.isPresent()) {
                                ExerciseVersion ev = evOpt.get();
                                Optional<StudentProgress> spOpt = studentProgressRepository
                                        .findByStudentIdAndExerciseId(user.getId(), ex.getId());

                                int totalTestsInConfig = 0;
                                try {
                                    JsonNode tcRoot = objectMapper.readTree(ev.getTestsConfig());
                                    int pub = tcRoot.has("public") && tcRoot.get("public").isArray() ? tcRoot.get("public").size() : 0;
                                    int priv = tcRoot.has("private") && tcRoot.get("private").isArray() ? tcRoot.get("private").size() : 0;
                                    totalTestsInConfig = pub + priv;
                                } catch (Exception ignored) {}

                                String status = "NOT_STARTED";
                                double bestScore = 0.0;
                                int testsPassed = 0;
                                int totalTests = totalTestsInConfig;
                                double passPercentage = 0.0;
                                int totalSubmissions = 0;

                                if (spOpt.isPresent()) {
                                    StudentProgress sp = spOpt.get();
                                    status = sp.getStatus();
                                    bestScore = sp.getBestScore() != null ? sp.getBestScore().doubleValue() : 0.0;
                                    testsPassed = sp.getTestsPassed();
                                    totalTests = sp.getTotalTests() > 0 ? sp.getTotalTests() : totalTestsInConfig;
                                    totalSubmissions = sp.getTotalSubmissions();

                                    if (bestScore >= 100.0 || "MASTERED".equalsIgnoreCase(status) || "PASSED".equalsIgnoreCase(status)) {
                                        if (totalTests > 0 && testsPassed < totalTests) {
                                            testsPassed = totalTests;
                                        }
                                        passPercentage = 100.0;
                                    } else if (totalTests > 0) {
                                        passPercentage = Math.round(((double) testsPassed * 100.0 / totalTests) * 10.0) / 10.0;
                                    } else {
                                        passPercentage = bestScore;
                                    }

                                    if (passPercentage >= 100.0 || "MASTERED".equalsIgnoreCase(status) || ("PASSED".equalsIgnoreCase(status) && bestScore >= 100.0)) {
                                        completedCount++;
                                    } else if (totalSubmissions > 0 || "ATTEMPTED".equalsIgnoreCase(status) || bestScore > 0.0) {
                                        attemptedCount++;
                                    }
                                }

                                sumScore += bestScore;
                                items.add(new CollectionProgressDTO.ExerciseProgressItemDTO(
                                        ex.getId(),
                                        ev.getId(),
                                        ex.getSlug(),
                                        ev.getTitle(),
                                        status,
                                        bestScore,
                                        testsPassed,
                                        totalTests,
                                        passPercentage,
                                        totalSubmissions
                                ));
                            }
                        }
                    }
                }
            }
        } catch (Exception e) {
            log.error("Error al calcular progreso de colección " + collectionId, e);
        }

        int totalExercises = items.size();
        int notStartedCount = Math.max(0, totalExercises - completedCount - attemptedCount);
        double completionPct = totalExercises > 0 ? Math.round(((double) completedCount * 100.0 / totalExercises) * 10.0) / 10.0 : 0.0;
        double avgScore = totalExercises > 0 ? Math.round((sumScore / totalExercises) * 10.0) / 10.0 : 0.0;

        return new CollectionProgressDTO(
                collection.getId(),
                colVersion.getTitle(),
                totalExercises,
                completedCount,
                attemptedCount,
                notStartedCount,
                completionPct,
                avgScore,
                items
        );
    }

    @Transactional(readOnly = true)
    public ExerciseDTO getExerciseVersion(UUID exerciseVersionId, User user) {
        return getExerciseVersion(exerciseVersionId, null, user);
    }

    @Transactional(readOnly = true)
    public ExerciseDTO getExerciseVersion(UUID exerciseVersionId, UUID collectionId, User user) {
        ExerciseVersion version = exerciseVersionRepository.findById(exerciseVersionId)
                .orElseThrow(() -> new ResourceNotFoundException("Ejercicio no encontrado"));

        String starterCode = resolveStarterCode(version, collectionId);
        return ExerciseDTO.fromVersion(version, starterCode);
    }

    public String resolveStarterCode(ExerciseVersion version, UUID collectionId) {
        String runtimeId = version.getRuntimeId();
        String language = version.getLanguage();
        String starterCode = null;

        // 1. Plantilla específica a nivel de ejercicio
        try {
            if (version.getTemplatesConfig() != null) {
                JsonNode exTemplates = objectMapper.readTree(version.getTemplatesConfig());
                starterCode = extractTemplateForRuntime(exTemplates, runtimeId, language);
            }
        } catch (Exception ignored) {
        }

        // 2. Si el ejercicio no definió plantilla para este runtime, buscar en la colección
        if (starterCode == null) {
            CollectionVersion colVersion = null;
            if (collectionId != null) {
                colVersion = collectionVersionRepository.findLatestByCollectionId(collectionId).orElse(null);
            } else {
                List<CollectionVersion> allColVersions = collectionVersionRepository.findAll();
                for (CollectionVersion cv : allColVersions) {
                    try {
                        JsonNode items = objectMapper.readTree(cv.getItems());
                        if (items.isArray()) {
                            for (JsonNode item : items) {
                                if (version.getExercise().getSlug().equalsIgnoreCase(item.path("id").asText())) {
                                    colVersion = cv;
                                    break;
                                }
                            }
                        }
                    } catch (Exception ignored) {
                    }
                    if (colVersion != null) break;
                }
            }

            if (colVersion != null && colVersion.getTemplatesConfig() != null) {
                try {
                    JsonNode colTemplates = objectMapper.readTree(colVersion.getTemplatesConfig());
                    starterCode = extractTemplateForRuntime(colTemplates, runtimeId, language);
                } catch (Exception ignored) {
                }
            }
        }

        // 3. Fallback al esqueleto por defecto del sistema SOLO si sigue siendo null (no definido)
        if (starterCode == null) {
            starterCode = getDefaultStarterCodeForRuntime(runtimeId);
        }

        return starterCode;
    }

    private String extractTemplateForRuntime(JsonNode templatesNode, String runtimeId, String language) {
        if (templatesNode == null || !templatesNode.isObject() || templatesNode.isEmpty()) {
            return null;
        }
        if (runtimeId != null && templatesNode.has(runtimeId)) {
            return templatesNode.get(runtimeId).asText();
        }
        if (runtimeId != null && templatesNode.has(runtimeId + ".java")) {
            return templatesNode.get(runtimeId + ".java").asText();
        }
        if (language != null && templatesNode.has(language)) {
            return templatesNode.get(language).asText();
        }
        if (language != null && templatesNode.has(language + ".java")) {
            return templatesNode.get(language + ".java").asText();
        }
        if (templatesNode.has("java")) {
            return templatesNode.get("java").asText();
        }
        if (templatesNode.has("default")) {
            return templatesNode.get("default").asText();
        }
        var fields = templatesNode.fields();
        while (fields.hasNext()) {
            var field = fields.next();
            if (language != null && field.getKey().toLowerCase().startsWith(language.toLowerCase())) {
                return field.getValue().asText();
            }
        }
        var elements = templatesNode.elements();
        if (elements.hasNext()) {
            return elements.next().asText();
        }
        return null;
    }

    private String getDefaultStarterCodeForRuntime(String runtimeId) {
        if (runtimeId != null && runtimeId.toLowerCase().startsWith("java")) {
            return "import java.util.Scanner;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        // Escribe tu solución aquí\n    }\n}\n";
        } else if (runtimeId != null && runtimeId.toLowerCase().startsWith("python")) {
            return "# Escribe tu solución aquí\n";
        }
        return "";
    }

    @Transactional(readOnly = true)
    public List<PublicTestDTO> getPublicTests(UUID exerciseVersionId, User user) {
        ExerciseVersion version = exerciseVersionRepository.findById(exerciseVersionId)
                .orElseThrow(() -> new ResourceNotFoundException("Ejercicio no encontrado"));

        List<PublicTestDTO> publicTests = new ArrayList<>();
        try {
            JsonNode root = objectMapper.readTree(version.getTestsConfig());
            JsonNode pubArray = root.path("public");
            if (pubArray.isArray()) {
                for (JsonNode t : pubArray) {
                    publicTests.add(new PublicTestDTO(
                            t.path("id").asText(),
                            t.path("name").asText(),
                            t.path("input").asText(),
                            t.path("expected").asText(),
                            t.has("explanation") && !t.get("explanation").isNull() ? t.get("explanation").asText() : null
                    ));
                }
            }
        } catch (Exception e) {
            // Error de parsing de tests
        }
        return publicTests;
    }

    @Transactional
    public CollectionDTO claimAccessWithKey(String rawKey, User student) {
        String hash = sha256(rawKey.trim());
        AccessKey key = accessKeyRepository.findByKeyHash(hash)
                .orElseThrow(() -> new ResourceNotFoundException("Clave de acceso no válida o inexistente"));

        if (!key.isValid()) {
            throw new ValidationException("La clave de acceso ha caducado, ha sido revocada o ha alcanzado su límite de usos");
        }

        key.incrementUses();

        Collection collection = key.getCollection();
        if (!accessGrantRepository.existsByUserIdAndCollectionId(student.getId(), collection.getId())) {
            AccessGrant grant = new AccessGrant(student, collection, "KEY");
            accessGrantRepository.save(grant);
        }

        CollectionVersion version = collectionVersionRepository.findLatestByCollectionId(collection.getId()).orElse(null);
        return CollectionDTO.from(collection, version);
    }

    @Transactional
    public CreateAccessKeyResponse generateAccessKey(UUID collectionId, Integer maxUses, Instant expiresAt, User teacher) {
        Collection collection = collectionRepository.findById(collectionId)
                .orElseThrow(() -> new ResourceNotFoundException("Colección no encontrada"));

        String rawKey = generateRandomKey();
        String hash = sha256(rawKey);

        AccessKey key = new AccessKey(collection, hash, teacher, maxUses, expiresAt);
        accessKeyRepository.save(key);

        return new CreateAccessKeyResponse(key.getId(), collection.getId(), rawKey, maxUses, expiresAt);
    }

    public Resource getExerciseAsset(UUID exerciseIdOrVersionId, String rawFilename) {
        if (rawFilename == null || rawFilename.isBlank()) {
            throw new ResourceNotFoundException("Nombre de archivo no especificado");
        }

        String filename;
        try {
            filename = URLDecoder.decode(rawFilename, StandardCharsets.UTF_8);
        } catch (Exception e) {
            filename = rawFilename;
        }
        filename = filename.replaceFirst("^/+", "");

        if (filename.contains("..")) {
            throw new ValidationException("Ruta de archivo no válida");
        }

        ExerciseVersion version = exerciseVersionRepository.findById(exerciseIdOrVersionId)
                .or(() -> exerciseRepository.findById(exerciseIdOrVersionId).flatMap(e -> exerciseVersionRepository.findLatestByExerciseId(e.getId())))
                .orElseThrow(() -> new ResourceNotFoundException("Ejercicio no encontrado"));

        UUID exerciseId = version.getExercise().getId();

        // 1. Buscar en la Base de Datos (PostgreSQL) primero
        Optional<ExerciseAsset> dbAsset = exerciseAssetRepository.findByExerciseIdAndFilename(exerciseId, filename);
        if (dbAsset.isPresent()) {
            return new ByteArrayResource(dbAsset.get().getData());
        }

        // 2. Fallback a disco (para assets no migrados todavía)
        String slug = version.getExercise().getSlug();
        List<Path> candidateDirs = new ArrayList<>();
        candidateDirs.add(Path.of("/var/lib/benigascode/catalog/exercises", slug));
        candidateDirs.add(Path.of("/var/lib/benigascode/content/exercises", slug));
        candidateDirs.add(Path.of("catalog/exercises", slug));
        candidateDirs.add(Path.of("content-example/exercises", slug));

        for (Path dir : candidateDirs) {
            if (Files.isDirectory(dir)) {
                Path candidateFile = dir.resolve(filename).normalize();
                if (candidateFile.startsWith(dir) && Files.isRegularFile(candidateFile)) {
                    return new FileSystemResource(candidateFile);
                }
            }
        }

        throw new ResourceNotFoundException("Asset no encontrado: " + filename);
    }

    // ==================== GESTIÓN DE ASSETS ====================

    @Transactional
    public AssetDTO saveAsset(UUID exerciseId, String filename, String contentType, byte[] data) {
        if (data == null || data.length == 0) {
            throw new ValidationException("El contenido del archivo no puede estar vacío");
        }
        if (data.length > 5 * 1024 * 1024) { // 5 MB
            throw new ValidationException("El archivo excede el tamaño máximo permitido de 5 MB");
        }

        Exercise exercise = exerciseRepository.findById(exerciseId)
                .or(() -> exerciseVersionRepository.findById(exerciseId).map(ExerciseVersion::getExercise))
                .orElseThrow(() -> new ResourceNotFoundException("Ejercicio no encontrado"));

        String cleanFilename = filename.replaceAll("[^a-zA-Z0-9._-]", "_");
        Optional<ExerciseAsset> existing = exerciseAssetRepository.findByExerciseIdAndFilename(exercise.getId(), cleanFilename);

        ExerciseAsset asset = existing.orElseGet(() -> new ExerciseAsset(exercise, cleanFilename, contentType, data));
        asset.setContentType(contentType);
        asset.setData(data);
        asset.setSizeBytes(data.length);
        asset = exerciseAssetRepository.save(asset);

        return new AssetDTO(asset.getId(), asset.getFilename(), asset.getContentType(), asset.getSizeBytes(),
                "/api/v1/exercises/" + exercise.getId() + "/assets/" + asset.getFilename());
    }

    @Transactional(readOnly = true)
    public List<AssetDTO> listAssets(UUID exerciseId) {
        Exercise exercise = exerciseRepository.findById(exerciseId)
                .or(() -> exerciseVersionRepository.findById(exerciseId).map(ExerciseVersion::getExercise))
                .orElseThrow(() -> new ResourceNotFoundException("Ejercicio no encontrado"));

        return exerciseAssetRepository.findByExerciseId(exercise.getId()).stream()
                .map(a -> new AssetDTO(a.getId(), a.getFilename(), a.getContentType(), a.getSizeBytes(),
                        "/api/v1/exercises/" + exercise.getId() + "/assets/" + a.getFilename()))
                .toList();
    }

    @Transactional
    public void deleteAsset(UUID exerciseId, String assetIdentifier) {
        Exercise exercise = exerciseRepository.findById(exerciseId)
                .or(() -> exerciseVersionRepository.findById(exerciseId).map(ExerciseVersion::getExercise))
                .orElseThrow(() -> new ResourceNotFoundException("Ejercicio no encontrado"));

        Optional<ExerciseAsset> byFilename = exerciseAssetRepository.findByExerciseIdAndFilename(exercise.getId(), assetIdentifier);
        if (byFilename.isPresent()) {
            exerciseAssetRepository.delete(byFilename.get());
            return;
        }
        try {
            UUID assetId = UUID.fromString(assetIdentifier);
            ExerciseAsset asset = exerciseAssetRepository.findById(assetId)
                    .orElseThrow(() -> new ResourceNotFoundException("Asset no encontrado"));
            if (!asset.getExercise().getId().equals(exercise.getId())) {
                throw new ValidationException("El asset no pertenece al ejercicio indicado");
            }
            exerciseAssetRepository.delete(asset);
        } catch (IllegalArgumentException e) {
            throw new ResourceNotFoundException("Asset no encontrado: " + assetIdentifier);
        }
    }

    // ==================== GESTIÓN DOCENTE DE EJERCICIOS ====================

    @Transactional(readOnly = true)
    public List<ExerciseDTO> listTeacherExercises(String search) {
        List<Exercise> all = exerciseRepository.findAll();
        List<ExerciseDTO> result = new ArrayList<>();

        Map<String, List<String>> exerciseSlugToCollections = new HashMap<>();
        List<Collection> allCollections = collectionRepository.findAll();
        for (Collection c : allCollections) {
            Optional<CollectionVersion> latestCv = collectionVersionRepository.findLatestByCollectionId(c.getId());
            if (latestCv.isPresent()) {
                CollectionVersion cv = latestCv.get();
                String colTitle = (cv.getTitle() != null && !cv.getTitle().isBlank()) ? cv.getTitle() : c.getSlug();
                if (cv.getItems() != null && !cv.getItems().isBlank()) {
                    try {
                        JsonNode arr = objectMapper.readTree(cv.getItems());
                        if (arr.isArray()) {
                            for (JsonNode it : arr) {
                                String exSlug = it.path("id").asText();
                                if (exSlug != null && !exSlug.isBlank()) {
                                    exerciseSlugToCollections.computeIfAbsent(exSlug.toLowerCase(), k -> new ArrayList<>()).add(colTitle);
                                }
                            }
                        }
                    } catch (Exception ignored) {}
                }
            }
        }

        for (Exercise ex : all) {
            Optional<ExerciseVersion> latest = exerciseVersionRepository.findLatestByExerciseId(ex.getId());
            if (latest.isPresent()) {
                ExerciseVersion ev = latest.get();
                if (search == null || search.isBlank()
                        || ev.getTitle().toLowerCase().contains(search.toLowerCase())
                        || ex.getSlug().toLowerCase().contains(search.toLowerCase())) {
                    List<String> tagsList = List.of();
                    if (ev.getTags() != null && !ev.getTags().isBlank()) {
                        try {
                            tagsList = objectMapper.readValue(ev.getTags(), new TypeReference<List<String>>() {});
                        } catch (Exception ignored) {}
                    }
                    List<String> collections = exerciseSlugToCollections.getOrDefault(ex.getSlug().toLowerCase(), new ArrayList<>());
                    collections.sort(String.CASE_INSENSITIVE_ORDER);

                    result.add(new ExerciseDTO(
                            ex.getId(),
                            ex.getId(),
                            ex.getSlug(),
                            ev.getTitle(),
                            ev.getStatement(),
                            ev.getLanguage(),
                            ev.getRuntimeId(),
                            ev.getVersionNumber(),
                            null,
                            tagsList,
                            collections,
                            ex.getCreatedAt()
                    ));
                }
            }
        }
        result.sort(Comparator.comparing(ExerciseDTO::title));
        return result;
    }

    @Transactional(readOnly = true)
    public TeacherExerciseDetailDTO getTeacherExerciseDetail(UUID exerciseId) {
        Exercise exercise = exerciseRepository.findById(exerciseId)
                .or(() -> exerciseVersionRepository.findById(exerciseId).map(ExerciseVersion::getExercise))
                .orElseThrow(() -> new ResourceNotFoundException("Ejercicio no encontrado"));

        ExerciseVersion ev = exerciseVersionRepository.findLatestByExerciseId(exercise.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Versión no encontrada para el ejercicio"));

        Map<String, Object> compileConfig = parseMap(ev.getCompileConfig());
        Map<String, Object> runConfig = parseMap(ev.getRunConfig());
        Map<String, Object> scoringConfig = parseMap(ev.getScoringConfig());
        Map<String, Object> comparatorConfig = parseMap(ev.getComparatorConfig());
        Map<String, String> templates = parseTemplatesMap(ev.getTemplatesConfig());

        List<TestCaseDTO> tests = new ArrayList<>();
        if (ev.getTestsConfig() != null && !ev.getTestsConfig().isBlank()) {
            try {
                JsonNode root = objectMapper.readTree(ev.getTestsConfig());
                int idx = 0;
                for (JsonNode t : root.path("public")) {
                    tests.add(new TestCaseDTO(
                            t.path("id").asText(),
                            t.path("name").asText(),
                            true,
                            idx++,
                            t.path("weight").asDouble(10.0),
                            t.path("input").asText(),
                            t.path("expected").asText(),
                            t.has("explanation") && !t.get("explanation").isNull() ? t.get("explanation").asText() : null
                    ));
                }
                for (JsonNode t : root.path("private")) {
                    tests.add(new TestCaseDTO(
                            t.path("id").asText(),
                            t.path("name").asText(),
                            false,
                            idx++,
                            t.path("weight").asDouble(10.0),
                            t.path("input").asText(),
                            t.path("expected").asText(),
                            t.has("explanation") && !t.get("explanation").isNull() ? t.get("explanation").asText() : null
                    ));
                }
            } catch (Exception ignored) {}
        }

        List<AssetDTO> assets = listAssets(exercise.getId());
        String starterCode = null;
        if (templates != null && !templates.isEmpty()) {
            String runtimeId = ev.getRuntimeId();
            String lang = ev.getLanguage();
            if (runtimeId != null) {
                starterCode = templates.get(runtimeId);
                if (starterCode == null) starterCode = templates.get(runtimeId + ".java");
            }
            if (starterCode == null && lang != null) {
                starterCode = templates.get(lang);
                if (starterCode == null) starterCode = templates.get(lang + ".java");
            }
            if (starterCode == null) starterCode = templates.get("java");
            if (starterCode == null) starterCode = templates.get("default");
            if (starterCode == null) {
                for (Map.Entry<String, String> entry : templates.entrySet()) {
                    if (lang != null && entry.getKey().toLowerCase().startsWith(lang.toLowerCase())) {
                        starterCode = entry.getValue();
                        break;
                    }
                }
            }
            if (starterCode == null && !templates.isEmpty()) {
                starterCode = templates.values().iterator().next();
            }
        }
        List<String> tagsList = List.of();
        try {
            if (ev.getTags() != null && !ev.getTags().isBlank()) {
                tagsList = objectMapper.readValue(ev.getTags(), new TypeReference<List<String>>() {});
            }
        } catch (Exception ignored) {}

        return new TeacherExerciseDetailDTO(
                exercise.getId(),
                exercise.getSlug(),
                ev.getTitle(),
                ev.getStatement(),
                ev.getLanguage(),
                ev.getRuntimeId(),
                ev.getVersionNumber(),
                starterCode,
                compileConfig,
                runConfig,
                scoringConfig,
                comparatorConfig,
                templates,
                tagsList,
                tests,
                tests,
                assets,
                ev.getCreatedAt()
        );
    }

    @Transactional
    public TeacherExerciseDetailDTO createExercise(SaveExerciseRequest req, User teacher) {
        String cleanSlug = req.slug().trim().toLowerCase().replaceAll("[^a-z0-9-]", "-").replaceAll("-+", "-");
        if (exerciseRepository.findBySlug(cleanSlug).isPresent()) {
            throw new ValidationException("Ya existe un ejercicio con el slug: " + cleanSlug);
        }

        Exercise exercise = exerciseRepository.save(new Exercise(cleanSlug));
        ExerciseVersion version = buildExerciseVersion(exercise, 1, req);
        exerciseVersionRepository.save(version);

        return getTeacherExerciseDetail(exercise.getId());
    }

    @Transactional
    public TeacherExerciseDetailDTO updateExercise(UUID exerciseId, SaveExerciseRequest req, User teacher) {
        Exercise exercise = exerciseRepository.findById(exerciseId)
                .or(() -> exerciseVersionRepository.findById(exerciseId).map(ExerciseVersion::getExercise))
                .orElseThrow(() -> new ResourceNotFoundException("Ejercicio no encontrado"));

        String cleanSlug = req.slug().trim().toLowerCase().replaceAll("[^a-z0-9-]", "-").replaceAll("-+", "-");
        if (!exercise.getSlug().equalsIgnoreCase(cleanSlug)) {
            if (exerciseRepository.findBySlug(cleanSlug).isPresent()) {
                throw new ValidationException("Ya existe otro ejercicio con el slug: " + cleanSlug);
            }
            exercise.setSlug(cleanSlug);
            exerciseRepository.save(exercise);
        }

        Optional<ExerciseVersion> latest = exerciseVersionRepository.findLatestByExerciseId(exercise.getId());
        int nextVersion = latest.map(v -> v.getVersionNumber() + 1).orElse(1);

        ExerciseVersion version = buildExerciseVersion(exercise, nextVersion, req);
        exerciseVersionRepository.save(version);

        return getTeacherExerciseDetail(exercise.getId());
    }

    @Transactional
    public void deleteExercise(UUID exerciseId, User teacher) {
        Exercise exercise = exerciseRepository.findById(exerciseId)
                .or(() -> exerciseVersionRepository.findById(exerciseId).map(ExerciseVersion::getExercise))
                .orElseThrow(() -> new ResourceNotFoundException("Ejercicio no encontrado"));
        exerciseRepository.delete(exercise);
    }

    private ExerciseVersion buildExerciseVersion(Exercise exercise, int versionNumber, SaveExerciseRequest req) {
        Map<String, Object> testSuite = new HashMap<>();
        List<Map<String, Object>> pubTests = new ArrayList<>();
        List<Map<String, Object>> privTests = new ArrayList<>();

        List<TestCaseDTO> testsList = req.effectiveTests();
        if (testsList != null) {
            int pubIdx = 1;
            int privIdx = 1;
            for (TestCaseDTO tc : testsList) {
                Map<String, Object> t = new HashMap<>();
                t.put("id", tc.id() != null && !tc.id().isBlank() ? tc.id() : (tc.isPublic() ? "pub-" + pubIdx : "priv-" + privIdx));
                t.put("name", tc.name() != null && !tc.name().isBlank() ? tc.name() : (tc.isPublic() ? "Test Publico #" + pubIdx : "Test Privado #" + privIdx));
                t.put("input", tc.input() != null ? tc.input() : "");
                t.put("expected", tc.effectiveExpected());
                t.put("weight", tc.weight() > 0 ? tc.weight() : 10.0);
                t.put("is_public", tc.isPublic());
                if (tc.explanation() != null && !tc.explanation().isBlank()) {
                    t.put("explanation", tc.explanation());
                }

                if (tc.isPublic()) {
                    pubTests.add(t);
                    pubIdx++;
                } else {
                    privTests.add(t);
                    privIdx++;
                }
            }
        }
        testSuite.put("public", pubTests);
        testSuite.put("private", privTests);

        String runtimeId = req.runtimeId() != null && !req.runtimeId().isBlank() ? req.runtimeId() : "java-26";
        String lang = req.language() != null && !req.language().isBlank() ? req.language() : "java";

        Map<String, String> templatesMap = new HashMap<>();
        if (req.templates() != null) {
            templatesMap.putAll(req.templates());
        } else if (exercise != null && exercise.getId() != null) {
            exerciseVersionRepository.findLatestByExerciseId(exercise.getId()).ifPresent(prev -> {
                Map<String, String> prevTpls = parseTemplatesMap(prev.getTemplatesConfig());
                if (prevTpls != null) {
                    templatesMap.putAll(prevTpls);
                }
            });
        }

        if (req.starterCode() != null) {
            if (!req.starterCode().isBlank()) {
                templatesMap.put(runtimeId, req.starterCode());
                templatesMap.put(runtimeId + ".java", req.starterCode());
                templatesMap.put(lang, req.starterCode());
                templatesMap.put("java", req.starterCode());
            } else {
                templatesMap.remove(runtimeId);
                templatesMap.remove(runtimeId + ".java");
                templatesMap.remove(lang);
                templatesMap.remove("java");
            }
        }

        try {
            String testsJson = objectMapper.writeValueAsString(testSuite);
            String compileJson = objectMapper.writeValueAsString(req.compileConfig() != null ? req.compileConfig() : Map.of("command", "javac Main.java", "timeout_seconds", 15));
            String runJson = objectMapper.writeValueAsString(req.runConfig() != null ? req.runConfig() : Map.of("command", "java Main", "timeout_seconds", 3, "memory_limit_mb", 256));
            String scoringJson = objectMapper.writeValueAsString(req.scoringConfig() != null ? req.scoringConfig() : Map.of("mode", "weighted", "total_score", 100));
            String comparatorJson = objectMapper.writeValueAsString(req.comparatorConfig() != null ? req.comparatorConfig() : Map.of("type", "exact_line_by_line", "ignore_trailing_whitespace", true));
            String templatesJson = objectMapper.writeValueAsString(templatesMap);

            String contentHash = sha256(req.statement() + testsJson + compileJson + runJson + templatesJson);

            ExerciseVersion version = new ExerciseVersion();
            version.setExercise(exercise);
            version.setVersionNumber(versionNumber);
            version.setTitle(req.title().trim());
            version.setStatement(req.statement());
            version.setLanguage(req.language() != null && !req.language().isBlank() ? req.language() : "java");
            version.setRuntimeId(req.runtimeId() != null && !req.runtimeId().isBlank() ? req.runtimeId() : "java-21");
            version.setCompileConfig(compileJson);
            version.setRunConfig(runJson);
            version.setScoringConfig(scoringJson);
            version.setComparatorConfig(comparatorJson);
            version.setTestsConfig(testsJson);
            version.setTemplatesConfig(templatesJson);
            if (req.tags() != null) {
                version.setTags(objectMapper.writeValueAsString(req.tags()));
            } else {
                version.setTags("[]");
            }
            version.setContentHash(contentHash);
            version.setGitCommit("web_edit_" + System.currentTimeMillis());
            version.setStatus("PUBLISHED");
            return version;

        } catch (Exception e) {
            throw new RuntimeException("Error al serializar configuración del ejercicio", e);
        }
    }

    // ==================== GESTIÓN DOCENTE DE COLECCIONES ====================

    @Transactional(readOnly = true)
    public List<TeacherCollectionDetailDTO> listTeacherCollections(String search) {
        List<Collection> all = collectionRepository.findAll();
        List<TeacherCollectionDetailDTO> result = new ArrayList<>();

        for (Collection c : all) {
            Optional<CollectionVersion> latest = collectionVersionRepository.findLatestByCollectionId(c.getId());
            if (latest.isPresent()) {
                CollectionVersion cv = latest.get();
                if (search == null || search.isBlank()
                        || cv.getTitle().toLowerCase().contains(search.toLowerCase())
                        || c.getSlug().toLowerCase().contains(search.toLowerCase())) {
                    result.add(getTeacherCollectionDetail(c.getId()));
                }
            }
        }
        result.sort(Comparator.comparing(TeacherCollectionDetailDTO::title));
        return result;
    }

    @Transactional(readOnly = true)
    public TeacherCollectionDetailDTO getTeacherCollectionDetail(UUID collectionId) {
        Collection col = collectionRepository.findById(collectionId)
                .or(() -> collectionVersionRepository.findById(collectionId).map(CollectionVersion::getCollection))
                .orElseThrow(() -> new ResourceNotFoundException("Colección no encontrada"));

        CollectionVersion cv = collectionVersionRepository.findLatestByCollectionId(col.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Versión no encontrada para la colección"));

        List<CollectionItemDTO> items = new ArrayList<>();
        if (cv.getItems() != null && !cv.getItems().isBlank()) {
            try {
                JsonNode arr = objectMapper.readTree(cv.getItems());
                if (arr.isArray()) {
                    for (JsonNode it : arr) {
                        String type = it.path("type").asText("EXERCISE");
                        String slug = it.path("id").asText();
                        int pos = it.path("position").asInt(1);
                        boolean req = it.path("required").asBoolean(true);
                        double wt = it.path("weight").asDouble(1.0);

                        UUID exId = null;
                        String title = slug;
                        Optional<Exercise> exOpt = exerciseRepository.findBySlug(slug);
                        if (exOpt.isPresent()) {
                            exId = exOpt.get().getId();
                            Optional<ExerciseVersion> evOpt = exerciseVersionRepository.findLatestByExerciseId(exId);
                            if (evOpt.isPresent()) {
                                title = evOpt.get().getTitle();
                            }
                        }

                        items.add(new CollectionItemDTO(type, slug, exId, title, pos, req, wt));
                    }
                }
            } catch (Exception ignored) {}
        }

        Map<String, String> templates = parseTemplatesMap(cv.getTemplatesConfig());

        return new TeacherCollectionDetailDTO(
                col.getId(),
                col.getSlug(),
                cv.getTitle(),
                cv.getDescription(),
                col.getVisibility(),
                cv.getVersionNumber(),
                "java",
                "java-21",
                Map.of("command", "javac Main.java", "timeout_seconds", 15),
                Map.of("command", "java Main", "timeout_seconds", 3, "memory_limit_mb", 256),
                Map.of("mode", "weighted", "total_score", 100),
                Map.of("type", "exact_line_by_line", "ignore_trailing_whitespace", true),
                templates,
                items,
                cv.getCreatedAt()
        );
    }

    @Transactional
    public TeacherCollectionDetailDTO createCollection(SaveCollectionRequest req, User teacher) {
        String cleanSlug = req.slug().trim().toLowerCase().replaceAll("[^a-z0-9-]", "-").replaceAll("-+", "-");
        if (collectionRepository.findBySlug(cleanSlug).isPresent()) {
            throw new ValidationException("Ya existe una colección con el slug: " + cleanSlug);
        }

        String visibility = req.visibility() != null ? req.visibility().toUpperCase() : "PUBLIC";
        Collection collection = collectionRepository.save(new Collection(cleanSlug, visibility));

        CollectionVersion version = buildCollectionVersion(collection, 1, req);
        collectionVersionRepository.save(version);

        return getTeacherCollectionDetail(collection.getId());
    }

    @Transactional
    public TeacherCollectionDetailDTO updateCollection(UUID collectionId, SaveCollectionRequest req, User teacher) {
        Collection collection = collectionRepository.findById(collectionId)
                .or(() -> collectionVersionRepository.findById(collectionId).map(CollectionVersion::getCollection))
                .orElseThrow(() -> new ResourceNotFoundException("Colección no encontrada"));

        String cleanSlug = req.slug().trim().toLowerCase().replaceAll("[^a-z0-9-]", "-").replaceAll("-+", "-");
        if (!collection.getSlug().equalsIgnoreCase(cleanSlug)) {
            if (collectionRepository.findBySlug(cleanSlug).isPresent()) {
                throw new ValidationException("Ya existe otra colección con el slug: " + cleanSlug);
            }
            collection.setSlug(cleanSlug);
        }
        if (req.visibility() != null) {
            collection.setVisibility(req.visibility().toUpperCase());
        }
        collectionRepository.save(collection);

        Optional<CollectionVersion> latest = collectionVersionRepository.findLatestByCollectionId(collection.getId());
        int nextVersion = latest.map(v -> v.getVersionNumber() + 1).orElse(1);

        CollectionVersion version = buildCollectionVersion(collection, nextVersion, req);
        collectionVersionRepository.save(version);

        return getTeacherCollectionDetail(collection.getId());
    }

    @Transactional
    public void deleteCollection(UUID collectionId, User teacher) {
        Collection collection = collectionRepository.findById(collectionId)
                .or(() -> collectionVersionRepository.findById(collectionId).map(CollectionVersion::getCollection))
                .orElseThrow(() -> new ResourceNotFoundException("Colección no encontrada"));
        collectionRepository.delete(collection);
    }

    private CollectionVersion buildCollectionVersion(Collection col, int versionNumber, SaveCollectionRequest req) {
        try {
            List<CollectionItemDTO> itemsToSave = new ArrayList<>();
            if (req.items() != null && !req.items().isEmpty()) {
                itemsToSave.addAll(req.items());
            } else if (req.exerciseIds() != null) {
                int pos = 1;
                for (UUID exId : req.exerciseIds()) {
                    Optional<Exercise> exOpt = exerciseRepository.findById(exId)
                            .or(() -> exerciseVersionRepository.findById(exId).map(ExerciseVersion::getExercise));
                    if (exOpt.isPresent()) {
                        Exercise ex = exOpt.get();
                        String exTitle = ex.getSlug();
                        Optional<ExerciseVersion> evOpt = exerciseVersionRepository.findLatestByExerciseId(ex.getId());
                        if (evOpt.isPresent()) exTitle = evOpt.get().getTitle();
                        itemsToSave.add(new CollectionItemDTO("EXERCISE", ex.getSlug(), ex.getId(), exTitle, pos, true, 1.0));
                        pos++;
                    }
                }
            }

            String itemsJson = objectMapper.writeValueAsString(itemsToSave);
            String templatesJson = objectMapper.writeValueAsString(req.templates() != null ? req.templates() : Map.of());

            CollectionVersion cv = new CollectionVersion();
            cv.setCollection(col);
            cv.setVersionNumber(versionNumber);
            cv.setTitle(req.title().trim());
            cv.setDescription(req.description() != null ? req.description().trim() : "");
            cv.setItems(itemsJson);
            cv.setTemplatesConfig(templatesJson);
            return cv;
        } catch (Exception e) {
            throw new RuntimeException("Error al serializar colección", e);
        }
    }

    // ==================== HELPERS ====================

    private Map<String, Object> parseMap(String json) {
        if (json == null || json.isBlank()) return Map.of();
        try {
            return objectMapper.readValue(json, new TypeReference<>() {});
        } catch (Exception e) {
            return Map.of();
        }
    }

    private Map<String, String> parseTemplatesMap(String json) {
        if (json == null || json.isBlank()) return Map.of();
        try {
            return objectMapper.readValue(json, new TypeReference<>() {});
        } catch (Exception e) {
            return Map.of();
        }
    }

    public void assertCanAccessCollection(User user, Collection collection) {
        if (user.getRole() == Role.TEACHER || user.getRole() == Role.ADMIN) {
            return;
        }
        if ("PUBLIC".equalsIgnoreCase(collection.getVisibility())) {
            return;
        }
        List<TeachingSpace> studentSpaces = contextService.findSpacesForStudent(user);
        boolean inSpace = studentSpaces.stream().anyMatch(ts -> ts.getCollections().contains(collection));
        if (inSpace) {
            return;
        }
        if (accessGrantRepository.existsByUserIdAndCollectionId(user.getId(), collection.getId())) {
            return;
        }
        throw new AccessDeniedException("Acceso no autorizado a esta colección");
    }

    public static String sha256(String data) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] hash = md.digest(data.getBytes(StandardCharsets.UTF_8));
            StringBuilder hexString = new StringBuilder();
            for (byte b : hash) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) hexString.append('0');
                hexString.append(hex);
            }
            return hexString.toString();
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException("SHA-256 no disponible", e);
        }
    }

    private String generateRandomKey() {
        String chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
        SecureRandom random = new SecureRandom();
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < 9; i++) {
            if (i == 3 || i == 6) sb.append('-');
            sb.append(chars.charAt(random.nextInt(chars.length())));
        }
        return sb.toString();
    }
}
