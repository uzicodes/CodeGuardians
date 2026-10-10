import _traverse from "@babel/traverse";
import * as t from "@babel/types";
import { Finding } from "./types";

const traverse = (_traverse as any).default ?? _traverse;
const SECRET_NAME_REGEX = /(?:api[_-]?key|auth[_-]?token|secret|password|private[_-]?key)/i;

export function auditAST(ast: t.File): Finding[] {
  const findings: Finding[] = [];

  traverse(ast, {
    VariableDeclarator(path: any) {
      const id = path.node.id;
      const init = path.node.init;

      if (t.isIdentifier(id) && SECRET_NAME_REGEX.test(id.name)) {
        if (t.isStringLiteral(init) && init.value.trim().length > 6) {
          findings.push({
            ruleId: "hardcoded-secret",
            message: `Possible hardcoded secret assigned to variable "${id.name}". Store credentials in environment variables.`,
            severity: "critical",
            line: id.loc?.start.line ?? 0,
            column: id.loc?.start.column ?? 0,
          });
        }
      }
    },

    CallExpression(path: any) {
      const callee = path.node.callee;

      if (t.isIdentifier(callee, { name: "eval" })) {
        findings.push({
          ruleId: "unsafe-eval",
          message: "Direct call to eval() detected. Arbitrary execution opens severe code injection vectors.",
          severity: "critical",
          line: callee.loc?.start.line ?? 0,
          column: callee.loc?.start.column ?? 0,
        });
      }

      if (
        t.isMemberExpression(callee) &&
        t.isIdentifier(callee.object, { name: "console" })
      ) {
        for (const arg of path.node.arguments) {
          const isEntireEnv =
            t.isMemberExpression(arg) &&
            t.isIdentifier(arg.object, { name: "process" }) &&
            t.isIdentifier(arg.property, { name: "env" });

          const isSensitiveEnvProperty =
            t.isMemberExpression(arg) &&
            t.isMemberExpression(arg.object) &&
            t.isIdentifier(arg.object.object, { name: "process" }) &&
            t.isIdentifier(arg.object.property, { name: "env" }) &&
            t.isIdentifier(arg.property) &&
            SECRET_NAME_REGEX.test(arg.property.name);

          if (isEntireEnv || isSensitiveEnvProperty) {
            findings.push({
              ruleId: "env-leak",
              message: "Sensitive environment variable or entire process.env exposed to console output.",
              severity: "high",
              line: arg.loc?.start.line ?? 0,
              column: arg.loc?.start.column ?? 0,
            });
          }
        }
      }
    },

    NewExpression(path: any) {
      const callee = path.node.callee;
      if (t.isIdentifier(callee, { name: "Function" })) {
        findings.push({
          ruleId: "unsafe-eval",
          message: "Dynamic Function constructor execution detected. Functions parsed from strings are vulnerable to injection.",
          severity: "high",
          line: callee.loc?.start.line ?? 0,
          column: callee.loc?.start.column ?? 0,
        });
      }
    },
  });

  return findings;
}

