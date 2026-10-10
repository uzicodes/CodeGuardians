import { parse } from "@babel/parser";
import { auditAST } from "./rules";
import { Finding } from "./types";

export function analyzeSource(code: string, filename = "input.ts"): Finding[] {
  const ast = parse(code, {
    sourceType: "module",
    sourceFilename: filename,
    plugins: [
      "typescript",
      "jsx",
      "decorators-legacy",
      "classProperties" as any,
      "exportDefaultFrom",
    ],
  });

  return auditAST(ast);
}

