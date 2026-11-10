/**
 * Finds a Capacitor plugin object handed through a promise (1.9, his report
 * of 2026-11-10; the why is in ../nativePlugin.ts). Capacitor's plugin object
 * answers "then", so wherever JavaScript takes it for a promise it calls the
 * phone for a method that is not there and waits for ever, with nothing said.
 * That happens wherever a promise is resolved with it:
 *
 *   - returned from an async function, or from a then() or catch() callback;
 *   - awaited;
 *   - handed to Promise.resolve(), to a new Promise's resolve(), or in the
 *     list given to Promise.all(), allSettled(), race() or any().
 *
 * And registerPlugin() anywhere but lib/platform/nativePlugin.ts, which hands
 * the plugin over in a box. Read from the code's own syntax tree, file by
 * file. Which names are plugin objects is not written here: the test asks
 * each plugin package the app carries, on Capacitor's own code
 * (pluginTrap.test.ts).
 */

import ts from "typescript";

export type PluginTrap = { file: string; line: number; what: string; text: string };

/** Each plugin package, with the names of its exports that are plugin objects. */
export type PluginExports = ReadonlyMap<string, ReadonlySet<string>>;

export const HELPER_FILE = "lib/platform/nativePlugin.ts";

const FUNCTION_KINDS = new Set([
  ts.SyntaxKind.FunctionDeclaration,
  ts.SyntaxKind.FunctionExpression,
  ts.SyntaxKind.ArrowFunction,
  ts.SyntaxKind.MethodDeclaration,
  ts.SyntaxKind.GetAccessor,
  ts.SyntaxKind.SetAccessor,
  ts.SyntaxKind.Constructor,
]);

const PROMISE_LISTS = new Set(["all", "allSettled", "race", "any"]);

function unwrap(e: ts.Expression): ts.Expression {
  for (;;) {
    if (ts.isParenthesizedExpression(e) || ts.isNonNullExpression(e) || ts.isAsExpression(e) || ts.isSatisfiesExpression(e) || ts.isTypeAssertionExpression(e)) e = e.expression;
    else return e;
  }
}

function isAsync(fn: ts.Node): boolean {
  return ts.canHaveModifiers(fn) && (ts.getModifiers(fn) ?? []).some((m) => m.kind === ts.SyntaxKind.AsyncKeyword);
}

/** A callback whose return value settles a promise: an argument of .then() or .catch(). */
function isSettlingCallback(fn: ts.Node): boolean {
  const call = fn.parent;
  if (!call || !ts.isCallExpression(call) || !call.arguments.includes(fn as ts.Expression)) return false;
  const callee = call.expression;
  return ts.isPropertyAccessExpression(callee) && (callee.name.text === "then" || callee.name.text === "catch");
}

function enclosingFunction(node: ts.Node): ts.Node | undefined {
  let n = node.parent;
  while (n && !FUNCTION_KINDS.has(n.kind)) n = n.parent;
  return n;
}

function moduleName(call: ts.CallExpression): string | null {
  if (call.expression.kind !== ts.SyntaxKind.ImportKeyword) return null;
  const arg = call.arguments[0];
  return arg && ts.isStringLiteralLike(arg) ? arg.text : null;
}

