import { describe, expect, it } from "vitest";

import { isSafeInternalPath } from "./safe-redirect";

describe("isSafeInternalPath", () => {
  it("aceita caminhos internos simples", () => {
    expect(isSafeInternalPath("/app")).toBe(true);
    expect(isSafeInternalPath("/app/desempenho")).toBe(true);
    expect(isSafeInternalPath("/app/desempenho?x=1")).toBe(true);
  });

  it("rejeita URLs absolutas de outro host (open redirect)", () => {
    expect(isSafeInternalPath("https://evil.com")).toBe(false);
    expect(isSafeInternalPath("http://evil.com/app")).toBe(false);
  });

  it("rejeita URLs protocol-relative (//host)", () => {
    expect(isSafeInternalPath("//evil.com")).toBe(false);
  });

  it("rejeita o truque de barra invertida (/\\evil.com)", () => {
    expect(isSafeInternalPath("/\\evil.com")).toBe(false);
  });

  it("rejeita strings vazias ou sem barra inicial", () => {
    expect(isSafeInternalPath("")).toBe(false);
    expect(isSafeInternalPath("app")).toBe(false);
  });
});
