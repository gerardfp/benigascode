package com.benigascode.identity.service;

import com.benigascode.common.exception.ResourceNotFoundException;
import com.benigascode.common.exception.ValidationException;
import com.benigascode.identity.domain.Role;
import com.benigascode.identity.domain.User;
import com.benigascode.identity.dto.TeacherStudentDTO;
import com.benigascode.identity.repository.UserRepository;
import com.benigascode.learning.domain.StudentTag;
import com.benigascode.learning.domain.Tag;
import com.benigascode.learning.domain.TeachingSpace;
import com.benigascode.learning.dto.StudentTagDTO;
import com.benigascode.learning.repository.StudentTagRepository;
import com.benigascode.learning.repository.TagRepository;
import com.benigascode.learning.repository.TeachingSpaceRepository;
import com.benigascode.learning.service.ContextService;
import com.benigascode.learning.service.TagService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.*;

@Service
public class TeacherStudentService {

    private final UserRepository userRepository;
    private final TeachingSpaceRepository teachingSpaceRepository;
    private final TagRepository tagRepository;
    private final StudentTagRepository studentTagRepository;
    private final ContextService contextService;
    private final TagService tagService;

    public TeacherStudentService(UserRepository userRepository,
                                 TeachingSpaceRepository teachingSpaceRepository,
                                 TagRepository tagRepository,
                                 StudentTagRepository studentTagRepository,
                                 ContextService contextService,
                                 TagService tagService) {
        this.userRepository = userRepository;
        this.teachingSpaceRepository = teachingSpaceRepository;
        this.tagRepository = tagRepository;
        this.studentTagRepository = studentTagRepository;
        this.contextService = contextService;
        this.tagService = tagService;
    }

    @Transactional(readOnly = true)
    public List<TeacherStudentDTO> listStudents(UUID spaceId, String tag, String search) {
        return listStudents(spaceId, tag, null, null, search);
    }

    @Transactional(readOnly = true)
    public List<TeacherStudentDTO> listStudents(UUID spaceId, String tag, String category, String value, String search) {
        List<User> students = userRepository.findByRoleOrderByFullNameAsc(Role.STUDENT);

        if (students.isEmpty()) {
            return Collections.emptyList();
        }

        String searchLower = search != null ? search.trim().toLowerCase() : null;
        String tagFilterLower = tag != null && !tag.trim().isBlank() ? tag.trim().toLowerCase() : null;

        List<TeachingSpace> allSpaces = teachingSpaceRepository.findAll();
        Instant now = Instant.now();

        List<TeacherStudentDTO> result = new ArrayList<>();

        for (User student : students) {
            List<StudentTag> activeStudentTags = studentTagRepository.findActiveByStudentId(student.getId(), now);
            List<StudentTagDTO> activeTagDTOs = activeStudentTags.stream().map(StudentTagDTO::fromEntity).toList();

            List<String> tagDisplayList = activeStudentTags.stream()
                    .map(st -> st.getTag().getCategory() + ":" + st.getTag().getValue())
                    .toList();

            List<TeacherStudentDTO.StudentSpaceDTO> matchedSpaces = allSpaces.stream()
                    .filter(sp -> contextService.studentMatchesSpace(student.getId(), sp, now))
                    .map(sp -> new TeacherStudentDTO.StudentSpaceDTO(sp.getId(), sp.getName()))
                    .toList();

            List<TeacherStudentDTO.StudentCourseMembershipDTO> courseDTOs = matchedSpaces.stream()
                    .map(sp -> new TeacherStudentDTO.StudentCourseMembershipDTO(
                            sp.spaceId(),
                            sp.spaceName(),
                            "SPACE",
                            "",
                            null,
                            null
                    ))
                    .toList();

            if (spaceId != null) {
                boolean matchesSpace = matchedSpaces.stream().anyMatch(sp -> sp.spaceId().equals(spaceId));
                if (!matchesSpace) {
                    continue;
                }
            }

            if (tagFilterLower != null) {
                boolean matchesTag = activeStudentTags.stream().anyMatch(st ->
                        st.getTag().getValue().toLowerCase().contains(tagFilterLower) ||
                        st.getTag().getCategory().toLowerCase().contains(tagFilterLower) ||
                        (st.getTag().getCategory() + ":" + st.getTag().getValue()).toLowerCase().contains(tagFilterLower));
                if (!matchesTag) {
                    continue;
                }
            }

            if (category != null && !category.isBlank()) {
                String catLower = category.trim().toLowerCase();
                boolean matchesCategory = activeStudentTags.stream().anyMatch(st ->
                        st.getTag() != null && st.getTag().getCategory().toLowerCase().equals(catLower));
                if (!matchesCategory) {
                    continue;
                }
            }

            if (value != null && !value.isBlank()) {
                String valLower = value.trim().toLowerCase();
                boolean matchesValue = activeStudentTags.stream().anyMatch(st ->
                        st.getTag() != null && st.getTag().getValue().toLowerCase().equals(valLower));
                if (!matchesValue) {
                    continue;
                }
            }

            if (searchLower != null && !searchLower.isBlank()) {
                boolean matchesName = student.getFullName() != null && student.getFullName().toLowerCase().contains(searchLower);
                boolean matchesUsername = student.getUsername() != null && student.getUsername().toLowerCase().contains(searchLower);
                boolean matchesGithub = student.getGithubUsername() != null && student.getGithubUsername().toLowerCase().contains(searchLower);

                if (!matchesName && !matchesUsername && !matchesGithub) {
                    continue;
                }
            }

            result.add(new TeacherStudentDTO(
                    student.getId(),
                    student.getUsername(),
                    student.getFullName(),
                    student.getGithubUsername(),
                    student.getAvatarUrl(),
                    student.getCreatedAt(),
                    courseDTOs,
                    tagDisplayList,
                    activeTagDTOs,
                    matchedSpaces
            ));
        }

        return result;
    }

