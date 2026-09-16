package com.benigascode.learning.util;

import java.util.List;
import java.util.regex.Pattern;

public final class TagColorUtil {

    private static final Pattern HEX_COLOR_PATTERN = Pattern.compile("^#[0-9a-fA-F]{6}$");

    public static final List<String> PALETTE = List.of(
        "#c81919", "#90c819", "#19c888", "#1924c8", "#c8199c", "#c87c19", "#2dc819", "#19a8c8",
        "#7019c8", "#c81939", "#b0c819", "#19c865", "#1944c8", "#c819bc", "#c85c19", "#50c819",
        "#19c8c8", "#5019c8", "#c81959", "#c8bc19", "#19c844", "#1965c8", "#b319c8", "#c83919",
        "#70c819", "#19c8a8", "#3019c8", "#c8197c", "#c89c19", "#19c824", "#1985c8", "#9019c8",
        "#9c1c1c", "#739c1c", "#1c9c6d", "#1c249c", "#9c1c7c", "#9c641c", "#2b9c1c", "#1c849c",
        "#5c1c9c", "#9c1c33", "#8b9c1c", "#1c9c53", "#1c3c9c", "#9c1c93", "#9c4d1c", "#449c1c",
        "#1c9c9c", "#441c9c", "#9c1c4b", "#9c931c", "#1c9c3c", "#1c539c", "#8d1c9c", "#9c331c",
        "#5c9c1c", "#1c9c84", "#2d1c9c", "#9c1c64", "#9c7c1c", "#1c9c24", "#1c6b9c", "#731c9c",
        "#e81717", "#a6e817", "#17e89b", "#1725e8", "#e817b4", "#e88d17", "#2fe817", "#17c2e8",
        "#8017e8", "#e8173d", "#cce817", "#17e872", "#174be8", "#e817da", "#e86717", "#59e817",
        "#17e8e8", "#5917e8", "#e81764", "#e8da17", "#17e84b", "#1772e8", "#d017e8", "#e83d17",
        "#80e817", "#17e8c2", "#3317e8", "#e8178d", "#e8b417", "#17e825", "#1798e8", "#a617e8",
        "#b11b1b", "#82b11b", "#1bb17a", "#1b25b1", "#b11b8c", "#b1701b", "#2cb11b", "#1b96b1",
        "#661bb1", "#b11b36", "#9db11b", "#1bb15c", "#1b40b1", "#b11ba7", "#b1541b", "#4ab11b",
        "#1bb1b1", "#4a1bb1", "#b11b52", "#b1a71b", "#1bb140", "#1b5cb1", "#a01bb1", "#b1361b",
        "#66b11b", "#1bb196", "#2f1bb1", "#b11b70", "#b18c1b", "#1bb125", "#1b78b1", "#821bb1"
    );

    private TagColorUtil() {
    }

    public static String getDeterministicColor(String category, String value) {
        String key = (category != null ? category.trim().toLowerCase() : "") + ":" + (value != null ? value.trim() : "");
        int hash = key.hashCode();
        int index = Math.floorMod(hash, PALETTE.size());
        return PALETTE.get(index);
    }

    public static boolean isValidHexColor(String color) {
        return color != null && HEX_COLOR_PATTERN.matcher(color.trim()).matches();
    }

    public static String sanitizeColor(String color, String category, String value) {
        if (color != null) {
            String trimmed = color.trim().toLowerCase();
            if (HEX_COLOR_PATTERN.matcher(trimmed).matches()) {
                return trimmed;
            }
        }
        return getDeterministicColor(category, value);
    }
}

