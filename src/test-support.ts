import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export function ensureGeneratedStylesheet(): void {
  const stylesheet = ":root{--color-app-canvas:#f7fafe;}";

  mkdirSync(".generated", { recursive: true });
  writeFileSync(join(".generated", "styles.css"), stylesheet, "utf8");
}