    @Transactional
    public void assignCourse(UUID studentId, UUID spaceId, UUID groupId, User teacher) {
        TeachingSpace space = teachingSpaceRepository.findById(spaceId)
                .orElseThrow(() -> new ResourceNotFoundException("Espacio docente no encontrado: " + spaceId));

        for (UUID requiredTagId : space.getRequiredTagIds()) {
            tagService.assignTag(studentId, requiredTagId, teacher, null, null);
        }
    }

    @Transactional
    public void unassignCourse(UUID studentId, UUID spaceId, User teacher) {
        TeachingSpace space = teachingSpaceRepository.findById(spaceId)
                .orElseThrow(() -> new ResourceNotFoundException("Espacio docente no encontrado: " + spaceId));

        for (UUID requiredTagId : space.getRequiredTagIds()) {
            tagService.revokeTag(studentId, requiredTagId, teacher);
        }
    }

    @Transactional
    public void addTag(UUID studentId, String tagStr, User teacher) {
        if (tagStr == null || tagStr.trim().isBlank()) {
            throw new ValidationException("La etiqueta no puede estar vacía");
        }

        String clean = tagStr.trim();
        String category = "custom";
        String value = clean;

        if (clean.contains(":")) {
            String[] parts = clean.split(":", 2);
            category = parts[0].trim();
            value = parts[1].trim();
        }

        final String finalCat = category;
        final String finalVal = value;
        Tag tag = tagRepository.findByCategoryAndValue(finalCat, finalVal)
                .orElseGet(() -> tagRepository.save(new Tag(finalCat, finalVal, null)));

        tagService.assignTag(studentId, tag.getId(), teacher, null, null);
    }

    @Transactional
    public void removeTag(UUID studentId, String tagStr, User teacher) {
        if (tagStr == null || tagStr.trim().isBlank()) {
            return;
        }

        String clean = tagStr.trim();
        String category = "custom";
        String value = clean;

        if (clean.contains(":")) {
            String[] parts = clean.split(":", 2);
            category = parts[0].trim();
            value = parts[1].trim();
        }

        Optional<Tag> tagOpt = tagRepository.findByCategoryAndValue(category, value);
        if (tagOpt.isPresent()) {
            tagService.revokeTag(studentId, tagOpt.get().getId(), teacher);
        }
    }

    @Transactional(readOnly = true)
    public List<String> listAllTags() {
        return tagRepository.findAll().stream()
                .map(t -> t.getCategory() + ":" + t.getValue())
                .sorted()
                .toList();
    }
}
