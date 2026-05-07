package com.tpa.exception;

public class FileStorageException extends BusinessException {

    public FileStorageException(String message) {
        super("FILE_STORAGE_ERROR", message);
    }

    public FileStorageException(String message, Object details) {
        super("FILE_STORAGE_ERROR", message, details);
    }
}
