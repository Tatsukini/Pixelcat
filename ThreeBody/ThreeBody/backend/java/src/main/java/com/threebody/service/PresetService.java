package com.threebody.service;

import com.threebody.model.Preset;
import java.util.LinkedHashMap;
import java.util.Map;

/** In-memory preset catalog. */
public class PresetService {
    private final Map<String, Preset> presets = new LinkedHashMap<>();

    public PresetService() {
        presets.put("figure_eight", new Preset(
            "figure_eight", "Classic Chenciner-Montgomery figure-eight",
            new double[][]{
                {0.97, -0.24, 0, 0.46, 0.43, 0, 1.0, 1.2},
                {-0.97, 0.24, 0, 0.46, 0.43, 0, 1.0, 1.2},
                {0, 0, 0, -0.93, -0.86, 0, 1.0, 1.2},
            }));
        presets.put("chaos_dance", new Preset(
            "chaos_dance", "Three unequal masses, chaotic orbit",
            new double[][]{
                {-6, 0, 0, 0, 0.4, 0, 5.0, 1.5},
                {6, 0, 0, 0, -0.4, 0, 5.0, 1.5},
                {0, 5, 0.5, -0.3, 0, 0.2, 2.0, 1.0},
            }));
    }

    public Map<String, Preset> all() { return presets; }
}
