package com.voicecommunicator.user.config;

import io.minio.MinioClient;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class MinioConfig {
    @Value("${MINIO_URL}") private String minioUrl;
    @Value("${MINIO_ACCESS_KEY}") private String accessKey;
    @Value("${MINIO_SECRET_KEY}") private String secretKey;

    @Bean
    public MinioClient minioClient() {
        return MinioClient.builder()
                .endpoint(minioUrl)
                .credentials(accessKey, secretKey)
                .build();
    }
}