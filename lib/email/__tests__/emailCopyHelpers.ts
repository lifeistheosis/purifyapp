// Shared by the template tests. Not a test file itself (vitest collects only
// *.test.ts), just the doctrine check and a readable failure message.
import type { DoctrineViolation } from "@/lib/push/doctrine";

export { checkEmailCopy } from "../doctrine";

export function explainEmail(v: readonly DoctrineViolation[]): string {
  return v.map((x) => `${x.clause}: ${x.reason}`).join("\n");
}
