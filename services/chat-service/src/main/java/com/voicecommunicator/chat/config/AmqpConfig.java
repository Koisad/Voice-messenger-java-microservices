package com.voicecommunicator.chat.config;

import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.amqp.support.converter.MessageConverter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.amqp.core.Queue;

@Configuration
public class AmqpConfig {
    @Bean
    public Queue analyzeQueue() {
        return new Queue("text.analyze", true);
    }

    @Bean
    public Queue resultQueue() {
        return new Queue("text.result", true);
    }

    @Bean
    public MessageConverter jsonMessageConverter() {
        return new Jackson2JsonMessageConverter();
    }
}
