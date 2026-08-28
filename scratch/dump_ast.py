import clang.cindex
from clang.cindex import CursorKind

def get_modified_var(node):
    if node.kind == CursorKind.BINARY_OPERATOR:
        children = list(node.get_children())
        if len(children) >= 2 and children[0].kind == CursorKind.DECL_REF_EXPR:
            # Check the operator token
            lhs_tokens = list(children[0].get_tokens())
            node_tokens = list(node.get_tokens())
            if len(lhs_tokens) < len(node_tokens):
                op_token = node_tokens[len(lhs_tokens)].spelling
                if op_token in ['=', '+=', '-=', '*=', '/=', '%=', '<<=', '>>=', '&=', '^=', '|=']:
                    return children[0].spelling
    elif node.kind == CursorKind.UNARY_OPERATOR:
        children = list(node.get_children())
        if len(children) >= 1 and children[0].kind == CursorKind.DECL_REF_EXPR:
            node_tokens = list(node.get_tokens())
            if any(t.spelling in ['++', '--'] for t in node_tokens):
                return children[0].spelling
    return None

def print_ast(cursor, depth=0):
    mod_var = get_modified_var(cursor)
    print("  " * depth + f"{cursor.kind} - {cursor.spelling} [Modifies: {mod_var}]")
    for child in cursor.get_children():
        print_ast(child, depth + 1)

idx = clang.cindex.Index.create()
tu = idx.parse('tmp.cpp', args=['-std=c++17'])
print_ast(tu.cursor)
