import sys
import clang.cindex
from clang.cindex import CursorKind

def print_ast(cursor, indent=0):
    print('  ' * indent + f"{cursor.kind} - {cursor.spelling}")
    for child in cursor.get_children():
        print_ast(child, indent + 1)

idx = clang.cindex.Index.create()
code = """
int main() {
    if (x > 0) {
        x++;
    } else if (x < 0) {
        x--;
    } else {
        x = 0;
    }
}
"""
with open('tmp2.cpp', 'w') as f:
    f.write(code)

tu = idx.parse('tmp2.cpp', args=['-std=c++17'])
print_ast(tu.cursor)
