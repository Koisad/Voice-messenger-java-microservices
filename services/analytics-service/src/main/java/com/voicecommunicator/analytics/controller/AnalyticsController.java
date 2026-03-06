package com.voicecommunicator.analytics.controller;

import com.voicecommunicator.analytics.model.NetworkMetric;
import com.voicecommunicator.analytics.service.AnalyticsService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/analytics")
@RequiredArgsConstructor
public class AnalyticsController {
    private final AnalyticsService analyticsService;

    @GetMapping("/server")
    public ResponseEntity<List<NetworkMetric>> getServerMetrics(@RequestParam String id) {
        return ResponseEntity.ok(analyticsService.getMetricsForServer(id));
    }

    @GetMapping("/room/{roomId}")
    public ResponseEntity<List<NetworkMetric>> getRoomMetrics(@PathVariable String roomId) {
        return ResponseEntity.ok(analyticsService.getMetricsForRoom(roomId));
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<List<NetworkMetric>> getUserMetrics(@PathVariable String userId) {
        return ResponseEntity.ok(analyticsService.getMetricsForUser(userId));
    }
}