export function findPluginTraps(source: string, file: string, plugins: PluginExports): PluginTrap[] {
  const sf = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const traps: PluginTrap[] = [];
  /** Names bound in this file to a plugin object. */
  const pluginNames = new Set<string>();
  /** Names bound in this file to a plugin package's module, with the package. */
  const modules = new Map<string, string>();
  /** Plugin packages this file imports, for a plugin read off an object it cannot name. */
  const imported = new Set<string>();

  const bindPattern = (pattern: ts.BindingName, pkg: string) => {
    const exports = plugins.get(pkg);
    if (!exports) return;
    if (ts.isIdentifier(pattern)) {
      modules.set(pattern.text, pkg);
      return;
    }
    if (ts.isObjectBindingPattern(pattern)) {
      for (const el of pattern.elements) {
        const key = el.propertyName ?? el.name;
        if (ts.isIdentifier(key) && exports.has(key.text) && ts.isIdentifier(el.name)) pluginNames.add(el.name.text);
      }
    }
  };

  // First the names: what each import of a plugin package binds.
  const collect = (node: ts.Node) => {
    if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier) && plugins.has(node.moduleSpecifier.text)) {
      const pkg = node.moduleSpecifier.text;
      imported.add(pkg);
      const bindings = node.importClause?.namedBindings;
      if (bindings && ts.isNamespaceImport(bindings)) modules.set(bindings.name.text, pkg);
      if (bindings && ts.isNamedImports(bindings)) {
        for (const s of bindings.elements) if (plugins.get(pkg)!.has((s.propertyName ?? s.name).text)) pluginNames.add(s.name.text);
      }
    }
    if (ts.isCallExpression(node)) {
      const pkg = moduleName(node);
      if (pkg && plugins.has(pkg)) {
        imported.add(pkg);
        // import("pkg").then(({ X }) => ...) or .then((m) => ...)
        const access = node.parent;
        if (ts.isPropertyAccessExpression(access) && access.name.text === "then" && ts.isCallExpression(access.parent)) {
          const cb = access.parent.arguments[0];
          if (cb && (ts.isArrowFunction(cb) || ts.isFunctionExpression(cb)) && cb.parameters[0]) bindPattern(cb.parameters[0].name, pkg);
        }
        // const { X } = await import("pkg"), or plugin ?? (await import("pkg")), or Promise.all([import("pkg"), ...])
        let up: ts.Node = node;
        let index = -1;
        for (;;) {
          const p: ts.Node = up.parent;
          if (ts.isAwaitExpression(p) || ts.isParenthesizedExpression(p) || ts.isNonNullExpression(p) || ts.isAsExpression(p)) up = p;
          else if (ts.isBinaryExpression(p) && [ts.SyntaxKind.QuestionQuestionToken, ts.SyntaxKind.BarBarToken].includes(p.operatorToken.kind)) up = p;
          else if (ts.isArrayLiteralExpression(p) && index < 0) {
            index = p.elements.indexOf(up as ts.Expression);
            up = p;
          } else if (ts.isCallExpression(p) && index >= 0 && ts.isPropertyAccessExpression(p.expression) && p.expression.expression.getText() === "Promise") up = p;
          else break;
        }
        const decl = up.parent;
        if (ts.isVariableDeclaration(decl) && decl.initializer === up) {
          if (index < 0) bindPattern(decl.name, pkg);
          else if (ts.isArrayBindingPattern(decl.name)) {
            const el = decl.name.elements[index];
            if (el && ts.isBindingElement(el)) bindPattern(el.name, pkg);
          }
        }
      }
    }
    ts.forEachChild(node, collect);
  };
  collect(sf);

  const anyExport = new Set([...imported].flatMap((pkg) => [...plugins.get(pkg)!]));

  /** Whether an expression can be a plugin object itself. */
  const isPlugin = (raw: ts.Expression): boolean => {
    const e = unwrap(raw);
    if (ts.isConditionalExpression(e)) return isPlugin(e.whenTrue) || isPlugin(e.whenFalse);
    if (ts.isBinaryExpression(e) && [ts.SyntaxKind.QuestionQuestionToken, ts.SyntaxKind.BarBarToken, ts.SyntaxKind.AmpersandAmpersandToken].includes(e.operatorToken.kind)) {
      return isPlugin(e.left) || isPlugin(e.right);
    }
    if (ts.isIdentifier(e)) return pluginNames.has(e.text);
    if (ts.isPropertyAccessExpression(e)) {
      const owner = unwrap(e.expression);
      const pkg = ts.isIdentifier(owner) ? modules.get(owner.text) : undefined;
      return pkg ? plugins.get(pkg)!.has(e.name.text) : anyExport.has(e.name.text);
    }
    if (ts.isCallExpression(e)) {
      const callee = e.expression;
      return (ts.isIdentifier(callee) && callee.text === "registerPlugin") || (ts.isPropertyAccessExpression(callee) && callee.name.text === "registerPlugin");
    }
    return false;
  };

  const report = (node: ts.Node, what: string) => {
    const { line } = sf.getLineAndCharacterOfPosition(node.getStart(sf));
    traps.push({ file, line: line + 1, what, text: node.getText(sf).replace(/\s+/g, " ").slice(0, 120) });
  };

  /** A function whose return value settles a promise. */
  const settles = (fn: ts.Node | undefined) => !!fn && (isAsync(fn) || isSettlingCallback(fn));

  const visit = (node: ts.Node) => {
    if (ts.isCallExpression(node)) {
      const callee = node.expression;
      const name = ts.isIdentifier(callee) ? callee.text : ts.isPropertyAccessExpression(callee) ? callee.name.text : "";
      if (name === "registerPlugin" && file !== HELPER_FILE) report(node, `registerPlugin outside ${HELPER_FILE}`);
      if (ts.isPropertyAccessExpression(callee) && unwrap(callee.expression).getText(sf) === "Promise") {
        if (name === "resolve" && node.arguments[0] && isPlugin(node.arguments[0])) report(node, "a plugin handed to Promise.resolve()");
        if (PROMISE_LISTS.has(name) && node.arguments[0] && ts.isArrayLiteralExpression(node.arguments[0])) {
          for (const el of node.arguments[0].elements) if (isPlugin(el)) report(el, `a plugin in the list given to Promise.${name}()`);
        }
      }
      // resolve(plugin) inside new Promise((resolve) => ...)
      if (ts.isIdentifier(callee) && node.arguments[0] && isPlugin(node.arguments[0])) {
        let fn = enclosingFunction(node);
        while (fn) {
          const ctor = fn.parent;
          if (ctor && ts.isNewExpression(ctor) && ctor.expression.getText(sf) === "Promise" && (ts.isArrowFunction(fn) || ts.isFunctionExpression(fn))) {
            const first = fn.parameters[0]?.name;
            if (first && ts.isIdentifier(first) && first.text === callee.text) report(node, "a plugin handed to a new Promise's resolve()");
            break;
          }
          fn = enclosingFunction(fn);
        }
      }
    }
    if (ts.isAwaitExpression(node) && isPlugin(node.expression)) report(node, "a plugin awaited");
    if (ts.isReturnStatement(node) && node.expression && isPlugin(node.expression) && settles(enclosingFunction(node))) {
      report(node, "a plugin returned where it settles a promise");
    }
    if (ts.isArrowFunction(node) && !ts.isBlock(node.body) && isPlugin(node.body) && settles(node)) {
      report(node.body, "a plugin returned where it settles a promise");
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return traps;
}
