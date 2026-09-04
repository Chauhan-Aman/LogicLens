import clang.cindex
from clang.cindex import CursorKind

for attr in dir(CursorKind):
    if 'OPERATOR' in attr or 'CALL' in attr or 'EXPR' in attr:
        print(attr)
