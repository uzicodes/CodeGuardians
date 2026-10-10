import { parse } from "@babel/parser";
import { auditAST } from "./rules.js";
import { Finding } from "./types.js";

export function analyzeSource(code: string, filename = "input.ts"): Finding[] {
  const ast = parse(code, {
    sourceType: "module",
    sourceFilename: filename,
    plugins: [
      "typescript",
      "jsx",
      "decorators-legacy",
      "classProperties",
      "exportDefaultFrom",
    ],
  });

  return auditAST(ast);
}

