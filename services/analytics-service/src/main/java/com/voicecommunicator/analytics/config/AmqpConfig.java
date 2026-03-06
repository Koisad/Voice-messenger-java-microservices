package com.voicecommunicator.analytics.config;

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
    public Queue metricsQueue() {
        return new Queue("analytics.qos", true);
    }

    @Bean
    public Binding metricsBinding(Queue metricsQueue, TopicExchange internalExchange) {
        return BindingBuilder
                .bind(metricsQueue)
                .to(internalExchange)
                .with("network.metrics");
    }

    @Bean
    public MessageConverter jsonMessageConverter() {
        return new Jackson2JsonMessageConverter();
    }
}
