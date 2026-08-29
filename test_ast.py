import sys
import clang.cindex
from clang.cindex import CursorKind

idx = clang.cindex.Index.create()
code = """
int main() {
    if (x > 0 && y == "test") {
        x++;
    } else if (x < 0) {
        x--;
    }
}
"""
with open('tmp2.cpp', 'w') as f:
    f.write(code)

tu = idx.parse('tmp2.cpp', args=['-std=c++17'])
code_bytes = code.encode('utf-8')

def visit(node):
    if node.kind == CursorKind.IF_STMT:
        tokens = list(node.get_tokens())
        # The tokens should be: 'if', '(', condition..., ')', '{' ...
        # Let's extract tokens between the first '(' and its closing ')'
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
        
        print("Condition tokens:", " ".join(cond_tokens))
            
    for child in node.get_children():
        visit(child)

visit(tu.cursor)
