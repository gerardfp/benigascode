package com.benigascode.export.api;

import com.benigascode.export.service.CsvExportService;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/teacher/export")
@PreAuthorize("hasAnyRole('TEACHER', 'ADMIN')")
public class ExportController {

    private final CsvExportService csvExportService;

    public ExportController(CsvExportService csvExportService) {
        this.csvExportService = csvExportService;
    }

    @GetMapping("/courses/{courseId}/submissions.csv")
    public ResponseEntity<String> exportSubmissions(@PathVariable UUID courseId) {
        String csv = csvExportService.exportSubmissionsCsv(courseId);

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"submissions_course_" + courseId + ".csv\"")
                .contentType(MediaType.parseMediaType("text/csv"))
                .body(csv);
    }
}

