package com.benigascode.learning;

import com.benigascode.learning.util.TagColorUtil;
import org.junit.jupiter.api.Test;

import java.util.HashSet;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;

class TagColorUtilTest {

    @Test
    void testPaletteSizeAndUniqueness() {
        assertEquals(128, TagColorUtil.PALETTE.size(), "Palette must contain exactly 128 colors");

        Set<String> uniqueColors = new HashSet<>(TagColorUtil.PALETTE);
        assertEquals(128, uniqueColors.size(), "All 128 colors in palette must be unique");

        for (String hex : TagColorUtil.PALETTE) {
            assertTrue(TagColorUtil.isValidHexColor(hex), "Color " + hex + " must be a valid 6-char hex code");
        }
    }

    @Test
    void testDeterministicColorIsConsistent() {
        String color1 = TagColorUtil.getDeterministicColor("education", "DAM");
        String color2 = TagColorUtil.getDeterministicColor("education", "DAM");
        String color3 = TagColorUtil.getDeterministicColor("EDUCATION", "DAM ");

        assertNotNull(color1);
        assertEquals(color1, color2, "Color must be strictly deterministic");
        assertEquals(color1, color3, "Color must be case- and whitespace-insensitive for category and trimmed for value");
        assertTrue(TagColorUtil.PALETTE.contains(color1), "Deterministic color must belong to the palette");
    }

    @Test
    void testSanitizeColor() {
        String manual = "#ff00aa";
        assertEquals("#ff00aa", TagColorUtil.sanitizeColor(manual, "group", "A"));

        // If invalid or null, falls back to deterministic palette color
        String fallback = TagColorUtil.sanitizeColor(null, "group", "A");
        assertNotNull(fallback);
        assertTrue(TagColorUtil.PALETTE.contains(fallback));

        String invalid = TagColorUtil.sanitizeColor("invalid-color", "group", "A");
        assertEquals(fallback, invalid);
    }
}

