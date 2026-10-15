import _traverse from "@babel/traverse";
import * as t from "@babel/types";
import { Finding, SECURITY_RULES } from "./types";

const traverse = (_traverse as any).default ?? _traverse;
const SECRET_NAME_REGEX = /(?:api[_-]?key|auth[_-]?token|secret|password|private[_-]?key)/i;

function isInsecureHttpUrl(url: string): boolean {
  const trimmed = url.trim().toLowerCase();
  if (!trimmed.startsWith("http://")) return false;
  const afterScheme = trimmed.slice(7);
  if (
    afterScheme.startsWith("localhost") ||
    afterScheme.startsWith("127.0.0.1") ||
    afterScheme.startsWith("0.0.0.0")
  ) {
    return false;
  }
  return true;
}

export function auditAST(ast: t.File): Finding[] {
  const findings: Finding[] = [];

  traverse(ast, {
    // 1. Variable Declarations (hardcoded secrets)
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

    // 2. Direct DOM innerHTML/outerHTML assignments (dom-xss)
    AssignmentExpression(path: any) {
      const left = path.node.left;
      if (t.isMemberExpression(left)) {
        const prop = left.property;
        const isHtmlAssignment =
          (!left.computed &&
            t.isIdentifier(prop) &&
            (prop.name === "innerHTML" || prop.name === "outerHTML")) ||
          (left.computed &&
            t.isStringLiteral(prop) &&
            (prop.value === "innerHTML" || prop.value === "outerHTML"));

        if (isHtmlAssignment) {
          findings.push({
            ruleId: "dom-xss",
            message:
              "Unsafe assignment to innerHTML/outerHTML detected. This introduces Cross-Site Scripting (DOM XSS) vulnerabilities. Use textContent or safe DOM sanitization libraries (e.g., DOMPurify).",
            severity: "high",
            line: left.loc?.start.line ?? path.node.loc?.start.line ?? 0,
            column: left.loc?.start.column ?? path.node.loc?.start.column ?? 0,
          });
        }
      }
    },

    // 3. React dangerouslySetInnerHTML attribute (dom-xss)
    JSXAttribute(path: any) {
      const name = path.node.name;
      if (t.isJSXIdentifier(name, { name: "dangerouslySetInnerHTML" })) {
        findings.push({
          ruleId: "dom-xss",
          message:
            "Usage of dangerouslySetInnerHTML detected. Ensure raw HTML payloads are thoroughly sanitized with DOMPurify before rendering.",
          severity: "high",
          line: name.loc?.start.line ?? path.node.loc?.start.line ?? 0,
          column: name.loc?.start.column ?? path.node.loc?.start.column ?? 0,
        });
      }
    },

    // 4. Function invocations (eval, console.env, insecure transport)
    CallExpression(path: any) {
      const callee = path.node.callee;

      // unsafe-eval: direct eval()
      if (t.isIdentifier(callee, { name: "eval" })) {
        findings.push({
          ruleId: "unsafe-eval",
          message:
            "Direct call to eval() detected. Arbitrary execution opens severe code injection vectors.",
          severity: "critical",
          line: callee.loc?.start.line ?? 0,
          column: callee.loc?.start.column ?? 0,
        });
      }

      // env-leak: console logging of process.env or sensitive variables
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
              message:
                "Sensitive environment variable or entire process.env exposed to console output.",
              severity: "high",
              line: arg.loc?.start.line ?? 0,
              column: arg.loc?.start.column ?? 0,
            });
          }
        }
      }

      // insecure-transport: fetch or axios with unencrypted HTTP URL
      const isFetch = t.isIdentifier(callee, { name: "fetch" });
      const isAxios = t.isIdentifier(callee, { name: "axios" });
      const isAxiosMethod =
        t.isMemberExpression(callee) &&
        t.isIdentifier(callee.object, { name: "axios" });

      if (isFetch || isAxios || isAxiosMethod) {
        // Inspect all arguments (direct URL strings or options object with url property)
        for (const arg of path.node.arguments) {
          if (t.isStringLiteral(arg) && isInsecureHttpUrl(arg.value)) {
            findings.push({
              ruleId: "insecure-transport",
              message:
                "Insecure transport protocol (HTTP) detected in network request. Use HTTPS to protect transmitted data against Man-in-the-Middle (MitM) interception.",
              severity: "medium",
              line: arg.loc?.start.line ?? callee.loc?.start.line ?? 0,
              column: arg.loc?.start.column ?? callee.loc?.start.column ?? 0,
            });
          } else if (t.isObjectExpression(arg)) {
            for (const prop of arg.properties) {
              if (
                t.isObjectProperty(prop) &&
                t.isIdentifier(prop.key, { name: "url" }) &&
                t.isStringLiteral(prop.value) &&
                isInsecureHttpUrl(prop.value.value)
              ) {
                findings.push({
                  ruleId: "insecure-transport",
                  message:
                    "Insecure transport protocol (HTTP) detected in network request. Use HTTPS to protect transmitted data against Man-in-the-Middle (MitM) interception.",
                  severity: "medium",
                  line: prop.value.loc?.start.line ?? callee.loc?.start.line ?? 0,
                  column: prop.value.loc?.start.column ?? callee.loc?.start.column ?? 0,
                });
              }
            }
          }
        }
      }
    },

    // 5. Dynamic Function constructor (unsafe-eval)
    NewExpression(path: any) {
      const callee = path.node.callee;
      if (t.isIdentifier(callee, { name: "Function" })) {
        findings.push({
          ruleId: "unsafe-eval",
          message:
            "Dynamic Function constructor execution detected. Functions parsed from strings are vulnerable to injection.",
          severity: "high",
          line: callee.loc?.start.line ?? 0,
          column: callee.loc?.start.column ?? 0,
        });
      }
    },
  });

  return findings;
}

export { SECURITY_RULES };
