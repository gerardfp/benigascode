package com.benigascode.learning.service;

import com.benigascode.common.exception.AccessDeniedException;
import com.benigascode.common.exception.ResourceNotFoundException;
import com.benigascode.common.exception.ValidationException;
import com.benigascode.identity.domain.Role;
import com.benigascode.identity.domain.User;
import com.benigascode.identity.repository.UserRepository;
import com.benigascode.learning.domain.Course;
import com.benigascode.learning.domain.CourseMembership;
import com.benigascode.learning.domain.Group;
import com.benigascode.learning.dto.CourseDTO;
import com.benigascode.learning.dto.CreateCourseRequest;
import com.benigascode.learning.dto.CreateGroupRequest;
import com.benigascode.learning.dto.GroupDTO;
import com.benigascode.learning.repository.CourseMembershipRepository;
import com.benigascode.learning.repository.CourseRepository;
import com.benigascode.learning.repository.GroupRepository;
import com.benigascode.content.domain.Collection;
import com.benigascode.content.domain.CollectionVersion;
import com.benigascode.content.dto.CollectionDTO;
import com.benigascode.content.repository.CollectionRepository;
import com.benigascode.content.repository.CollectionVersionRepository;
import com.benigascode.learning.domain.CourseCollection;
import com.benigascode.learning.repository.CourseCollectionRepository;
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
    private final CourseCollectionRepository courseCollectionRepository;
    private final CollectionRepository collectionRepository;
    private final CollectionVersionRepository collectionVersionRepository;

    public LearningService(CourseRepository courseRepository,
                           GroupRepository groupRepository,
                           CourseMembershipRepository membershipRepository,
                           UserRepository userRepository,
                           CourseCollectionRepository courseCollectionRepository,
                           CollectionRepository collectionRepository,
                           CollectionVersionRepository collectionVersionRepository) {
        this.courseRepository = courseRepository;
        this.groupRepository = groupRepository;
        this.membershipRepository = membershipRepository;
        this.userRepository = userRepository;
        this.courseCollectionRepository = courseCollectionRepository;
        this.collectionRepository = collectionRepository;
        this.collectionVersionRepository = collectionVersionRepository;
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
        if (user.getRole() == Role.ADMIN || user.getRole() == Role.TEACHER) {
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

        if (user.getRole() != Role.ADMIN && user.getRole() != Role.TEACHER && !membershipRepository.existsByUserIdAndCourseId(user.getId(), courseId)) {
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
        if (user.getRole() != Role.ADMIN && user.getRole() != Role.TEACHER && !membershipRepository.existsByUserIdAndCourseId(user.getId(), courseId)) {
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

    @Transactional(readOnly = true)
    public List<CollectionDTO> getCollectionsForCourse(UUID courseId) {
        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new ResourceNotFoundException("Curso no encontrado"));

        List<CourseCollection> list = courseCollectionRepository.findByCourseId(courseId);
        return list.stream()
                .map(cc -> {
                    Collection c = cc.getCollection();
                    CollectionVersion v = collectionVersionRepository.findLatestByCollectionId(c.getId()).orElse(null);
                    return CollectionDTO.from(c, v);
                })
                .toList();
    }

    @Transactional
    public void assignCollectionToCourse(UUID courseId, UUID collectionId) {
        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new ResourceNotFoundException("Curso no encontrado"));
        Collection collection = collectionRepository.findById(collectionId)
                .orElseThrow(() -> new ResourceNotFoundException("Colección no encontrada"));

        if (!courseCollectionRepository.existsByCourseIdAndCollectionId(courseId, collectionId)) {
            CourseCollection cc = new CourseCollection(course, collection);
            courseCollectionRepository.save(cc);
        }
    }

    @Transactional
    public void removeCollectionFromCourse(UUID courseId, UUID collectionId) {
        courseCollectionRepository.deleteByCourseIdAndCollectionId(courseId, collectionId);
    }

    public void assertTeacherOrAdmin(User user, UUID courseId) {
        if (user.getRole() == Role.ADMIN || user.getRole() == Role.TEACHER) {
            return;
        }
        throw new AccessDeniedException("Operación restringida al profesorado");
    }
}

