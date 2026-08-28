import clang.cindex
from clang.cindex import CursorKind

code = """
#include <vector>
int main() {
    std::vector<int> nums = {1, 2, 3};
    int i = 0;
    int sum = nums[i] + nums[1];
    nums[0] = 5;
    return 0;
}
"""

def print_ast(node, indent=0):
    print('  ' * indent + f'{node.kind} : {node.spelling}')
    for child in node.get_children():
        print_ast(child, indent + 1)

idx = clang.cindex.Index.create()
tu = idx.parse('tmp.cpp', args=['-std=c++17'], unsaved_files=[('tmp.cpp', code)])

for node in tu.cursor.get_children():
    if node.location.file and node.location.file.name == 'tmp.cpp':
        print_ast(node)
