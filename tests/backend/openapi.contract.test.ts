import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";

describe("OpenAPI contract", () => {
  it("parses as valid YAML", () => {
    expect(() => {
      execFileSync("ruby", [
        "-e",
        "require 'yaml'; YAML.load_file('backend/docs/openapi.yaml')",
      ], {
        cwd: process.cwd(),
        stdio: "pipe",
      });
    }).not.toThrow();
  });
});
