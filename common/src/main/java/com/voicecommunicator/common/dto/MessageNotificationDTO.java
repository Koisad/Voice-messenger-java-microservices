package com.voicecommunicator.common.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class MessageNotificationDTO {
    private NotificationType type;
    private Object payload;

    public enum NotificationType {
        DM_NOTIFICATION,
        CHANNEL_MESSAGE_NOTIFICATION
    }
}