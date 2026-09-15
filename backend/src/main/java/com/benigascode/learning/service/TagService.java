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
import com.benigascode.learning.repository.StudentTagRepository;
import com.benigascode.learning.repository.TagRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class TagService {

    private final TagRepository tagRepository;
    private final StudentTagRepository studentTagRepository;
    private final UserRepository userRepository;

    public TagService(TagRepository tagRepository,
                      StudentTagRepository studentTagRepository,
                      UserRepository userRepository) {
        this.tagRepository = tagRepository;
        this.studentTagRepository = studentTagRepository;
        this.userRepository = userRepository;
    }

    @Transactional(readOnly = true)
    public List<TagDTO> listTags(String category) {
        List<Tag> tags = (category != null && !category.isBlank())
            ? tagRepository.findByCategoryOrderByValueAsc(category.trim())
            : tagRepository.findAllByOrderByCategoryAscValueAsc();

        return tags.stream().map(TagDTO::fromEntity).toList();
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

        Tag tag = new Tag(cleanCategory, cleanValue, request.description() != null ? request.description().trim() : null);
        tag = tagRepository.save(tag);
        return TagDTO.fromEntity(tag);
    }

    @Transactional
    public void deleteTag(UUID tagId) {
        Tag tag = tagRepository.findById(tagId)
            .orElseThrow(() -> new ResourceNotFoundException("Etiqueta no encontrada: " + tagId));

        List<StudentTag> usages = studentTagRepository.findByTagId(tagId);
        if (!usages.isEmpty()) {
            throw new ValidationException("No se puede eliminar la etiqueta porque está asignada a alumnos");
        }

        tagRepository.delete(tag);
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
}

