#include <iostream>
#include <vector>

std::vector<int> nums = {1, 2, 3};

struct __LL_Init {
    __LL_Init() {
        std::cout << "Init nums" << std::endl;
    }
} __ll_init_instance;

int main() {
    std::cout << "Main runs" << std::endl;
    return 0;
}
