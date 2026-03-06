package com.voicecommunicator.user.exception;

import lombok.Getter;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.CONFLICT)
@Getter
public class UserAlreadyExistsException extends RuntimeException {
    private final String field;

    public UserAlreadyExistsException(String message, String field) {
        super(message);
        this.field = field;
    }
}