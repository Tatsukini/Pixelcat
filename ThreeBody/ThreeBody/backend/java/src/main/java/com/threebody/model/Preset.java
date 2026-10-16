package com.threebody.model;

/** Immutable preset POJO. */
public class Preset {
    public final String name;
    public final String description;
    public final double[][] bodies; // [x,y,z,vx,vy,vz,mass,r]

    public Preset(String name, String description, double[][] bodies) {
        this.name = name;
        this.description = description;
        this.bodies = bodies;
    }
}
