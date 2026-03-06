package com.voicecommunicator.room.config;

import org.springframework.amqp.core.Binding;
import org.springframework.amqp.core.BindingBuilder;
import org.springframework.amqp.core.Queue;
import org.springframework.amqp.core.TopicExchange;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.amqp.support.converter.MessageConverter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class AmqpConfig {

    @Bean
    public TopicExchange internalExchange() {
        return new TopicExchange("internal.exchange");
    }

    @Bean
    public Queue userSyncQueue() {
        return new Queue("room.user-sync", true);
    }

    @Bean
    public Binding userSyncBinding(Queue userSyncQueue, TopicExchange internalExchange) {
        return BindingBuilder.bind(userSyncQueue).to(internalExchange).with("user.updated");
    }

    @Bean
    public MessageConverter jsonMessageConverter() {
        return new Jackson2JsonMessageConverter();
    }
}