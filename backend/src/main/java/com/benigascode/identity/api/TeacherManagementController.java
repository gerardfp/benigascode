package com.benigascode.identity.api;

import com.benigascode.identity.domain.User;
import com.benigascode.identity.dto.AddAuthorizedTeacherRequest;
import com.benigascode.identity.dto.AuthorizedTeacherDTO;
import com.benigascode.identity.dto.BulkAddTeacherResponse;
import com.benigascode.identity.service.AuthorizedTeacherService;
import com.benigascode.identity.service.UserService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/teacher/teachers")
@PreAuthorize("hasAnyRole('TEACHER', 'ADMIN')")
public class TeacherManagementController {

    private final AuthorizedTeacherService authorizedTeacherService;
    private final UserService userService;

    public TeacherManagementController(AuthorizedTeacherService authorizedTeacherService, UserService userService) {
        this.authorizedTeacherService = authorizedTeacherService;
        this.userService = userService;
    }

    @GetMapping
    public ResponseEntity<List<AuthorizedTeacherDTO>> listTeachers() {
        return ResponseEntity.ok(authorizedTeacherService.listTeachers());
    }

    @PostMapping
    public ResponseEntity<AuthorizedTeacherDTO> addTeacher(@Valid @RequestBody AddAuthorizedTeacherRequest request) {
        User teacher = userService.getCurrentUser();
        AuthorizedTeacherDTO created = authorizedTeacherService.addAuthorizedTeacher(request, teacher);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PostMapping("/bulk")
    public ResponseEntity<BulkAddTeacherResponse> addTeachersBulk(@RequestBody List<AddAuthorizedTeacherRequest> requests) {
        User teacher = userService.getCurrentUser();
        return ResponseEntity.ok(authorizedTeacherService.addAuthorizedTeachersBulk(requests, teacher));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> removeTeacher(@PathVariable UUID id) {
        User teacher = userService.getCurrentUser();
        authorizedTeacherService.removeAuthorizedTeacher(id, teacher);
        return ResponseEntity.noContent().build();
    }
}
