package com.threebody.config;

import com.threebody.model.Preset;
import com.threebody.service.PresetService;
import com.threebody.util.JsonUtil;
import com.sun.net.httpserver.HttpServer;
import com.sun.net.httpserver.HttpExchange;
import java.io.IOException;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.util.Map;

/**
 * Java preset/config microservice.
 * Binds to http://127.0.0.1:8081/presets
 */
public class ConfigServer {
    public static void main(String[] args) throws IOException {
        PresetService service = new PresetService();
        HttpServer server = HttpServer.create(new InetSocketAddress("127.0.0.1", 8081), 0);
        server.createContext("/presets", ex -> {
            StringBuilder sb = new StringBuilder("{");
            boolean first = true;
            for (Map.Entry<String, Preset> e : service.all().entrySet()) {
                if (!first) sb.append(',');
                first = false;
                Preset p = e.getValue();
                sb.append(JsonUtil.escape(p.name)).append(":{");
                sb.append("\"description\":").append(JsonUtil.escape(p.description)).append(',');
                sb.append("\"bodies\":[");
                for (int i = 0; i < p.bodies.length; i++) {
                    if (i > 0) sb.append(',');
                    sb.append('[');
                    double[] b = p.bodies[i];
                    for (int j = 0; j < b.length; j++) {
                        if (j > 0) sb.append(',');
                        sb.append(JsonUtil.number(b[j]));
                    }
                    sb.append(']');
                }
                sb.append("]}");
            }
            sb.append('}');
            write(ex, sb.toString());
        });
        server.createContext("/health", ex -> write(ex, "{\"ok\":true,\"lang\":\"java\"}"));
        server.setExecutor(null);
        server.start();
        System.out.println("ThreeBody Java config service on http://127.0.0.1:8081/");
    }

    private static void write(HttpExchange ex, String body) throws IOException {
        byte[] bytes = body.getBytes("UTF-8");
        ex.getResponseHeaders().set("Content-Type", "application/json; charset=utf-8");
        ex.sendResponseHeaders(200, bytes.length);
        try (OutputStream os = ex.getResponseBody()) { os.write(bytes); }
    }
}
