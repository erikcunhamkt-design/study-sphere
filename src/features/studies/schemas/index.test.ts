import { describe, expect, it } from "vitest";

import { courseSchema, studyAreaSchema } from "./index";

describe("studyAreaSchema", () => {
  const valid = { name: "Marketing", description: "", icon: "BookOpen", color: "magenta" };

  it("aceita uma área válida", () => {
    expect(studyAreaSchema.safeParse(valid).success).toBe(true);
  });

  it("rejeita nome vazio", () => {
    const result = studyAreaSchema.safeParse({ ...valid, name: "" });
    expect(result.success).toBe(false);
  });

  it("rejeita nome só com espaços", () => {
    const result = studyAreaSchema.safeParse({ ...valid, name: "    " });
    expect(result.success).toBe(false);
  });

  it("normaliza (trim) o nome válido", () => {
    const result = studyAreaSchema.safeParse({ ...valid, name: "  Marketing  " });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.name).toBe("Marketing");
  });

  it("rejeita nome acima de 120 caracteres", () => {
    const result = studyAreaSchema.safeParse({ ...valid, name: "a".repeat(121) });
    expect(result.success).toBe(false);
  });

  it("rejeita cor fora da lista permitida", () => {
    const result = studyAreaSchema.safeParse({ ...valid, color: "purple" });
    expect(result.success).toBe(false);
  });

  it("rejeita ícone fora da lista permitida", () => {
    const result = studyAreaSchema.safeParse({ ...valid, icon: "Rocket" });
    expect(result.success).toBe(false);
  });
});

describe("courseSchema", () => {
  const valid = {
    study_area_id: "11111111-1111-1111-1111-111111111111",
    name: "Formação em Tráfego Pago",
    description: "",
    status: "not_started",
  };

  it("aceita um curso válido", () => {
    expect(courseSchema.safeParse(valid).success).toBe(true);
  });

  it("rejeita status inválido", () => {
    const result = courseSchema.safeParse({ ...valid, status: "archived" });
    expect(result.success).toBe(false);
  });

  it("rejeita área ausente/inválida", () => {
    expect(courseSchema.safeParse({ ...valid, study_area_id: "" }).success).toBe(false);
    expect(courseSchema.safeParse({ ...valid, study_area_id: "not-a-uuid" }).success).toBe(false);
  });

  it("rejeita nome vazio", () => {
    expect(courseSchema.safeParse({ ...valid, name: "" }).success).toBe(false);
  });
});
