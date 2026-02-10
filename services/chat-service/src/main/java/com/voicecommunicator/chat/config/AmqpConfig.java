package com.voicecommunicator.chat.config;

import org.springframework.amqp.core.Binding;
import org.springframework.amqp.core.BindingBuilder;
import org.springframework.amqp.core.TopicExchange;
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
    public Queue cleanupQueue() {
        return new Queue("chat.server-cleanup", true);
    }

    @Bean
    public TopicExchange internalExchange() {
        return new TopicExchange("internal.exchange");
    }

    @Bean
    public Binding cleanupBinding(Queue cleanupQueue, TopicExchange internalExchange) {
        return BindingBuilder
                .bind(cleanupQueue)
                .to(internalExchange)
                .with("server.deleted");
    }

    @Bean
    public MessageConverter jsonMessageConverter() {
        return new Jackson2JsonMessageConverter();
    }
}
