package com.benigascode.learning.service;

import com.benigascode.common.exception.AccessDeniedException;
import com.benigascode.common.exception.ResourceNotFoundException;
import com.benigascode.common.exception.ValidationException;
import com.benigascode.identity.domain.Role;
import com.benigascode.identity.domain.User;
import com.benigascode.identity.dto.TeacherStudentDTO;
import com.benigascode.identity.dto.UserDTO;
import com.benigascode.identity.repository.UserRepository;
import com.benigascode.identity.service.TeacherStudentService;
import com.benigascode.learning.domain.Course;
import com.benigascode.learning.domain.CourseCollection;
import com.benigascode.learning.domain.CourseCollectionStudent;
import com.benigascode.learning.domain.CourseMembership;
import com.benigascode.learning.domain.Group;
import com.benigascode.learning.dto.*;
import com.benigascode.learning.repository.CourseCollectionRepository;
import com.benigascode.learning.repository.CourseCollectionStudentRepository;
import com.benigascode.learning.repository.CourseMembershipRepository;
import com.benigascode.learning.repository.CourseRepository;
import com.benigascode.learning.repository.GroupRepository;
import com.benigascode.content.domain.Collection;
import com.benigascode.content.domain.CollectionVersion;
import com.benigascode.content.dto.CollectionDTO;
import com.benigascode.content.repository.CollectionRepository;
import com.benigascode.content.repository.CollectionVersionRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class LearningService {

    private final CourseRepository courseRepository;
    private final GroupRepository groupRepository;
    private final CourseMembershipRepository membershipRepository;
    private final UserRepository userRepository;
    private final CourseCollectionRepository courseCollectionRepository;
    private final CourseCollectionStudentRepository courseCollectionStudentRepository;
    private final CollectionRepository collectionRepository;
    private final CollectionVersionRepository collectionVersionRepository;
    private final TeacherStudentService teacherStudentService;

    public LearningService(CourseRepository courseRepository,
                           GroupRepository groupRepository,
                           CourseMembershipRepository membershipRepository,
                           UserRepository userRepository,
                           CourseCollectionRepository courseCollectionRepository,
                           CourseCollectionStudentRepository courseCollectionStudentRepository,
                           CollectionRepository collectionRepository,
                           CollectionVersionRepository collectionVersionRepository,
                           TeacherStudentService teacherStudentService) {
        this.courseRepository = courseRepository;
        this.groupRepository = groupRepository;
        this.membershipRepository = membershipRepository;
        this.userRepository = userRepository;
        this.courseCollectionRepository = courseCollectionRepository;
        this.courseCollectionStudentRepository = courseCollectionStudentRepository;
        this.collectionRepository = collectionRepository;
        this.collectionVersionRepository = collectionVersionRepository;
        this.teacherStudentService = teacherStudentService;
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

    // --- GESTIÓN DE PROFESORES DEL CURSO ---

    @Transactional(readOnly = true)
    public List<UserDTO> getTeachersForCourse(UUID courseId) {
        return membershipRepository.findByCourseId(courseId).stream()
                .filter(m -> "TEACHER".equalsIgnoreCase(m.getRole()))
                .map(m -> UserDTO.fromEntity(m.getUser()))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<UserDTO> getAvailableTeachersForCourse(UUID courseId) {
        Set<UUID> currentTeacherIds = membershipRepository.findByCourseId(courseId).stream()
                .filter(m -> "TEACHER".equalsIgnoreCase(m.getRole()))
                .map(m -> m.getUser().getId())
                .collect(Collectors.toSet());

        List<User> allTeachers = userRepository.findAll().stream()
                .filter(u -> u.getRole() == Role.TEACHER || u.getRole() == Role.ADMIN)
                .filter(u -> !currentTeacherIds.contains(u.getId()))
                .toList();

        return allTeachers.stream().map(UserDTO::fromEntity).toList();
    }

    @Transactional
    public void addTeacherToCourse(UUID courseId, UUID teacherId, User currentUser) {
        assertTeacherOrAdmin(currentUser, courseId);

        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new ResourceNotFoundException("Curso no encontrado"));
        User teacher = userRepository.findById(teacherId)
                .orElseThrow(() -> new ResourceNotFoundException("Profesor no encontrado"));

        if (teacher.getRole() != Role.TEACHER && teacher.getRole() != Role.ADMIN) {
            throw new ValidationException("El usuario seleccionado no tiene rol de profesor");
        }

        if (membershipRepository.existsByUserIdAndCourseId(teacherId, courseId)) {
            throw new ValidationException("El profesor ya pertenece a este curso");
        }

        CourseMembership membership = new CourseMembership(teacher, course, null, "TEACHER");
        membershipRepository.save(membership);
    }

    @Transactional
    public void removeTeacherFromCourse(UUID courseId, UUID teacherId, User currentUser) {
        assertTeacherOrAdmin(currentUser, courseId);

        long teacherCount = membershipRepository.findByCourseId(courseId).stream()
                .filter(m -> "TEACHER".equalsIgnoreCase(m.getRole()))
                .count();

        if (teacherCount <= 1) {
            throw new ValidationException("No se puede eliminar el único profesor asignado al curso");
        }

        CourseMembership membership = membershipRepository.findByUserIdAndCourseIdAndRole(teacherId, courseId, "TEACHER")
                .orElseThrow(() -> new ResourceNotFoundException("El profesor no está asignado a este curso"));

        membershipRepository.delete(membership);
    }

    // --- GESTIÓN DE ALUMNOS DEL CURSO ---

    @Transactional(readOnly = true)
    public List<TeacherStudentDTO> getStudentsForCourse(UUID courseId) {
        return teacherStudentService.listStudents(courseId, null, null);
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

    @Transactional
    public void unenrollStudent(UUID courseId, UUID studentId, User teacher) {
        assertTeacherOrAdmin(teacher, courseId);

        CourseMembership membership = membershipRepository.findByUserIdAndCourseIdAndRole(studentId, courseId, "STUDENT")
                .orElseThrow(() -> new ResourceNotFoundException("El alumno no está matriculado en este curso"));

        // Limpiar asignaciones individuales de colecciones de este curso
        courseCollectionStudentRepository.deleteByCourseIdAndStudentId(courseId, studentId);

        membershipRepository.delete(membership);
    }

    // --- GESTIÓN DE GRUPOS ---

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

    // --- GESTIÓN DE COLECCIONES EN EL CURSO ---

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

    @Transactional(readOnly = true)
    public List<CourseCollectionDTO> getCourseCollectionsWithDetails(UUID courseId) {
        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new ResourceNotFoundException("Curso no encontrado"));

        List<CourseMembership> courseStudents = membershipRepository.findByCourseId(courseId).stream()
                .filter(m -> "STUDENT".equalsIgnoreCase(m.getRole()))
                .toList();
        int totalStudents = courseStudents.size();
        List<UUID> allStudentIds = courseStudents.stream().map(m -> m.getUser().getId()).toList();

        List<CourseCollection> list = courseCollectionRepository.findByCourseId(courseId);

        return list.stream().map(cc -> {
            Collection c = cc.getCollection();
            CollectionVersion v = collectionVersionRepository.findLatestByCollectionId(c.getId()).orElse(null);

            boolean assignedAll = cc.isAssignedAllStudents();
            List<UUID> assignedStudentIds;
            if (assignedAll) {
                assignedStudentIds = allStudentIds;
            } else {
                assignedStudentIds = courseCollectionStudentRepository.findByCourseCollectionId(cc.getId()).stream()
                        .map(ccs -> ccs.getStudent().getId())
                        .toList();
            }

            return new CourseCollectionDTO(
                    cc.getId(),
                    course.getId(),
                    c.getId(),
                    c.getSlug(),
                    v != null ? v.getTitle() : c.getSlug(),
                    v != null ? v.getDescription() : "",
                    c.getVisibility(),
                    assignedAll,
                    assignedStudentIds,
                    assignedStudentIds.size(),
                    totalStudents
            );
        }).toList();
    }

    @Transactional
    public void assignCollectionToCourse(UUID courseId, UUID collectionId, AssignCourseCollectionRequest request) {
        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new ResourceNotFoundException("Curso no encontrado"));
        Collection collection = collectionRepository.findById(collectionId)
                .orElseThrow(() -> new ResourceNotFoundException("Colección no encontrada"));

        boolean assignedAll = request == null || request.assignedAllStudents() == null || request.assignedAllStudents();

        CourseCollection cc = courseCollectionRepository.findByCourseIdAndCollectionId(courseId, collectionId)
                .orElseGet(() -> new CourseCollection(course, collection, assignedAll));

        cc.setAssignedAllStudents(assignedAll);
        cc = courseCollectionRepository.save(cc);

        // Limpiar asignaciones previas de esta colección
        courseCollectionStudentRepository.deleteByCourseCollectionId(cc.getId());

        if (!assignedAll && request != null && request.studentIds() != null) {
            for (UUID studentId : request.studentIds()) {
                if (membershipRepository.existsByUserIdAndCourseIdAndRole(studentId, courseId, "STUDENT")) {
                    User student = userRepository.findById(studentId).orElse(null);
                    if (student != null) {
                        courseCollectionStudentRepository.save(new CourseCollectionStudent(cc, student));
                    }
                }
            }
        }
    }

    @Transactional
    public void updateCollectionAssignment(UUID courseId, UUID collectionId, AssignCourseCollectionRequest request) {
        assignCollectionToCourse(courseId, collectionId, request);
    }

    @Transactional
    public void removeCollectionFromCourse(UUID courseId, UUID collectionId) {
        Optional<CourseCollection> ccOpt = courseCollectionRepository.findByCourseIdAndCollectionId(courseId, collectionId);
        if (ccOpt.isPresent()) {
            courseCollectionStudentRepository.deleteByCourseCollectionId(ccOpt.get().getId());
            courseCollectionRepository.delete(ccOpt.get());
        }
    }

    public void assertTeacherOrAdmin(User user, UUID courseId) {
        if (user.getRole() == Role.ADMIN || user.getRole() == Role.TEACHER) {
            return;
        }
        throw new AccessDeniedException("Operación restringida al profesorado");
    }
}
