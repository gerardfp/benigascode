package com.benigascode.identity.api;

import com.benigascode.identity.domain.User;
import com.benigascode.identity.dto.CreateInvitationRequest;
import com.benigascode.identity.dto.InvitationCodeDTO;
import com.benigascode.identity.service.TeacherInvitationService;
import com.benigascode.identity.service.UserService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/teacher/invitations")
@PreAuthorize("hasAnyRole('TEACHER', 'ADMIN')")
public class TeacherInvitationController {

    private final TeacherInvitationService invitationService;
    private final UserService userService;

    public TeacherInvitationController(TeacherInvitationService invitationService, UserService userService) {
        this.invitationService = invitationService;
        this.userService = userService;
    }

    @GetMapping
    public ResponseEntity<List<InvitationCodeDTO>> listInvitations() {
        return ResponseEntity.ok(invitationService.listInvitations());
    }

    @PostMapping
    public ResponseEntity<InvitationCodeDTO> createInvitation(@Valid @RequestBody CreateInvitationRequest request) {
        User teacher = userService.getCurrentUser();
        InvitationCodeDTO created = invitationService.createInvitation(request, teacher);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PutMapping("/{id}/toggle")
    public ResponseEntity<InvitationCodeDTO> toggleInvitation(@PathVariable UUID id) {
        User teacher = userService.getCurrentUser();
        return ResponseEntity.ok(invitationService.toggleInvitation(id, teacher));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteInvitation(@PathVariable UUID id) {
        User teacher = userService.getCurrentUser();
        invitationService.deleteInvitation(id, teacher);
        return ResponseEntity.noContent().build();
    }
}

