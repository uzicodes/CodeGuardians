export type Severity = "low" | "medium" | "high" | "critical";

export interface Finding {
  ruleId: "hardcoded-secret" | "unsafe-eval" | "env-leak";
  message: string;
  severity: Severity;
  line: number;
  column: number;
}

