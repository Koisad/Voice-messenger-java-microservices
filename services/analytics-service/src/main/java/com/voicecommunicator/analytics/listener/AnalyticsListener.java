package com.voicecommunicator.analytics.listener;

import com.voicecommunicator.analytics.service.AnalyticsService;
import dto.NetworkMetricDTO;
import lombok.RequiredArgsConstructor;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Service;


@Service
@RequiredArgsConstructor
public class AnalyticsListener {

    private final AnalyticsService analyticsService;

    @RabbitListener(queues = "analytics.qos")
    public void handleMetrics(NetworkMetricDTO dto) {
        analyticsService.processMetric(dto);
    }
}
