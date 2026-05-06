package com.tpa.utils;

import java.util.UUID;

public final class IdGeneratorUtils {

    private IdGeneratorUtils() {
    }

    public static UUID generateUuid() {
        return UUID.randomUUID();
    }

    public static String generateUuidString() {
        return generateUuid().toString();
    }
}
