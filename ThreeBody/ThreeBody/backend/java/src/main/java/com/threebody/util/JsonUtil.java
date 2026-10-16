package com.threebody.util;

import java.util.Map;

/** Tiny JSON writer (no external deps). */
public final class JsonUtil {
    private JsonUtil() {}

    public static String escape(String s) {
        StringBuilder sb = new StringBuilder("\"");
        for (char c : s.toCharArray()) {
            switch (c) {
                case '"': sb.append("\\\""); break;
                case '\\': sb.append("\\\\"); break;
                case '\n': sb.append("\\n"); break;
                default: sb.append(c);
            }
        }
        return sb.append('"').toString();
    }

    public static String number(double d) {
        if (d == (long) d) return Long.toString((long) d);
        return Double.toString(d);
    }
}
