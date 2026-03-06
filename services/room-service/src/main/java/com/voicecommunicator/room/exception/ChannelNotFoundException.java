package com.voicecommunicator.room.exception;

public class ChannelNotFoundException extends RuntimeException {
    public ChannelNotFoundException(String message) {
        super(message);
    }
}
