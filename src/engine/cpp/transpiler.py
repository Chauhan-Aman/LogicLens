import sys
import clang.cindex
from clang.cindex import CursorKind, TokenKind

def transpile(code):
    idx = clang.cindex.Index.create()
    tu = idx.parse('tmp.cpp', args=['-std=c++17'], unsaved_files=[('tmp.cpp', code)])
    
    replacements = []
    
    # We will traverse the tokens directly to find things like `var = value;`
    # and inject tracking calls after the semicolon.
    tokens = list(tu.get_tokens(extent=tu.cursor.extent))
    
    for i, token in enumerate(tokens):
        # Identify Variable Declarations: type name = value;
        # We can use AST for safer traversal
        pass
        
    def visit(node):
        if node.location.file and node.location.file.name != 'tmp.cpp':
            return
            
        if node.kind == CursorKind.VAR_DECL:
            # We want to track this variable if it's a local variable (inside a function)
            if node.semantic_parent and node.semantic_parent.kind in [CursorKind.FUNCTION_DECL, CursorKind.CXX_METHOD, CursorKind.COMPOUND_STMT]:
                name = node.spelling
                # Find the semicolon ending this declaration
                # We can inject `__ll_set_var("name", name);` after the semicolon
                end_offset = node.extent.end.offset
                # Find the next semicolon
                semicolon_offset = code.find(';', end_offset)
                if semicolon_offset != -1:
                    # check if it's part of a for loop init: `for(int i=0;`
                    # If it's a for loop, injecting after semicolon breaks the syntax.
                    # We can use a comma: `int i=0, __ll_set_var("i", i)` -> wait, __ll_set_var returns void.
                    
                    # For simplicity, if it's not a for loop, inject after semicolon.
                    parent_is_for = False
                    p = node.lexical_parent
                    if p and p.kind == CursorKind.FOR_STMT:
                        parent_is_for = True
                        
                    if not parent_is_for:
                        injection = f'\n__ll_set_var("{name}", {name});'
                        replacements.append((semicolon_offset + 1, injection))
        
        # Track assignments
        if node.kind == CursorKind.BINARY_OPERATOR:
            # Check if it's an assignment
            # libclang Python bindings don't directly expose operator kind easily, but we can check tokens
            # ...
            pass
            
        for child in node.get_children():
            visit(child)
            
    visit(tu.cursor)
    
    # Apply replacements
    replacements.sort(key=lambda x: x[0], reverse=True)
    res = code
    for offset, text in replacements:
        res = res[:offset] + text + res[offset:]
        
    return '#include "LogicLens.h"\n' + res

if __name__ == '__main__':
    with open(sys.argv[1], 'r') as f:
        code = f.read()
    print(transpile(code))
