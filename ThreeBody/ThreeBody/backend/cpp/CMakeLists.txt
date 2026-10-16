cmake_minimum_required(VERSION 3.16)
project(threebody_ffi CXX)
set(CMAKE_CXX_STANDARD 17)
set(CMAKE_POSITION_INDEPENDENT_CODE ON)

add_library(threebody_ffi SHARED
    src/solver.cpp
    src/ffi.cpp
    src/memory.cpp
)
target_include_directories(threebody_ffi PUBLIC include)
