package com.benigascode.identity.service;

import com.benigascode.common.exception.ResourceNotFoundException;
import com.benigascode.common.exception.ValidationException;
import com.benigascode.identity.domain.Role;
import com.benigascode.identity.domain.StudentTag;
import com.benigascode.identity.domain.User;
import com.benigascode.identity.dto.TeacherStudentDTO;
import com.benigascode.identity.repository.StudentTagRepository;
import com.benigascode.identity.repository.UserRepository;
import com.benigascode.learning.domain.Course;
import com.benigascode.learning.domain.CourseMembership;
import com.benigascode.learning.domain.Group;
import com.benigascode.learning.repository.CourseMembershipRepository;
import com.benigascode.learning.repository.CourseRepository;
import com.benigascode.learning.repository.GroupRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class TeacherStudentService {

    private final UserRepository userRepository;
    private final CourseRepository courseRepository;
    private final GroupRepository groupRepository;
    private final CourseMembershipRepository membershipRepository;
    private final StudentTagRepository studentTagRepository;

    public TeacherStudentService(UserRepository userRepository,
                                 CourseRepository courseRepository,
                                 GroupRepository groupRepository,
                                 CourseMembershipRepository membershipRepository,
                                 StudentTagRepository studentTagRepository) {
        this.userRepository = userRepository;
        this.courseRepository = courseRepository;
        this.groupRepository = groupRepository;
        this.membershipRepository = membershipRepository;
        this.studentTagRepository = studentTagRepository;
    }

    @Transactional(readOnly = true)
    public List<TeacherStudentDTO> listStudents(UUID courseId, String tag, String search) {
        List<User> students = userRepository.findByRoleOrderByFullNameAsc(Role.STUDENT);

        if (students.isEmpty()) {
            return Collections.emptyList();
        }

        List<UUID> studentIds = students.stream().map(User::getId).toList();

        // Cargar membresías de cursos de los alumnos
        List<CourseMembership> allMemberships = membershipRepository.findAll();
        Map<UUID, List<TeacherStudentDTO.StudentCourseMembershipDTO>> membershipsByStudent = new HashMap<>();
        for (CourseMembership cm : allMemberships) {
            if ("STUDENT".equals(cm.getRole())) {
                membershipsByStudent.computeIfAbsent(cm.getUser().getId(), k -> new ArrayList<>())
                    .add(new TeacherStudentDTO.StudentCourseMembershipDTO(
                        cm.getCourse().getId(),
                        cm.getCourse().getName(),
                        cm.getCourse().getCode(),
                        cm.getCourse().getAcademicYear(),
                        cm.getGroup() != null ? cm.getGroup().getId() : null,
                        cm.getGroup() != null ? cm.getGroup().getName() : null
                    ));
            }
        }

        // Cargar etiquetas privadas de los alumnos
        List<StudentTag> allTags = studentTagRepository.findByStudentIdIn(studentIds);
        Map<UUID, List<String>> tagsByStudent = new HashMap<>();
        for (StudentTag st : allTags) {
            tagsByStudent.computeIfAbsent(st.getStudent().getId(), k -> new ArrayList<>())
                .add(st.getTag());
        }

        String searchLower = search != null ? search.trim().toLowerCase() : null;
        String tagFilterLower = tag != null && !tag.trim().isBlank() ? tag.trim().toLowerCase() : null;

        List<TeacherStudentDTO> result = new ArrayList<>();

        for (User student : students) {
            List<TeacherStudentDTO.StudentCourseMembershipDTO> studentCourses =
                membershipsByStudent.getOrDefault(student.getId(), Collections.emptyList());
            List<String> studentTags = tagsByStudent.getOrDefault(student.getId(), Collections.emptyList());

            // Filtro por curso
            if (courseId != null) {
                boolean matchesCourse = studentCourses.stream().anyMatch(c -> c.courseId().equals(courseId));
                if (!matchesCourse) {
                    continue;
                }
            }

            // Filtro por etiqueta
            if (tagFilterLower != null) {
                boolean matchesTag = studentTags.stream().anyMatch(t -> t.toLowerCase().equals(tagFilterLower));
                if (!matchesTag) {
                    continue;
                }
            }

            // Filtro por texto (nombre, usuario, github)
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
                studentCourses,
                studentTags
            ));
        }

        return result;
    }

    @Transactional
    public void assignCourse(UUID studentId, UUID courseId, UUID groupId, User teacher) {
        User student = userRepository.findById(studentId)
            .orElseThrow(() -> new ResourceNotFoundException("Alumno no encontrado: " + studentId));

        if (student.getRole() != Role.STUDENT) {
            throw new ValidationException("El usuario seleccionado no tiene rol de alumno");
        }

        Course course = courseRepository.findById(courseId)
            .orElseThrow(() -> new ResourceNotFoundException("Curso no encontrado: " + courseId));

        Group group = null;
        if (groupId != null) {
            group = groupRepository.findById(groupId)
                .orElseThrow(() -> new ResourceNotFoundException("Grupo no encontrado: " + groupId));
            if (!group.getCourse().getId().equals(courseId)) {
                throw new ValidationException("El grupo no pertenece al curso especificado");
            }
        }

        Optional<CourseMembership> existing = membershipRepository.findByUserIdAndCourseId(studentId, courseId);
        if (existing.isPresent()) {
            CourseMembership m = existing.get();
            m.setGroup(group);
            membershipRepository.save(m);
        } else {
            CourseMembership membership = new CourseMembership(student, course, group, "STUDENT");
            membershipRepository.save(membership);
        }
    }

    @Transactional
    public void unassignCourse(UUID studentId, UUID courseId, User teacher) {
        CourseMembership membership = membershipRepository.findByUserIdAndCourseId(studentId, courseId)
            .orElseThrow(() -> new ResourceNotFoundException("El alumno no está matriculado en este curso"));

        membershipRepository.delete(membership);
    }

    @Transactional
    public void addTag(UUID studentId, String tag, User teacher) {
        if (tag == null || tag.trim().isBlank()) {
            throw new ValidationException("La etiqueta no puede estar vacía");
        }

        String cleanTag = tag.trim();

        User student = userRepository.findById(studentId)
            .orElseThrow(() -> new ResourceNotFoundException("Alumno no encontrado: " + studentId));

        if (!studentTagRepository.existsByStudentIdAndTag(studentId, cleanTag)) {
            StudentTag studentTag = new StudentTag(student, cleanTag);
            studentTagRepository.save(studentTag);
        }
    }

    @Transactional
    public void removeTag(UUID studentId, String tag, User teacher) {
        if (tag == null || tag.trim().isBlank()) {
            return;
        }
        studentTagRepository.deleteByStudentIdAndTag(studentId, tag.trim());
    }

    @Transactional(readOnly = true)
    public List<String> listAllTags() {
        return studentTagRepository.findAllDistinctTags();
    }
}

