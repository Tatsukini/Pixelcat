"""Lazy-loads the C++ and Rust shared libraries via ctypes.

If the libraries are not present (e.g. user hasn't run scripts/build.sh),
the simulation transparently falls back to the pure-Python engine.
This module never raises on import.
"""
from __future__ import annotations
import ctypes
import os
import logging
from typing import Optional

log = logging.getLogger("threebody.ffi")

_CPP: Optional[ctypes.CDLL] = None
_RUST: Optional[ctypes.CDLL] = None


def _candidates(name: str) -> list[str]:
    here = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    return [
        os.path.join(here, "..", "cpp", "build", name),
        os.path.join(here, "..", "rust", "target", "release", name),
        os.path.join(here, "..", "cpp", name),
    ]


def load() -> None:
    global _CPP, _RUST
    for lib, names in [
        (_CPP, ["libthreebody_ffi.so", "libthreebody_ffi.dylib", "threebody_ffi.dll"]),
    ]:
        for n in names:
            for c in _candidates(n):
                c = os.path.abspath(c)
                if os.path.exists(c):
                    try:
                        _CPP = ctypes.CDLL(c)
                        log.info("loaded C++ core: %s", c)
                    except OSError as e:
                        log.warning("failed to load %s: %s", c, e)
                    break
    for n in ["libthreebody_rust.so", "libthreebody_rust.dylib", "threebody_rust.dll"]:
        for c in _candidates(n):
            c = os.path.abspath(c)
            if os.path.exists(c):
                try:
                    _RUST = ctypes.CDLL(c)
                    log.info("loaded Rust helper: %s", c)
                except OSError as e:
                    log.warning("failed to load %s: %s", c, e)
                break


def has_cpp() -> bool:
    return _CPP is not None


def has_rust() -> bool:
    return _RUST is not None
