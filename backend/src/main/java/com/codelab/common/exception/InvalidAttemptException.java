package com.codelab.common.exception;

public class InvalidAttemptException extends RuntimeException {
    public InvalidAttemptException(String message) {
        super(message);
    }
}

