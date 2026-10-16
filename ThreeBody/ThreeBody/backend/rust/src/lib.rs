//! ThreeBody Rust helper: particle cloud sampling and FFI boundary.
//! Ownership is explicit; every allocated buffer is paired with a free
//! function so the Python side never leaks.

use std::os::raw::c_int;

/// A point in 3D space.
#[repr(C)]
#[derive(Debug, Clone, Copy)]
pub struct Float3 {
    pub x: f32,
    pub y: f32,
    pub z: f32,
}

/// Sample `count` points on a spherical shell around `center`.
/// Returns a freshly allocated pointer of length `count * 3`.
/// Caller must release with `tb_free_f32`.
#[no_mangle]
pub extern "C" fn tb_sample_sphere(
    center: Float3,
    radius: f32,
    thickness: f32,
    count: c_int,
) -> *mut f32 {
    let n = count.max(0) as usize;
    let mut out: Vec<f32> = Vec::with_capacity(n * 3);
    // Deterministic LCG so the output is reproducible (good for tests).
    let mut state: u64 = 0x9E3779B97F4A7C15;
    for _ in 0..n {
        state = state.wrapping_mul(6364136223846793005).wrapping_add(1442695040888963407);
        let u = (state >> 33) as f32 / (1u64 << 31) as f32;
        state = state.wrapping_mul(6364136223846793005).wrapping_add(1442695040888963407);
        let v = (state >> 33) as f32 / (1u64 << 31) as f32;
        let theta = 2.0 * std::f32::consts::PI * u;
        let phi = (2.0 * v - 1.0).acos();
        let r = radius + thickness * (u - 0.5);
        out.push(center.x + r * phi.sin() * theta.cos());
        out.push(center.y + r * phi.sin() * theta.sin());
        out.push(center.z + r * phi.cos());
    }
    let ptr = out.as_ptr() as *mut f32;
    std::mem::forget(out);
    ptr
}

/// Release a buffer returned by `tb_sample_sphere`.
/// # Safety
/// `ptr` must have been returned by a previous call to `tb_sample_sphere`.
#[no_mangle]
pub unsafe extern "C" fn tb_free_f32(ptr: *mut f32, count: c_int) {
    if ptr.is_null() {
        return;
    }
    let n = count.max(0) as usize;
    drop(Vec::from_raw_parts(ptr, n * 3, n * 3));
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn sample_and_free() {
        let c = Float3 { x: 0.0, y: 0.0, z: 0.0 };
        let p = tb_sample_sphere(c, 1.0, 0.1, 16);
        unsafe { tb_free_f32(p, 16) };
    }
}
