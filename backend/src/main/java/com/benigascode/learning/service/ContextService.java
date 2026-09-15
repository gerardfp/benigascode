package com.benigascode.learning.service;

import com.benigascode.identity.domain.Role;
import com.benigascode.identity.domain.User;
import com.benigascode.identity.repository.UserRepository;
import com.benigascode.learning.domain.StudentTag;
import com.benigascode.learning.domain.TeachingSpace;
import com.benigascode.learning.repository.StudentTagRepository;
import com.benigascode.learning.repository.TeachingSpaceRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class ContextService {

    private final StudentTagRepository studentTagRepository;
    private final TeachingSpaceRepository teachingSpaceRepository;
    private final UserRepository userRepository;

    public ContextService(StudentTagRepository studentTagRepository,
                          TeachingSpaceRepository teachingSpaceRepository,
                          UserRepository userRepository) {
        this.studentTagRepository = studentTagRepository;
        this.teachingSpaceRepository = teachingSpaceRepository;
        this.userRepository = userRepository;
    }

    /**
     * Devuelve los alumnos que actualmente poseen TODAS las etiquetas especificadas (conjunción AND).
     * Si la lista de etiquetas está vacía, devuelve una lista vacía para evitar selecciones accidentales no deseadas.
     */
    @Transactional(readOnly = true)
    public List<User> findMatchingStudents(List<UUID> tagIds) {
        if (tagIds == null || tagIds.isEmpty()) {
            return Collections.emptyList();
        }

        Set<UUID> requiredTags = new HashSet<>(tagIds);
        List<User> allStudents = userRepository.findByRoleOrderByFullNameAsc(Role.STUDENT);
        if (allStudents.isEmpty()) {
            return Collections.emptyList();
        }

        List<UUID> studentIds = allStudents.stream().map(User::getId).toList();
        List<StudentTag> activeTags = studentTagRepository.findActiveByStudentIdIn(studentIds);

        Map<UUID, Set<UUID>> tagsByStudent = new HashMap<>();
        for (StudentTag st : activeTags) {
            tagsByStudent.computeIfAbsent(st.getStudent().getId(), k -> new HashSet<>())
                .add(st.getTag().getId());
        }

        return allStudents.stream()
            .filter(student -> {
                Set<UUID> studentTags = tagsByStudent.getOrDefault(student.getId(), Collections.emptySet());
                return studentTags.containsAll(requiredTags);
            })
            .toList();
    }

    /**
     * Devuelve los alumnos que en un momento histórico dado ('asOf') poseían TODAS las etiquetas especificadas.
     */
    @Transactional(readOnly = true)
    public List<User> findMatchingStudentsAsOf(List<UUID> tagIds, Instant asOf) {
        if (tagIds == null || tagIds.isEmpty()) {
            return Collections.emptyList();
        }

        Set<UUID> requiredTags = new HashSet<>(tagIds);
        List<User> allStudents = userRepository.findByRoleOrderByFullNameAsc(Role.STUDENT);
        if (allStudents.isEmpty()) {
            return Collections.emptyList();
        }

        List<UUID> studentIds = allStudents.stream().map(User::getId).toList();
        List<StudentTag> tagsAsOf = studentTagRepository.findByStudentIdInAsOf(studentIds, asOf);

        Map<UUID, Set<UUID>> tagsByStudent = new HashMap<>();
        for (StudentTag st : tagsAsOf) {
            tagsByStudent.computeIfAbsent(st.getStudent().getId(), k -> new HashSet<>())
                .add(st.getTag().getId());
        }

        return allStudents.stream()
            .filter(student -> {
                Set<UUID> studentTags = tagsByStudent.getOrDefault(student.getId(), Collections.emptySet());
                return studentTags.containsAll(requiredTags);
            })
            .toList();
    }

    /**
     * Comprueba si un alumno concreto cumple actualmente el contexto (posee todas las etiquetas requeridas).
     */
    @Transactional(readOnly = true)
    public boolean studentMatchesContext(UUID studentId, List<UUID> tagIds) {
        if (tagIds == null || tagIds.isEmpty()) {
            return false;
        }

        Set<UUID> requiredTags = new HashSet<>(tagIds);
        List<StudentTag> activeTags = studentTagRepository.findActiveByStudentId(studentId);
        Set<UUID> studentTags = activeTags.stream()
            .map(st -> st.getTag().getId())
            .collect(Collectors.toSet());

        return studentTags.containsAll(requiredTags);
    }

    /**
     * Comprueba si un alumno concreto cumplía el contexto en un momento histórico dado ('asOf').
     */
    @Transactional(readOnly = true)
    public boolean studentMatchesContextAsOf(UUID studentId, List<UUID> tagIds, Instant asOf) {
        if (tagIds == null || tagIds.isEmpty()) {
            return false;
        }

        Set<UUID> requiredTags = new HashSet<>(tagIds);
        List<StudentTag> tagsAsOf = studentTagRepository.findByStudentIdAsOf(studentId, asOf);
        Set<UUID> studentTags = tagsAsOf.stream()
            .map(st -> st.getTag().getId())
            .collect(Collectors.toSet());

        return studentTags.containsAll(requiredTags);
    }

    /**
     * Devuelve los espacios docentes a los que un alumno pertenece actualmente por cumplir sus contextos.
     */
    @Transactional(readOnly = true)
    public List<TeachingSpace> findSpacesForStudent(User student) {
        List<TeachingSpace> allSpaces = teachingSpaceRepository.findAllByOrderByNameAsc();
        List<StudentTag> activeTags = studentTagRepository.findActiveByStudentId(student.getId());
        Set<UUID> studentTagIds = activeTags.stream()
            .map(st -> st.getTag().getId())
            .collect(Collectors.toSet());

        return allSpaces.stream()
            .filter(space -> {
                List<UUID> req = space.getRequiredTagIds();
                return !req.isEmpty() && studentTagIds.containsAll(req);
            })
            .toList();
    }

    /**
     * Devuelve los espacios docentes a los que un alumno pertenecía en una fecha histórica 'asOf'.
     */
    @Transactional(readOnly = true)
    public List<TeachingSpace> findSpacesForStudentAsOf(User student, Instant asOf) {
        List<TeachingSpace> allSpaces = teachingSpaceRepository.findAllByOrderByNameAsc();
        List<StudentTag> tagsAsOf = studentTagRepository.findByStudentIdAsOf(student.getId(), asOf);
        Set<UUID> studentTagIds = tagsAsOf.stream()
            .map(st -> st.getTag().getId())
            .collect(Collectors.toSet());

        return allSpaces.stream()
            .filter(space -> {
                List<UUID> req = space.getRequiredTagIds();
                return !req.isEmpty() && studentTagIds.containsAll(req);
            })
            .toList();
    }

    /**
     * Conteo rápido de alumnos que coinciden con el contexto para el Context Builder.
     */
    @Transactional(readOnly = true)
    public int countMatchingStudents(List<UUID> tagIds) {
        return findMatchingStudents(tagIds).size();
    }

    @Transactional(readOnly = true)
    public List<User> resolveStudentsForSpace(TeachingSpace space) {
        return findMatchingStudents(space.getRequiredTagIds());
    }

    @Transactional(readOnly = true)
    public List<User> resolveStudentsForSpaceAsOf(TeachingSpace space, Instant asOf) {
        return findMatchingStudentsAsOf(space.getRequiredTagIds(), asOf);
    }

    @Transactional(readOnly = true)
    public boolean studentMatchesSpace(UUID studentId, TeachingSpace space) {
        return studentMatchesContext(studentId, space.getRequiredTagIds());
    }

    @Transactional(readOnly = true)
    public boolean studentMatchesSpace(UUID studentId, TeachingSpace space, Instant asOf) {
        return studentMatchesContextAsOf(studentId, space.getRequiredTagIds(), asOf);
    }
}

