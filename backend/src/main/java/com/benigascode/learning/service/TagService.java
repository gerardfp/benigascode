package com.benigascode.learning.service;

import com.benigascode.common.exception.ResourceNotFoundException;
import com.benigascode.common.exception.ValidationException;
import com.benigascode.identity.domain.Role;
import com.benigascode.identity.domain.User;
import com.benigascode.identity.repository.UserRepository;
import com.benigascode.learning.domain.StudentTag;
import com.benigascode.learning.domain.Tag;
import com.benigascode.learning.dto.AssignStudentTagRequest;
import com.benigascode.learning.dto.CreateTagRequest;
import com.benigascode.learning.dto.StudentTagDTO;
import com.benigascode.learning.dto.TagDTO;
import com.benigascode.learning.dto.UpdateTagRequest;
import com.benigascode.learning.domain.TeachingSpace;
import com.benigascode.learning.repository.StudentTagRepository;
import com.benigascode.learning.repository.TagRepository;
import com.benigascode.learning.repository.TeachingSpaceRepository;
import com.benigascode.learning.util.TagColorUtil;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class TagService {

    private final TagRepository tagRepository;
    private final StudentTagRepository studentTagRepository;
    private final UserRepository userRepository;
    private final TeachingSpaceRepository teachingSpaceRepository;

    @PersistenceContext
    private EntityManager entityManager;

    public TagService(TagRepository tagRepository,
                      StudentTagRepository studentTagRepository,
                      UserRepository userRepository,
                      TeachingSpaceRepository teachingSpaceRepository) {
        this.tagRepository = tagRepository;
        this.studentTagRepository = studentTagRepository;
        this.userRepository = userRepository;
        this.teachingSpaceRepository = teachingSpaceRepository;
    }

    @Transactional(readOnly = true)
    public List<TagDTO> listTags(String category) {
        return listTags(category, false);
    }

    @Transactional(readOnly = true)
    public List<TagDTO> listTags(String category, boolean includeUsage) {
        List<Tag> tags = (category != null && !category.isBlank())
            ? tagRepository.findByCategoryOrderByValueAsc(category.trim())
            : tagRepository.findAllByOrderByCategoryAscValueAsc();

        if (!includeUsage) {
            return tags.stream().map(TagDTO::fromEntity).toList();
        }

        Map<UUID, Long> studentCounts = new HashMap<>();
        for (Object[] row : studentTagRepository.countDistinctStudentsByTagId()) {
            if (row != null && row.length >= 2 && row[0] != null && row[1] != null) {
                studentCounts.put((UUID) row[0], ((Number) row[1]).longValue());
            }
        }

        Map<UUID, Long> spaceCounts = new HashMap<>();
        for (TeachingSpace space : teachingSpaceRepository.findAll()) {
            for (UUID tagId : space.getRequiredTagIds()) {
                spaceCounts.put(tagId, spaceCounts.getOrDefault(tagId, 0L) + 1);
            }
        }

        return tags.stream().map(t -> TagDTO.fromEntityWithUsage(
            t,
            studentCounts.getOrDefault(t.getId(), 0L),
            spaceCounts.getOrDefault(t.getId(), 0L)
        )).toList();
    }

    @Transactional(readOnly = true)
    public List<String> listCategories() {
        return tagRepository.findAllDistinctCategories();
    }

    @Transactional
    public TagDTO createTag(CreateTagRequest request) {
        String cleanCategory = request.category().trim();
        String cleanValue = request.value().trim();

        if (tagRepository.existsByCategoryAndValue(cleanCategory, cleanValue)) {
            throw new ValidationException("Ya existe una etiqueta con la categoría '" + cleanCategory + "' y valor '" + cleanValue + "'");
        }

        String color = TagColorUtil.sanitizeColor(request.color(), cleanCategory, cleanValue);
        Tag tag = new Tag(cleanCategory, cleanValue, request.description() != null ? request.description().trim() : null, color);
        tag = tagRepository.save(tag);
        return TagDTO.fromEntity(tag);
    }

    @Transactional
    public TagDTO updateTag(UUID tagId, UpdateTagRequest request) {
        Tag tag = tagRepository.findById(tagId)
            .orElseThrow(() -> new ResourceNotFoundException("Etiqueta no encontrada: " + tagId));

        String targetCategory = (request.category() != null && !request.category().isBlank())
            ? request.category().trim() : tag.getCategory();
        String targetValue = (request.value() != null && !request.value().isBlank())
            ? request.value().trim() : tag.getValue();

        if ((!targetCategory.equals(tag.getCategory()) || !targetValue.equals(tag.getValue()))
            && tagRepository.existsByCategoryAndValue(targetCategory, targetValue)) {
            throw new ValidationException("Ya existe una etiqueta con la categoría '" + targetCategory + "' y valor '" + targetValue + "'");
        }

        tag.setCategory(targetCategory);
        tag.setValue(targetValue);

        if (request.description() != null) {
            tag.setDescription(request.description().trim().isEmpty() ? null : request.description().trim());
        }

        if (request.color() != null && !request.color().isBlank()) {
            String color = TagColorUtil.sanitizeColor(request.color(), tag.getCategory(), tag.getValue());
            tag.setColor(color);
        }

        tag = tagRepository.save(tag);
        return TagDTO.fromEntity(tag);
    }

    @Transactional
    public void deleteTag(UUID tagId) {
        deleteTag(tagId, false);
    }

    @Transactional
    public void deleteTag(UUID tagId, boolean force) {
        Tag tag = tagRepository.findById(tagId)
            .orElseThrow(() -> new ResourceNotFoundException("Etiqueta no encontrada: " + tagId));

        List<StudentTag> usages = studentTagRepository.findByTagId(tagId);
        boolean usedInSpaces = teachingSpaceRepository.findAll().stream()
            .anyMatch(s -> s.getRequiredTagIds().contains(tagId));

        if (!force && (!usages.isEmpty() || usedInSpaces)) {
            throw new ValidationException("No se puede eliminar la etiqueta porque está asignada a alumnos o espacios");
        }

        if (force) {
            for (StudentTag st : usages) {
                studentTagRepository.delete(st);
            }
            for (TeachingSpace space : teachingSpaceRepository.findAll()) {
                List<UUID> req = space.getRequiredTagIds();
                if (req.contains(tagId)) {
                    List<UUID> newReq = req.stream().filter(id -> !id.equals(tagId)).toList();
                    space.setRequiredTagIds(newReq);
                    teachingSpaceRepository.save(space);
                }
            }
            if (entityManager != null) {
                entityManager.createNativeQuery("DELETE FROM invitation_code_tags WHERE tag_id = :tagId")
                    .setParameter("tagId", tagId).executeUpdate();
            }
        }

        tagRepository.delete(tag);
    }

    @Transactional
    public void mergeTags(UUID sourceTagId, UUID targetTagId) {
        if (sourceTagId.equals(targetTagId)) {
            throw new ValidationException("No se puede combinar una etiqueta consigo misma");
        }
        Tag sourceTag = tagRepository.findById(sourceTagId)
            .orElseThrow(() -> new ResourceNotFoundException("Etiqueta origen no encontrada: " + sourceTagId));
        Tag targetTag = tagRepository.findById(targetTagId)
            .orElseThrow(() -> new ResourceNotFoundException("Etiqueta destino no encontrada: " + targetTagId));

        // 1. Reasignar asignaciones de alumnos
        List<StudentTag> sourceStudentTags = studentTagRepository.findByTagId(sourceTagId);
        for (StudentTag st : sourceStudentTags) {
            UUID studentId = st.getStudent().getId();
            Optional<StudentTag> existingTarget = studentTagRepository.findActiveByStudentIdAndTagId(studentId, targetTagId);
            if (existingTarget.isPresent()) {
                studentTagRepository.delete(st);
            } else {
                st.setTag(targetTag);
                studentTagRepository.save(st);
            }
        }

        // 2. Actualizar espacios docentes
        List<TeachingSpace> spaces = teachingSpaceRepository.findAll();
        for (TeachingSpace space : spaces) {
            List<UUID> req = space.getRequiredTagIds();
            if (req.contains(sourceTagId)) {
                List<UUID> newReq = new ArrayList<>();
                for (UUID id : req) {
                    if (id.equals(sourceTagId)) {
                        if (!newReq.contains(targetTagId)) {
                            newReq.add(targetTagId);
                        }
                    } else {
                        if (!newReq.contains(id)) {
                            newReq.add(id);
                        }
                    }
                }
                space.setRequiredTagIds(newReq);
                teachingSpaceRepository.save(space);
            }
        }

        // 3. Actualizar invitation_code_tags
        if (entityManager != null) {
            entityManager.createNativeQuery(
                "DELETE FROM invitation_code_tags WHERE tag_id = :sourceId AND invitation_code_id IN " +
                "(SELECT invitation_code_id FROM invitation_code_tags WHERE tag_id = :targetId)"
            ).setParameter("sourceId", sourceTagId).setParameter("targetId", targetTagId).executeUpdate();

            entityManager.createNativeQuery(
                "UPDATE invitation_code_tags SET tag_id = :targetId WHERE tag_id = :sourceId"
            ).setParameter("sourceId", sourceTagId).setParameter("targetId", targetTagId).executeUpdate();
        }

        // 4. Eliminar etiqueta origen
        tagRepository.delete(sourceTag);
    }

    @Transactional
    public int cleanUnusedTags() {
        List<Tag> allTags = tagRepository.findAll();
        Set<UUID> usedIds = new HashSet<>(studentTagRepository.findDistinctTagIds());

        for (TeachingSpace space : teachingSpaceRepository.findAll()) {
            usedIds.addAll(space.getRequiredTagIds());
        }

        if (entityManager != null) {
            @SuppressWarnings("unchecked")
            List<UUID> invitationTagIds = entityManager.createNativeQuery(
                "SELECT DISTINCT tag_id FROM invitation_code_tags"
            ).getResultList();
            if (invitationTagIds != null) {
                usedIds.addAll(invitationTagIds);
            }
        }

        int deletedCount = 0;
        for (Tag tag : allTags) {
            if (!usedIds.contains(tag.getId())) {
                tagRepository.delete(tag);
                deletedCount++;
            }
        }
        return deletedCount;
    }

    @Transactional(readOnly = true)
    public List<StudentTagDTO> getStudentTags(UUID studentId, boolean onlyActive) {
        List<StudentTag> list = onlyActive
            ? studentTagRepository.findActiveByStudentId(studentId)
            : studentTagRepository.findByStudentIdOrderByValidFromDesc(studentId);

        return list.stream().map(StudentTagDTO::fromEntity).toList();
    }

    @Transactional
    public StudentTagDTO assignTagToStudent(UUID studentId, AssignStudentTagRequest request, User teacher) {
        User student = userRepository.findById(studentId)
            .orElseThrow(() -> new ResourceNotFoundException("Alumno no encontrado: " + studentId));

        if (student.getRole() != Role.STUDENT) {
            throw new ValidationException("El usuario seleccionado no es un alumno");
        }

        Tag tag = tagRepository.findById(request.tagId())
            .orElseThrow(() -> new ResourceNotFoundException("Etiqueta no encontrada: " + request.tagId()));

        Optional<StudentTag> existingActive = studentTagRepository.findActiveByStudentIdAndTagId(studentId, tag.getId());
        if (existingActive.isPresent()) {
            // Ya la tiene activa; retornar la existente
            return StudentTagDTO.fromEntity(existingActive.get());
        }

        Instant validFrom = request.validFrom() != null ? request.validFrom() : Instant.now();
        StudentTag studentTag = new StudentTag(student, tag, validFrom, request.validUntil(), teacher);
        studentTag = studentTagRepository.save(studentTag);

        return StudentTagDTO.fromEntity(studentTag);
    }

    @Transactional
    public void revokeTagFromStudent(UUID studentId, UUID tagId, User teacher) {
        Optional<StudentTag> activeOpt = studentTagRepository.findActiveByStudentIdAndTagId(studentId, tagId);
        if (activeOpt.isPresent()) {
            StudentTag st = activeOpt.get();
            st.setValidUntil(Instant.now());
            studentTagRepository.save(st);
        }
    }

    @Transactional
    public StudentTagDTO assignTag(UUID studentId, UUID tagId, User teacher, Instant validFrom, Instant validUntil) {
        return assignTagToStudent(studentId, new AssignStudentTagRequest(tagId, validFrom, validUntil), teacher);
    }

    @Transactional
    public void revokeTagAssignment(UUID assignmentId, User teacher) {
        studentTagRepository.findById(assignmentId).ifPresent(st -> {
            st.setValidUntil(Instant.now());
            studentTagRepository.save(st);
        });
    }

    @Transactional
    public void revokeTag(UUID studentId, UUID tagId, User teacher) {
        revokeTagFromStudent(studentId, tagId, teacher);
    }

    @Transactional
    public void batchAssignTag(List<UUID> studentIds, UUID tagId, User teacher, Instant validFrom, Instant validUntil) {
        if (studentIds == null || studentIds.isEmpty()) return;
        Tag tag = tagRepository.findById(tagId)
            .orElseThrow(() -> new ResourceNotFoundException("Etiqueta no encontrada: " + tagId));

        Instant from = validFrom != null ? validFrom : Instant.now();
        for (UUID studentId : studentIds) {
            Optional<StudentTag> existingActive = studentTagRepository.findActiveByStudentIdAndTagId(studentId, tag.getId());
            if (existingActive.isEmpty()) {
                User student = userRepository.findById(studentId).orElse(null);
                if (student != null && student.getRole() == Role.STUDENT) {
                    StudentTag st = new StudentTag(student, tag, from, validUntil, teacher);
                    studentTagRepository.save(st);
                }
            }
        }
    }

    @Transactional
    public void batchRevokeTag(List<UUID> studentIds, UUID tagId, User teacher) {
        if (studentIds == null || studentIds.isEmpty()) return;
        Instant now = Instant.now();
        for (UUID studentId : studentIds) {
            studentTagRepository.findActiveByStudentIdAndTagId(studentId, tagId).ifPresent(st -> {
                st.setValidUntil(now);
                studentTagRepository.save(st);
            });
        }
    }

    @Transactional
    public void batchAssignSpace(List<UUID> studentIds, UUID spaceId, User teacher, Instant validFrom, Instant validUntil) {
        if (studentIds == null || studentIds.isEmpty()) return;
        TeachingSpace space = teachingSpaceRepository.findById(spaceId)
            .orElseThrow(() -> new ResourceNotFoundException("Espacio docente no encontrado: " + spaceId));
        List<UUID> tagIds = space.getRequiredTagIds();
        for (UUID tagId : tagIds) {
            batchAssignTag(studentIds, tagId, teacher, validFrom, validUntil);
        }
    }

    @Transactional
    public void batchRevokeSpace(List<UUID> studentIds, UUID spaceId, User teacher) {
        if (studentIds == null || studentIds.isEmpty()) return;
        TeachingSpace space = teachingSpaceRepository.findById(spaceId)
            .orElseThrow(() -> new ResourceNotFoundException("Espacio docente no encontrado: " + spaceId));
        List<UUID> targetTagIds = space.getRequiredTagIds();
        if (targetTagIds.isEmpty()) return;

        List<TeachingSpace> allSpaces = teachingSpaceRepository.findAll();
        Instant now = Instant.now();

        for (UUID studentId : studentIds) {
            List<StudentTag> activeTags = studentTagRepository.findActiveByStudentId(studentId, now);
            Set<UUID> studentTagIds = activeTags.stream()
                .map(st -> st.getTag().getId())
                .collect(Collectors.toSet());

            Set<UUID> tagsKeptByOtherSpaces = allSpaces.stream()
                .filter(s -> !s.getId().equals(spaceId))
                .filter(s -> {
                    List<UUID> req = s.getRequiredTagIds();
                    return !req.isEmpty() && studentTagIds.containsAll(req);
                })
                .flatMap(s -> s.getRequiredTagIds().stream())
                .collect(Collectors.toSet());

            for (UUID tagId : targetTagIds) {
                if (!tagsKeptByOtherSpaces.contains(tagId)) {
                    studentTagRepository.findActiveByStudentIdAndTagId(studentId, tagId).ifPresent(st -> {
                        st.setValidUntil(now);
                        studentTagRepository.save(st);
                    });
                }
            }
        }
    }
}

