import fs from "node:fs";
import path from "node:path";
import { analyzeSource } from "./analyzer";

const targetFile = process.argv[2];

if (!targetFile) {
  console.error("Usage: npm run scan <path-to-file>");
  process.exit(1);
}

const resolvedPath = path.resolve(process.cwd(), targetFile);

if (!fs.existsSync(resolvedPath)) {
  console.error(`File not found: ${resolvedPath}`);
  process.exit(1);
}

const sourceCode = fs.readFileSync(resolvedPath, "utf-8");
console.log(`\nAnalyzing ${path.basename(resolvedPath)} with CodeGuardians AST Engine...\n`);

try {
  const findings = analyzeSource(sourceCode, resolvedPath);

  if (findings.length === 0) {
    console.log("No security issues detected. Clean build!");
    process.exit(0);
  }

  console.log(`Found ${findings.length} security warning(s):\n`);

  for (const finding of findings) {
    const sevBadge = `[${finding.severity.toUpperCase()}]`.padEnd(11);
    console.log(
      `${sevBadge} ${finding.ruleId} at line ${finding.line}:${finding.column}`
    );
    console.log(`            ${finding.message}\n`);
  }
} catch (err: any) {
  console.error("Parser failure:", err.message);
  process.exit(1);
}

