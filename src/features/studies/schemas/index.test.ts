import { describe, expect, it } from "vitest";

import { courseModuleSchema, courseSchema, lessonSchema, studyAreaSchema } from "./index";

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

describe("courseModuleSchema", () => {
  const valid = {
    course_id: "11111111-1111-1111-1111-111111111111",
    name: "Módulo 1 — Fundamentos",
    description: "",
  };

  it("aceita um módulo válido", () => {
    expect(courseModuleSchema.safeParse(valid).success).toBe(true);
  });

  it("rejeita nome vazio", () => {
    expect(courseModuleSchema.safeParse({ ...valid, name: "" }).success).toBe(false);
  });

  it("rejeita nome só com espaços", () => {
    expect(courseModuleSchema.safeParse({ ...valid, name: "     " }).success).toBe(false);
  });

  it("rejeita nome acima de 120 caracteres", () => {
    expect(courseModuleSchema.safeParse({ ...valid, name: "a".repeat(121) }).success).toBe(false);
  });

  it("rejeita descrição acima de 1000 caracteres", () => {
    expect(courseModuleSchema.safeParse({ ...valid, description: "a".repeat(1001) }).success).toBe(
      false,
    );
  });

  it("rejeita curso ausente/inválido", () => {
    expect(courseModuleSchema.safeParse({ ...valid, course_id: "" }).success).toBe(false);
    expect(courseModuleSchema.safeParse({ ...valid, course_id: "not-a-uuid" }).success).toBe(false);
  });
});

describe("lessonSchema", () => {
  const valid = {
    module_id: "11111111-1111-1111-1111-111111111111",
    course_id: "22222222-2222-2222-2222-222222222222",
    title: "Introdução ao tema",
    description: "",
  };

  it("aceita uma aula válida", () => {
    expect(lessonSchema.safeParse(valid).success).toBe(true);
  });

  it("rejeita título vazio", () => {
    expect(lessonSchema.safeParse({ ...valid, title: "" }).success).toBe(false);
  });

  it("rejeita título só com espaços", () => {
    expect(lessonSchema.safeParse({ ...valid, title: "   " }).success).toBe(false);
  });

  it("rejeita título acima de 160 caracteres", () => {
    expect(lessonSchema.safeParse({ ...valid, title: "a".repeat(161) }).success).toBe(false);
  });

  it("aceita título com exatamente 160 caracteres", () => {
    expect(lessonSchema.safeParse({ ...valid, title: "a".repeat(160) }).success).toBe(true);
  });

  it("rejeita descrição acima de 1000 caracteres", () => {
    expect(lessonSchema.safeParse({ ...valid, description: "a".repeat(1001) }).success).toBe(false);
  });

  it("rejeita módulo ausente/inválido", () => {
    expect(lessonSchema.safeParse({ ...valid, module_id: "" }).success).toBe(false);
    expect(lessonSchema.safeParse({ ...valid, module_id: "not-a-uuid" }).success).toBe(false);
  });
});
