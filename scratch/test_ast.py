import clang.cindex
from clang.cindex import CursorKind

code = """
int main() {
    int nums_size = 4;
    for(int i = 0; i < nums_size; i++) {
        int x = i;
    }
}
"""

idx = clang.cindex.Index.create()
tu = idx.parse('tmp.cpp', args=['-std=c++17'], unsaved_files=[('tmp.cpp', code)])

def visit(node, depth=0):
    if node.kind == CursorKind.FOR_STMT:
        # Find all variables declared in the init
        declared_vars = []
        body_node = None
        for child in node.get_children():
            if child.kind == CursorKind.DECL_STMT:
                for c in child.get_children():
                    if c.kind == CursorKind.VAR_DECL:
                        declared_vars.append(c.spelling)
            elif child.kind == CursorKind.COMPOUND_STMT:
                body_node = child
                
        if declared_vars and body_node:
            print(f"For loop declares {declared_vars}, body starts at {body_node.extent.start.offset}")

    for c in node.get_children():
        visit(c, depth + 1)

visit(tu.cursor)
