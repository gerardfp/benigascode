package com.benigascode.activities.api;

import com.benigascode.activities.dto.ActivityDTO;
import com.benigascode.activities.service.ActivityService;
import com.benigascode.identity.domain.User;
import com.benigascode.identity.service.UserService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1")
public class StudentActivityController {

    private final ActivityService activityService;
    private final UserService userService;

    public StudentActivityController(ActivityService activityService, UserService userService) {
        this.activityService = activityService;
        this.userService = userService;
    }

    @GetMapping("/me/activities")
    public ResponseEntity<List<ActivityDTO>> listMyActivities() {
        User user = userService.getCurrentUser();
        return ResponseEntity.ok(activityService.getActivitiesForUser(user));
    }

    @GetMapping("/activities/{id}")
    public ResponseEntity<ActivityDTO> getActivity(@PathVariable UUID id) {
        User user = userService.getCurrentUser();
        return ResponseEntity.ok(activityService.getActivityById(id, user));
    }
}

