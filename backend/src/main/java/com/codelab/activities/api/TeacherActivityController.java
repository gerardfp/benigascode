package com.codelab.activities.api;

import com.codelab.activities.dto.ActivityDTO;
import com.codelab.activities.dto.CreateActivityRequest;
import com.codelab.activities.service.ActivityService;
import com.codelab.identity.domain.User;
import com.codelab.identity.service.UserService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/teacher/activities")
@PreAuthorize("hasAnyRole('TEACHER', 'ADMIN')")
public class TeacherActivityController {

    private final ActivityService activityService;
    private final UserService userService;

    public TeacherActivityController(ActivityService activityService, UserService userService) {
        this.activityService = activityService;
        this.userService = userService;
    }

    @GetMapping
    public ResponseEntity<List<ActivityDTO>> listActivities() {
        User user = userService.getCurrentUser();
        return ResponseEntity.ok(activityService.getActivitiesForUser(user));
    }

    @PostMapping
    public ResponseEntity<ActivityDTO> createActivity(@Valid @RequestBody CreateActivityRequest request) {
        User user = userService.getCurrentUser();
        ActivityDTO activity = activityService.createActivity(request, user);
        return ResponseEntity.status(HttpStatus.CREATED).body(activity);
    }

    @PutMapping("/{id}")
    public ResponseEntity<ActivityDTO> updateActivity(@PathVariable UUID id, @Valid @RequestBody CreateActivityRequest request) {
        User user = userService.getCurrentUser();
        ActivityDTO activity = activityService.updateActivity(id, request, user);
        return ResponseEntity.ok(activity);
    }
}

