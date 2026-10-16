// Deterministic arena allocator used by the FFI boundary.
// All allocations are released in the dtor; no raw new/delete leaks.
#include <cstdlib>
#include <vector>
#include <cstddef>

namespace tb {

class Arena {
public:
    void* alloc(std::size_t bytes) {
        void* p = std::malloc(bytes);
        blocks_.push_back(p);
        return p;
    }
    ~Arena() {
        for (void* p : blocks_) std::free(p);
        blocks_.clear();
    }
private:
    std::vector<void*> blocks_;
};

}  // namespace tb
