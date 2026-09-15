package com.benigascode.learning.api;

import com.benigascode.identity.domain.User;
import com.benigascode.identity.service.UserService;
import com.benigascode.learning.dto.TeachingSpaceDTO;
import com.benigascode.learning.service.TeachingSpaceService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1")
public class StudentTeachingSpaceController {

    private final TeachingSpaceService teachingSpaceService;
    private final UserService userService;

    public StudentTeachingSpaceController(TeachingSpaceService teachingSpaceService, UserService userService) {
        this.teachingSpaceService = teachingSpaceService;
        this.userService = userService;
    }

    @GetMapping({"/student/spaces", "/me/teaching-spaces", "/me/spaces"})
    public ResponseEntity<List<TeachingSpaceDTO>> getMyTeachingSpaces() {
        User student = userService.getCurrentUser();
        return ResponseEntity.ok(teachingSpaceService.getSpacesForUser(student));
    }

    @GetMapping({"/student/spaces/{id}", "/me/teaching-spaces/{id}", "/me/spaces/{id}"})
    public ResponseEntity<TeachingSpaceDTO> getMyTeachingSpace(@PathVariable UUID id) {
        User student = userService.getCurrentUser();
        return ResponseEntity.ok(teachingSpaceService.getSpaceById(id, student));
    }
}

