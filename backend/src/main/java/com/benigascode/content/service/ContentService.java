package com.benigascode.content.service;

import com.benigascode.common.exception.ResourceNotFoundException;
import com.benigascode.common.exception.ValidationException;
import com.benigascode.content.domain.*;
import com.benigascode.content.domain.Collection;
import com.benigascode.content.dto.CollectionDTO;
import com.benigascode.content.dto.CreateAccessKeyResponse;
import com.benigascode.content.dto.ExerciseDTO;
import com.benigascode.content.dto.PublicTestDTO;
import com.benigascode.content.repository.*;
import com.benigascode.identity.domain.Role;
import com.benigascode.identity.domain.User;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
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

@Service
public class ContentService {

    private final CollectionRepository collectionRepository;
    private final CollectionVersionRepository collectionVersionRepository;
    private final ExerciseRepository exerciseRepository;
    private final ExerciseVersionRepository exerciseVersionRepository;
    private final AccessKeyRepository accessKeyRepository;
    private final AccessGrantRepository accessGrantRepository;
    private final ObjectMapper objectMapper;

    public ContentService(CollectionRepository collectionRepository,
                          CollectionVersionRepository collectionVersionRepository,
                          ExerciseRepository exerciseRepository,
                          ExerciseVersionRepository exerciseVersionRepository,
                          AccessKeyRepository accessKeyRepository,
                          AccessGrantRepository accessGrantRepository,
                          ObjectMapper objectMapper) {
        this.collectionRepository = collectionRepository;
        this.collectionVersionRepository = collectionVersionRepository;
        this.exerciseRepository = exerciseRepository;
        this.exerciseVersionRepository = exerciseVersionRepository;
        this.accessKeyRepository = accessKeyRepository;
        this.accessGrantRepository = accessGrantRepository;
        this.objectMapper = objectMapper;
    }

    @Transactional(readOnly = true)
    public List<CollectionDTO> getAccessibleCollections(User user) {
        if (user.getRole() == Role.TEACHER || user.getRole() == Role.ADMIN) {
            return collectionRepository.findAll().stream()
                    .map(c -> CollectionDTO.from(c, collectionVersionRepository.findLatestByCollectionId(c.getId()).orElse(null)))
                    .toList();
        }

        Set<Collection> accessible = new HashSet<>();
        accessible.addAll(collectionRepository.findPublicCollections());
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
        String starterCode = null;

        // 1. Plantilla específica a nivel de ejercicio
        try {
            if (version.getTemplatesConfig() != null) {
                JsonNode exTemplates = objectMapper.readTree(version.getTemplatesConfig());
                if (exTemplates.has(runtimeId)) {
                    starterCode = exTemplates.get(runtimeId).asText();
                }
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
                    if (colTemplates.has(runtimeId)) {
                        starterCode = colTemplates.get(runtimeId).asText();
                    }
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
        key = accessKeyRepository.save(key);

        return new CreateAccessKeyResponse(key.getId(), collectionId, rawKey, maxUses, expiresAt);
    }

    @Transactional(readOnly = true)
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

    public void assertCanAccessCollection(User user, Collection collection) {
        if (user.getRole() == Role.TEACHER || user.getRole() == Role.ADMIN) {
            return;
        }
        if ("PUBLIC".equalsIgnoreCase(collection.getVisibility())) {
            return;
        }
        if (accessGrantRepository.existsByUserIdAndCollectionId(user.getId(), collection.getId())) {
            return;
        }
        // Devolver 404 para no filtrar que la colección privada existe
        throw new ResourceNotFoundException("Colección no encontrada");
    }

    public static String sha256(String input) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(input.getBytes(StandardCharsets.UTF_8));
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

