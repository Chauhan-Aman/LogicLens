import * as Babel from '@babel/standalone';

/**
 * Transforms pure JavaScript into instrumented JavaScript
 * that automatically emits state events for LogicLens.
 */
export function transpileCode(code: string): string {
  // A custom Babel plugin to track variable assignments
  const logicLensPlugin = function(babel: any) {
    const t = babel.types;
    
    function handleLoop(path: any) {
      if (path.node.loc === null) return;
      
      const loopType = path.node.type.replace('Statement', '').toLowerCase(); // 'for', 'while', etc.
      
      // 1. Inject blockEnter('loop', type) BEFORE the loop
      const enterCall = t.expressionStatement(
        t.callExpression(
          t.memberExpression(t.identifier('__ll'), t.identifier('blockEnter')),
          [t.stringLiteral('loop'), t.stringLiteral(loopType)]
        )
      );
      enterCall.loc = null as any;
      path.insertBefore(enterCall);

      // 2. Inject blockExit() AFTER the loop
      const exitCall = t.expressionStatement(
        t.callExpression(
          t.memberExpression(t.identifier('__ll'), t.identifier('blockExit')),
          []
        )
      );
      exitCall.loc = null as any;
      path.insertAfter(exitCall);

      // 3. Inject blockEnter('iteration') at the START of the loop body
      path.ensureBlock();
      const body = path.node.body;
      if (body && body.body) {
        const iterEnterCall = t.expressionStatement(
          t.callExpression(
            t.memberExpression(t.identifier('__ll'), t.identifier('blockEnter')),
            [t.stringLiteral('iteration')]
          )
        );
        iterEnterCall.loc = null as any;
        body.body.unshift(iterEnterCall);
        
        const iterExitCall = t.expressionStatement(
          t.callExpression(
            t.memberExpression(t.identifier('__ll'), t.identifier('blockExit')),
            []
          )
        );
        iterExitCall.loc = null as any;
        body.body.push(iterExitCall);
      }
    }

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

        // Track i++, i--, ++i, --i
        UpdateExpression(path: any) {
          if (path.node.loc === null) return;
          if (!t.isIdentifier(path.node.argument)) return;
          const varName = path.node.argument.name;
          // Only track at statement level
          if (t.isExpressionStatement(path.parent)) {
            const trackStatement = t.expressionStatement(
              t.callExpression(
                t.memberExpression(t.identifier('__ll'), t.identifier('setVar')),
                [t.stringLiteral(varName), t.identifier(varName)]
              )
            );
            path.parentPath.insertAfter(trackStatement);
          }
        },

        // Auto-track function enter/exit for any named function
        FunctionDeclaration(path: any) {
          if (path.node.loc === null) return;
          const fnName = path.node.id?.name ?? 'anonymous';
          const body = path.node.body;
          if (!body || !body.body) return;

          // Build args array: [arg0, arg1, ...]
          const argsArray = t.arrayExpression(
            path.node.params.map((p: any) =>
              t.isIdentifier(p) ? t.identifier(p.name) : t.stringLiteral('...')
            )
          );

          // Inject __ll.funcEnter("fnName", [args]) at top of function
          const enterCall = t.expressionStatement(
            t.callExpression(
              t.memberExpression(t.identifier('__ll'), t.identifier('funcEnter')),
              [t.stringLiteral(fnName), argsArray]
            )
          );
          enterCall.loc = null as any; // prevent re-processing
          body.body.unshift(enterCall);
        },

        // Inject __ll.funcExit(returnValue) before every return statement
        ReturnStatement(path: any) {
          if (path.node.loc === null) return;
          // Avoid injecting inside the injected funcEnter/funcExit calls themselves
          const fnParent = path.getFunctionParent();
          if (!fnParent || fnParent.node.loc === null) return;

          const returnArg = path.node.argument ?? t.identifier('undefined');

          // Save to a temp var so we don't double-evaluate the return expression
          const tempId = path.scope.generateUidIdentifier('ret');
          const tempDecl = t.variableDeclaration('const', [
            t.variableDeclarator(tempId, returnArg),
          ]);
          tempDecl.loc = null as any;

          const exitCall = t.expressionStatement(
            t.callExpression(
              t.memberExpression(t.identifier('__ll'), t.identifier('funcExit')),
              [tempId]
            )
          );
          exitCall.loc = null as any;

          // Replace: return expr  →  const _ret = expr; __ll.funcExit(_ret); return _ret;
          path.replaceWithMultiple([
            tempDecl,
            exitCall,
            t.returnStatement(tempId),
          ]);
        },

        // Track Loops
        ForStatement: handleLoop,
        WhileStatement: handleLoop,
        DoWhileStatement: handleLoop,
        ForInStatement: handleLoop,
        ForOfStatement: handleLoop,
          
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
