import { describe, expect, it } from "vitest";

import {
  buildMediaPath,
  categoryForMime,
  MediaValidationError,
  sanitizeFileName,
  validateMediaFile,
} from "./media-upload";

function fakeFile(name: string, type: string, sizeBytes: number): File {
  const file = new File(["x"], name, { type });
  Object.defineProperty(file, "size", { value: sizeBytes });
  return file;
}

const MB = 1024 * 1024;

describe("categoryForMime", () => {
  it("classifica os MIME types permitidos na categoria certa", () => {
    expect(categoryForMime("image/png")).toBe("image");
    expect(categoryForMime("video/mp4")).toBe("video");
    expect(categoryForMime("audio/mpeg")).toBe("audio");
    expect(categoryForMime("application/pdf")).toBe("file");
  });

  it("recusa MIME fora da allowlist (inclusive SVG)", () => {
    expect(categoryForMime("image/svg+xml")).toBeNull();
    expect(categoryForMime("text/html")).toBeNull();
    expect(categoryForMime("application/x-msdownload")).toBeNull();
    expect(categoryForMime("")).toBeNull();
  });
});

describe("validateMediaFile", () => {
  it("aceita arquivo dentro do limite da categoria", () => {
    expect(() => validateMediaFile(fakeFile("a.png", "image/png", 4 * MB))).not.toThrow();
    expect(() => validateMediaFile(fakeFile("a.pdf", "application/pdf", 19 * MB))).not.toThrow();
  });

  it("recusa tipo não permitido com MediaValidationError", () => {
    expect(() => validateMediaFile(fakeFile("a.svg", "image/svg+xml", 1024))).toThrow(
      MediaValidationError,
    );
  });

  it("recusa arquivo acima do limite da categoria", () => {
    expect(() => validateMediaFile(fakeFile("a.png", "image/png", 6 * MB))).toThrow(
      MediaValidationError,
    );
    expect(() => validateMediaFile(fakeFile("a.mp4", "video/mp4", 51 * MB))).toThrow(
      MediaValidationError,
    );
  });
});

describe("sanitizeFileName", () => {
  it("remove caracteres perigosos e acentos", () => {
    expect(sanitizeFileName("relatório final (v2).pdf")).toBe("relatorio_final_v2_.pdf");
    // Sem barras não existe path traversal; os pontos restantes são inofensivos.
    expect(sanitizeFileName("../../etc/passwd")).toBe(".._.._etc_passwd");
  });

  it("nunca devolve vazio", () => {
    expect(sanitizeFileName("")).toBe("arquivo");
    expect(sanitizeFileName("///")).toBe("_");
  });
});

describe("buildMediaPath", () => {
  it("gera caminho {userId}/{lessonId}/{uuid}-{nome}", () => {
    const path = buildMediaPath("user-1", "lesson-2", "foto.png");
    const [userSeg, lessonSeg, fileSeg] = path.split("/");
    expect(userSeg).toBe("user-1");
    expect(lessonSeg).toBe("lesson-2");
    expect(fileSeg).toMatch(/^[0-9a-f-]{36}-foto\.png$/);
  });

  it("caminhos de uploads repetidos do mesmo arquivo nunca colidem", () => {
    const a = buildMediaPath("u", "l", "foto.png");
    const b = buildMediaPath("u", "l", "foto.png");
    expect(a).not.toBe(b);
  });
});
