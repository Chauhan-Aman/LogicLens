import sys
import clang.cindex
from clang.cindex import CursorKind, TokenKind

def transpile(code):
    idx = clang.cindex.Index.create()
    
    # Write to tmp.cpp safely
    import os
    import subprocess

    def get_cpp_include_paths():
        try:
            result = subprocess.run(['g++', '-E', '-x', 'c++', '-', '-v'], input=b'', capture_output=True, text=True)
            paths = []
            in_include_section = False
            for line in result.stderr.split('\n'):
                if line.startswith('#include <...> search starts here:'):
                    in_include_section = True
                    continue
                if line.startswith('End of search list.'):
                    break
                if in_include_section:
                    paths.append('-I' + line.strip())
            return paths
        except Exception:
            return []

    with open('tmp.cpp', 'wb') as f:
        f.write(code.encode('utf-8'))
        
    # We must pass the include path so clang can find LogicLens.h
    # Also pass standard library paths so it can resolve <vector>, <string>, etc.
    clang_args = ['-std=c++17', '-Isrc/engine/cpp'] + get_cpp_include_paths()
    tu = idx.parse('tmp.cpp', args=clang_args)
    
    code_bytes = code.encode('utf-8')
    replacements = []
    

    def get_base_var(node):
        if node.kind == CursorKind.DECL_REF_EXPR:
            return node.spelling
        if node.kind in [CursorKind.ARRAY_SUBSCRIPT_EXPR, CursorKind.CALL_EXPR, CursorKind.MEMBER_REF_EXPR, CursorKind.UNEXPOSED_EXPR]:
            children = list(node.get_children())
            if children:
                return get_base_var(children[0])
        return None

    def get_modified_var(n):
        if n.kind == CursorKind.BINARY_OPERATOR or n.kind == CursorKind.CALL_EXPR:
            children = list(n.get_children())
            if len(children) >= 2:
                base_var = get_base_var(children[0])
                if base_var:
                    # Very simple heuristic: if it's an assignment operator or overloaded assignment
                    node_tokens = list(n.get_tokens())
                    if any(t.spelling in ['=', '+=', '-=', '*=', '/=', '%=', '<<=', '>>=', '&=', '^=', '|='] for t in node_tokens):
                        return base_var
        elif n.kind == CursorKind.UNARY_OPERATOR:
            children = list(n.get_children())
            if len(children) >= 1:
                base_var = get_base_var(children[0])
                if base_var:
                    node_tokens = list(n.get_tokens())
                    if any(t.spelling in ['++', '--'] for t in node_tokens):
                        return base_var
        return None

    def visit(node, parent_kind=None):
        if node.location.file and node.location.file.name != 'tmp.cpp':
            return
            
        mod_var = get_modified_var(node)
        if mod_var and parent_kind == CursorKind.COMPOUND_STMT:
            end_offset = node.extent.end.offset
            semicolon_offset = code_bytes.find(b';', end_offset)
            if semicolon_offset != -1:
                injection = f'\n__ll_set_var("{mod_var}", {mod_var});'.encode('utf-8')
                replacements.append((semicolon_offset + 1, injection))
                
        if node.kind == CursorKind.VAR_DECL:
            # We want to track this variable if it's a local variable (inside a function)
            if node.semantic_parent and node.semantic_parent.kind in [CursorKind.FUNCTION_DECL, CursorKind.CXX_METHOD, CursorKind.COMPOUND_STMT]:
                name = node.spelling
                end_offset = node.extent.end.offset
                semicolon_offset = code_bytes.find(b';', end_offset)
                if semicolon_offset != -1:
                    if parent_kind != CursorKind.FOR_STMT:
                        injection = f'\n__ll_set_var("{name}", {name});'.encode('utf-8')
                        replacements.append((semicolon_offset + 1, injection))
                        print(f'VAR {name}: end={end_offset}, semi={semicolon_offset}')
        
        if node.kind == CursorKind.FOR_STMT or node.kind == CursorKind.WHILE_STMT:
            declared_vars = []
            body_node = None
            for child in node.get_children():
                if child.kind == CursorKind.DECL_STMT:
                    for c in child.get_children():
                        if c.kind == CursorKind.VAR_DECL:
                            declared_vars.append(c.spelling)
                elif child.kind == CursorKind.COMPOUND_STMT:
                    body_node = child
                    
            # Inject blockEnter('loop', type) BEFORE the loop
            loop_type = "for" if node.kind == CursorKind.FOR_STMT else "while"
            start_offset = node.extent.start.offset
            replacements.append((start_offset, f'\n__ll_block_enter("loop", "{loop_type}");\n'.encode('utf-8')))

            # Inject blockExit() AFTER the loop
            end_offset = node.extent.end.offset
            replacements.append((end_offset, b'\n__ll_block_exit();\n'))
            
            if body_node:
                # Inject iteration tracking at start of body
                start_body_offset = body_node.extent.start.offset
                brace_offset = code_bytes.find(b'{', start_body_offset)
                if brace_offset != -1:
                    injection = '\n__ll_block_enter("iteration");'
                    if declared_vars:
                        injection += ''.join([f'\n__ll_set_var("{name}", {name});' for name in declared_vars])
                    replacements.append((brace_offset + 1, injection.encode('utf-8')))
                
                # Inject blockExit() at end of body
                end_body_offset = body_node.extent.end.offset
                closing_brace_offset = code_bytes.rfind(b'}', start_body_offset, end_body_offset)
                if closing_brace_offset != -1:
                    replacements.append((closing_brace_offset, b'\n__ll_block_exit();\n'))
        
        if node.kind == CursorKind.IF_STMT:
            # Extract condition text using tokens
            tokens = list(node.get_tokens())
            paren_count = 0
            cond_tokens = []
            started = False
            for t in tokens:
                if t.spelling == '(':
                    if not started:
                        started = True
                        paren_count += 1
                        continue
                    paren_count += 1
                elif t.spelling == ')':
                    paren_count -= 1
                    if started and paren_count == 0:
                        break
                
                if started:
                    cond_tokens.append(t.spelling)
            
            cond_text = " ".join(cond_tokens).replace('"', '\\"')
            
            children = list(node.get_children())
            if len(children) >= 2:
                # children[0] is the condition, children[1] is the body (COMPOUND_STMT)
                body_node = children[1]
                if body_node.kind == CursorKind.COMPOUND_STMT:
                    start_body_offset = body_node.extent.start.offset
                    brace_offset = code_bytes.find(b'{', start_body_offset)
                    if brace_offset != -1:
                        injection = f'\n__ll_block_enter("logic", "{cond_text}");'
                        replacements.append((brace_offset + 1, injection.encode('utf-8')))
                    end_body_offset = body_node.extent.end.offset
                    closing_brace_offset = code_bytes.rfind(b'}', start_body_offset, end_body_offset)
                    if closing_brace_offset != -1:
                        replacements.append((closing_brace_offset, b'\n__ll_block_exit();\n'))
            
            if len(children) >= 3:
                # children[2] is the else block
                else_node = children[2]
                if else_node.kind == CursorKind.COMPOUND_STMT:
                    start_else = else_node.extent.start.offset
                    brace_offset = code_bytes.find(b'{', start_else)
                    if brace_offset != -1:
                        injection = f'\n__ll_block_enter("logic", "! ({cond_text}) (Else)");'
                        replacements.append((brace_offset + 1, injection.encode('utf-8')))
                    end_else = else_node.extent.end.offset
                    closing_brace_offset = code_bytes.rfind(b'}', start_else, end_else)
                    if closing_brace_offset != -1:
                        replacements.append((closing_brace_offset, b'\n__ll_block_exit();\n'))

        next_parent = node.kind
        if node.kind == CursorKind.DECL_STMT and parent_kind == CursorKind.FOR_STMT:
            next_parent = CursorKind.FOR_STMT
            
        for child in node.get_children():
            visit(child, next_parent)
            
    visit(tu.cursor)
    
    # Apply replacements
    # To handle multiple insertions at the exact same offset, we sort by offset descending.
    # Python's sort is stable, but we are inserting backwards, so if offset A == offset B,
    # the one that comes first in the array will be processed LAST, meaning it ends up FIRST in the final string.
    # Let's just safely apply them:
    replacements.sort(key=lambda x: x[0], reverse=True)
    res = code_bytes
    for offset, text in replacements:
        res = res[:offset] + text + res[offset:]
        
    return '#include "LogicLens.h"\n' + res.decode('utf-8')

if __name__ == '__main__':
    with open(sys.argv[1], 'r') as f:
        code = f.read()
    print(transpile(code))
