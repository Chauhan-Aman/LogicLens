import * as Babel from '@babel/standalone';

/**
 * Transforms pure JavaScript into instrumented JavaScript
 * that automatically emits state events for LogicLens.
 */
export function transpileCode(code: string): string {
  // A custom Babel plugin to track variable assignments
  const logicLensPlugin = function(babel: any) {
    const t = babel.types;
    
    return {
      visitor: {
        // Track variable declarations: let x = 5;
        VariableDeclaration(path: any) {
          // Prevent infinite loops from injecting our own code
          if (path.node.loc === null) return;

          // Skip declarations inside for-loop inits (e.g. for (let i = 0; ...))
          // In that context the parent is ForStatement, not a Block, so insertAfter is invalid.
          const parent = path.parent;
          if (parent.type === 'ForStatement' && parent.init === path.node) return;

          const newNodes: any[] = [];
          
          path.node.declarations.forEach((decl: any) => {
            if (t.isIdentifier(decl.id) && decl.init) {
              const varName = decl.id.name;
              const trackStatement = t.expressionStatement(
                t.callExpression(
                  t.memberExpression(t.identifier('__ll'), t.identifier('setVar')),
                  [t.stringLiteral(varName), t.identifier(varName)]
                )
              );
              newNodes.push(trackStatement);
            }
          });

          if (newNodes.length > 0) {
            path.insertAfter(newNodes);
          }
        },

        // Track variable updates: x = 10;
        AssignmentExpression(path: any) {
          if (path.node.loc === null) return;

          if (t.isIdentifier(path.node.left)) {
            const varName = path.node.left.name;
            
            if (t.isExpressionStatement(path.parent)) {
              const trackStatement = t.expressionStatement(
                t.callExpression(
                  t.memberExpression(t.identifier('__ll'), t.identifier('setVar')),
                  [t.stringLiteral(varName), t.identifier(varName)]
                )
              );
              path.parentPath.insertAfter(trackStatement);
            }
          }
        },

        // Intercept new Map() and new Set() to return our tracked proxies
        NewExpression(path: any) {
          if (path.node.loc === null) return;
          
          if (t.isIdentifier(path.node.callee)) {
            let varName = 'unknown';
            
            // Try to find the variable name it's assigned to
            if (t.isVariableDeclarator(path.parent) && t.isIdentifier(path.parent.id)) {
              varName = path.parent.id.name;
            } else if (t.isAssignmentExpression(path.parent) && t.isIdentifier(path.parent.left)) {
              varName = path.parent.left.name;
            }

            if (path.node.callee.name === 'Map') {
              path.replaceWith(
                t.callExpression(
                  t.memberExpression(t.identifier('__ll'), t.identifier('map')),
                  [t.stringLiteral(varName)]
                )
              );
            } else if (path.node.callee.name === 'Set') {
              path.replaceWith(
                t.callExpression(
                  t.memberExpression(t.identifier('__ll'), t.identifier('set')),
                  [t.stringLiteral(varName)]
                )
              );
            }
          }
        },

        // Intercept console.log() and turn it into __ll.note()
        CallExpression(path: any) {
          if (path.node.loc === null) return;

          if (
            t.isMemberExpression(path.node.callee) &&
            t.isIdentifier(path.node.callee.object, { name: 'console' }) &&
            t.isIdentifier(path.node.callee.property, { name: 'log' })
          ) {
            // Replace console.log(...) with __ll.note(String(...))
            path.replaceWith(
              t.callExpression(
                t.memberExpression(t.identifier('__ll'), t.identifier('note')),
                path.node.arguments
              )
            );
          }
        }
      }
    };
  };

  try {
    const result = Babel.transform(code, {
      plugins: [logicLensPlugin],
      retainLines: true,
      parserOpts: {
        allowReturnOutsideFunction: true,
      },
    });
    
    return result?.code || code;
  } catch (err) {
    console.error("Babel transpilation error:", err);
    // Fallback to original code if transpilation fails (e.g., syntax error)
    // The executor will throw the syntax error natively.
    return code;
  }
}
