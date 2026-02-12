package com.voicecommunicator.chat.controller;

import com.voicecommunicator.common.dto.NetworkMetricDTO;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.stereotype.Controller;

import java.security.Principal;

@Controller
@Slf4j
@RequiredArgsConstructor
public class AnalyticsPassThroughController {

    private final RabbitTemplate rabbitTemplate;

    @MessageMapping("/analytics")
    public void forwardMetrics(@Payload NetworkMetricDTO metric, Principal principal) {
        if (principal != null) {
            metric.setUserId(principal.getName());
        }

        rabbitTemplate.convertAndSend("internal.exchange", "network.metrics", metric);
    }
}
