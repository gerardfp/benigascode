package com.codelab.learning.service;

import com.codelab.common.exception.AccessDeniedException;
import com.codelab.common.exception.ResourceNotFoundException;
import com.codelab.common.exception.ValidationException;
import com.codelab.identity.domain.Role;
import com.codelab.identity.domain.User;
import com.codelab.identity.repository.UserRepository;
import com.codelab.learning.domain.Course;
import com.codelab.learning.domain.CourseMembership;
import com.codelab.learning.domain.Group;
import com.codelab.learning.dto.CourseDTO;
import com.codelab.learning.dto.CreateCourseRequest;
import com.codelab.learning.dto.CreateGroupRequest;
import com.codelab.learning.dto.GroupDTO;
import com.codelab.learning.repository.CourseMembershipRepository;
import com.codelab.learning.repository.CourseRepository;
import com.codelab.learning.repository.GroupRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
public class LearningService {

    private final CourseRepository courseRepository;
    private final GroupRepository groupRepository;
    private final CourseMembershipRepository membershipRepository;
    private final UserRepository userRepository;

    public LearningService(CourseRepository courseRepository,
                           GroupRepository groupRepository,
                           CourseMembershipRepository membershipRepository,
                           UserRepository userRepository) {
        this.courseRepository = courseRepository;
        this.groupRepository = groupRepository;
        this.membershipRepository = membershipRepository;
        this.userRepository = userRepository;
    }

    @Transactional
    public CourseDTO createCourse(CreateCourseRequest request, User teacher) {
        if (courseRepository.findByCode(request.code()).isPresent()) {
            throw new ValidationException("Ya existe un curso con el código: " + request.code());
        }
        Course course = new Course(request.name(), request.code(), request.academicYear(), request.description());
        course = courseRepository.save(course);

        // Asociar automáticamente al profesor como TEACHER
        CourseMembership membership = new CourseMembership(teacher, course, null, "TEACHER");
        membershipRepository.save(membership);

        return CourseDTO.fromEntity(course);
    }

    @Transactional(readOnly = true)
    public List<CourseDTO> getCoursesForUser(User user) {
        if (user.getRole() == Role.ADMIN) {
            return courseRepository.findAll().stream().map(CourseDTO::fromEntity).toList();
        }
        return courseRepository.findCoursesByUserId(user.getId()).stream()
                .map(CourseDTO::fromEntity)
                .toList();
    }

    @Transactional(readOnly = true)
    public CourseDTO getCourseById(UUID courseId, User user) {
        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new ResourceNotFoundException("Curso no encontrado"));

        if (user.getRole() != Role.ADMIN && !membershipRepository.existsByUserIdAndCourseId(user.getId(), courseId)) {
            throw new AccessDeniedException("No tienes acceso a este curso");
        }
        return CourseDTO.fromEntity(course);
    }

    @Transactional
    public GroupDTO createGroup(UUID courseId, CreateGroupRequest request, User user) {
        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new ResourceNotFoundException("Curso no encontrado"));

        assertTeacherOrAdmin(user, courseId);

        Group group = new Group(course, request.name());
        group = groupRepository.save(group);
        return GroupDTO.fromEntity(group);
    }

    @Transactional(readOnly = true)
    public List<GroupDTO> getGroupsForCourse(UUID courseId, User user) {
        if (user.getRole() != Role.ADMIN && !membershipRepository.existsByUserIdAndCourseId(user.getId(), courseId)) {
            throw new AccessDeniedException("No tienes acceso a los grupos de este curso");
        }
        return groupRepository.findByCourseId(courseId).stream()
                .map(GroupDTO::fromEntity)
                .toList();
    }

    @Transactional
    public void enrollStudent(UUID courseId, UUID studentId, UUID groupId, User teacher) {
        assertTeacherOrAdmin(teacher, courseId);

        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new ResourceNotFoundException("Curso no encontrado"));
        User student = userRepository.findById(studentId)
                .orElseThrow(() -> new ResourceNotFoundException("Alumno no encontrado"));

        Group group = null;
        if (groupId != null) {
            group = groupRepository.findById(groupId)
                    .orElseThrow(() -> new ResourceNotFoundException("Grupo no encontrado"));
            if (!group.getCourse().getId().equals(courseId)) {
                throw new ValidationException("El grupo no pertenece al curso especificado");
            }
        }

        if (membershipRepository.existsByUserIdAndCourseId(studentId, courseId)) {
            throw new ValidationException("El alumno ya se encuentra matriculado en este curso");
        }

        CourseMembership membership = new CourseMembership(student, course, group, "STUDENT");
        membershipRepository.save(membership);
    }

    public void assertTeacherOrAdmin(User user, UUID courseId) {
        if (user.getRole() == Role.ADMIN) {
            return;
        }
        boolean isTeacher = membershipRepository.existsByUserIdAndCourseIdAndRole(user.getId(), courseId, "TEACHER");
        if (!isTeacher) {
            throw new AccessDeniedException("Operación restringida a profesores asignados al curso");
        }
    }
}

