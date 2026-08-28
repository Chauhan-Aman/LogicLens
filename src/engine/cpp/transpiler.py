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
        
    def visit(node, parent_kind=None):
        if node.location.file and node.location.file.name != 'tmp.cpp':
            return
            
        if node.kind == CursorKind.VAR_DECL:
            # We want to track this variable if it's a local variable (inside a function)
            if node.semantic_parent and node.semantic_parent.kind in [CursorKind.FUNCTION_DECL, CursorKind.CXX_METHOD, CursorKind.COMPOUND_STMT]:
                name = node.spelling
                end_offset = node.extent.end.offset
                semicolon_offset = code.find(';', end_offset)
                if semicolon_offset != -1:
                    if parent_kind != CursorKind.FOR_STMT:
                        injection = f'\n__ll_set_var("{name}", {name});'
                        replacements.append((semicolon_offset + 1, injection))
        
        if node.kind == CursorKind.FOR_STMT:
            declared_vars = []
            body_node = None
            for child in node.get_children():
                if child.kind == CursorKind.DECL_STMT:
                    for c in child.get_children():
                        if c.kind == CursorKind.VAR_DECL:
                            declared_vars.append(c.spelling)
                elif child.kind == CursorKind.COMPOUND_STMT:
                    body_node = child
                    
            # Inject blockEnter('loop', 'for') BEFORE the loop
            start_offset = node.extent.start.offset
            replacements.append((start_offset, '\n__ll_block_enter("loop", "for");\n'))

            # Inject blockExit() AFTER the loop
            end_offset = node.extent.end.offset
            replacements.append((end_offset, '\n__ll_block_exit();\n'))
            
            if body_node:
                # Inject iteration tracking at start of body
                start_body_offset = body_node.extent.start.offset
                brace_offset = code.find('{', start_body_offset)
                if brace_offset != -1:
                    injection = '\n__ll_block_enter("iteration");'
                    if declared_vars:
                        injection += ''.join([f'\n__ll_set_var("{name}", {name});' for name in declared_vars])
                    replacements.append((brace_offset + 1, injection))
                
                # Inject blockExit() at end of body
                end_body_offset = body_node.extent.end.offset
                closing_brace_offset = code.rfind('}', start_body_offset, end_body_offset)
                if closing_brace_offset != -1:
                    replacements.append((closing_brace_offset, '\n__ll_block_exit();\n'))
        next_parent = node.kind
        if node.kind == CursorKind.DECL_STMT and parent_kind == CursorKind.FOR_STMT:
            next_parent = CursorKind.FOR_STMT
            
        for child in node.get_children():
            visit(child, next_parent)
            
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
