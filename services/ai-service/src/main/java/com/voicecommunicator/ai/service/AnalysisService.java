package com.voicecommunicator.ai.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import com.fasterxml.jackson.databind.JsonNode;

import java.util.HashMap;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class AnalysisService {

    private final RabbitTemplate rabbitTemplate;
    private final ObjectMapper objectMapper;

    @Value("${AI_API_KEY}")
    private String aiApiKey;

    @Value("${AI_URL}")
    private String aiUrl;

    @RabbitListener(queues = "text.analyze")
    public void analyzeMessage(Map<String, Object> payload) {
        String messageId = (String) payload.get("messageId");
        String content = (String) payload.get("content");

        log.info("AI: Analyzing message: {}", content);

        boolean isToxic = callAICheck(content);

        Map<String, Object> result = new HashMap<>();
        result.put("messageId", messageId);
        result.put("isToxic", isToxic);

        rabbitTemplate.convertAndSend("text.result", result);
        log.info("AI: Analysis result sent ({})", isToxic);
    }

    private boolean callAICheck(String text) {
        try {
            RestClient restClient = RestClient.create();

            String response = restClient.post()
                    .uri(aiUrl)
                    .header("Authorization", "Bearer " + aiApiKey)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(Map.of("inputs", text))
                    .retrieve()
                    .body(String.class);

            JsonNode root = objectMapper.readTree(response);
            JsonNode labels = root.get(0);

            if (labels.isArray()) {
                for (JsonNode prediction : labels) {
                    String label = prediction.path("label").asText();
                    double score = prediction.path("score").asDouble();

                    if (label.equals("toxic") && score > 0.7) return true;
                    if (label.equals("severe_toxic") && score > 0.5) return true;
                    if (label.equals("insult") && score > 0.7) return true;
                    if (label.equals("threat") && score > 0.6) return true;
                    if (label.equals("identity_hate") && score > 0.6) return true;
                }
            }

            return false;

        } catch (Exception e) {
            log.error("HF error: {}", e.getMessage());
            return false;
        }
    }
}
