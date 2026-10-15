export type Severity = "low" | "medium" | "high" | "critical";

export type RuleId =
  | "hardcoded-secret"
  | "unsafe-eval"
  | "env-leak"
  | "dom-xss"
  | "insecure-transport";

export interface Finding {
  ruleId: RuleId;
  message: string;
  severity: Severity;
  line: number;
  column: number;
}

export interface RuleMetadata {
  id: RuleId;
  name: string;
  severity: Severity;
  description: string;
}

export const SECURITY_RULES: Record<RuleId, RuleMetadata> = {
  "hardcoded-secret": {
    id: "hardcoded-secret",
    name: "Hardcoded Secret",
    severity: "critical",
    description: "Detects plaintext credentials and API tokens stored in code.",
  },
  "unsafe-eval": {
    id: "unsafe-eval",
    name: "Unsafe Code Execution",
    severity: "critical",
    description: "Detects calls to eval() and dynamic Function constructors.",
  },
  "env-leak": {
    id: "env-leak",
    name: "Environment Variable Leak",
    severity: "high",
    description: "Detects exposure of process.env or sensitive variables to console output.",
  },
  "dom-xss": {
    id: "dom-xss",
    name: "DOM Cross-Site Scripting (XSS)",
    severity: "high",
    description: "Detects unsafe assignment to innerHTML/outerHTML or dangerouslySetInnerHTML.",
  },
  "insecure-transport": {
    id: "insecure-transport",
    name: "Insecure Transport (HTTP)",
    severity: "medium",
    description: "Detects unencrypted HTTP requests transmitted across public endpoints.",
  },
};
