# ThreeBody Architecture

```
ThreeBody/                                  <- mother folder
├── README.md
├── start.cmd                               <- one-click launcher (Windows)
├── docs/
│   └── ARCHITECTURE.md                     <- this file
├── scripts/
│   ├── run.sh                              <- launcher for bash / macOS / Linux
│   └── build.sh                            <- builds C++ / Rust / Java / C# modules
├── backend/
│   ├── python/                             <- ★ local backend entrypoint (FastAPI + WebSocket)
│   │   ├── requirements.txt
│   │   ├── run.py                          <- uvicorn launcher
│   │   └── threebody/
│   │       ├── __init__.py
│   │       ├── config.py                   <- default config + presets
│   │       ├── engine.py                    <- Python N-body fallback integrator
│   │       ├── ffi.py                       <- loads C++/Rust shared libs via ctypes
│   │       ├── state.py                     <- simulation state container
│   │       ├── app.py                       <- FastAPI app factory
│   │       └── routes/
│   │           ├── __init__.py
│   │           ├── http.py                  <- REST: /presets, /config, /start, /stop
│   │           └── ws.py                   <- WebSocket: /ws pushes telemetry
│   ├── cpp/                                <- C++ physics core (compiled to .so/.dll/.dylib)
│   │   ├── CMakeLists.txt
│   │   ├── include/threebody/
│   │   │   ├── vector3.h                    <- tiny 3D vector math (header-only)
│   │   │   ├── body.h                       <- Body struct
│   │   │   └── solver.h                    <- N-body solver declarations
│   │   └── src/
│   │       ├── solver.cpp                   <- RK4 + leapfrog integrators
│   │       ├── ffi.cpp                      <- extern "C" ABI consumed by Python ctypes
│   │       └── memory.cpp                   <- arena allocator (deterministic free)
│   ├── rust/                               <- Rust numerical helper (cdylib)
│   │   ├── Cargo.toml
│   │   └── src/
│   │       └── lib.rs                       <- particle cloud sampling, FFI boundary
│   ├── java/                               <- Java preset/config microservice (HTTP)
│   │   ├── pom.xml
│   │   └── src/main/java/com/threebody/
│   │       ├── config/ConfigServer.java     <- com.sun.net.httpserver entry on :8081
│   │       ├── model/Preset.java            <- preset POJO
│   │       ├── service/PresetService.java  <- in-memory preset catalog
│   │       └── util/JsonUtil.java           <- tiny JSON writer (no deps)
│   └── csharp/                             <- C# telemetry analytics service
│       ├── ThreeBody.Telemetry.csproj
│       └── Program.cs                       <- console app, listens on :8082, computes stats
├── frontend/                               <- JS browser frontend (static, served by FastAPI)
│   ├── index.html
│   ├── package.json
│   └── src/
│       ├── main.js                          <- bootstraps renderer + WS client
│       ├── net/ws_client.js                <- WebSocket telemetry client
│       ├── ui/control_panel.js              <- custom HTML controls
│       ├── render/
│       │   ├── renderer.js                  <- WebGL2 renderer (forward + post chain)
│       │   ├── particle_system.js           <- GPU point-sprite particles
│       │   ├── postfx.js                    <- Gaussian blur, motion blur, bloom
│       │   └── volumetric.js               <- ray-marched volumetric light + fog
│       └── shaders/
│           ├── body.vert / body.frag        <- billboarded body sprites
│           ├── particle.vert / particle.frag
│           ├── blur.frag                     <- separable Gaussian
│           ├── motion_blur.frag              <- velocity-accumulation trail
│           ├── volumetric.frag              <- god rays + fog
│           └── composite.frag                <- final tonemap/grade
└── assets/                                 <- textures, skybox placeholders
```

## Data flow

```
Browser (JS)  ──HTTP /presets──►  Java service :8081 ──┐
     │                                                 │
     ──WebSocket /ws──► Python FastAPI :8000 ◄─────────┘
                          │
                          ├── calls C++ libthreebody_ffi.so (ctypes) if built
                          │      └── falls back to pure-Python engine
                          ├── calls Rust libthreebody_rust.so for sampling
                          └── pushes frames to C# telemetry :8082 for stats
```

The Python process is the single source of truth for body positions; the
frontend only renders what it receives over the WebSocket.
