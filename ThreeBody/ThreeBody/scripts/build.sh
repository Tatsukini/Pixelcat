#!/usr/bin/env bash
# Build native accelerators: C++ shared lib, Rust cdylib, Java jar, C# assembly.
set -euo pipefail
HERE="$(cd "$(dirname "$0")/.." && pwd)"

echo "==> Building C++ core"
mkdir -p "$HERE/backend/cpp/build"
cmake -S "$HERE/backend/cpp" -B "$HERE/backend/cpp/build"
cmake --build "$HERE/backend/cpp/build" -j

echo "==> Building Rust helper"
( cd "$HERE/backend/rust" && cargo build --release )

echo "==> Building Java preset service"
( cd "$HERE/backend/java" && mvn -q package -DskipTests )

echo "==> Building C# telemetry service"
dotnet build "$HERE/backend/csharp/ThreeBody.Telemetry.csproj" -c Release

echo "==> All native modules built."
