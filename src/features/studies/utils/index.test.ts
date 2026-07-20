import { describe, expect, it } from "vitest";

import { STUDY_AREA_ICONS, type CourseStatus } from "../types";
import {
  calculateCourseProgress,
  calculateModuleProgress,
  canConfirmAreaDeletion,
  canConfirmModuleDeletion,
  COURSE_STATUS_LABELS,
  filterByArchiveState,
  filterByCompletion,
  isCourseOutsideArea,
  isLessonOutsideModule,
  isModuleOutsideCourse,
  isTreeFiltering,
  nextActivePosition,
  resolveAreaColorTokens,
  resolveAreaIcon,
  searchCourses,
  searchLessons,
  searchModules,
  searchStudyAreas,
  sortByPosition,
  validateReorderIds,
} from "./index";

describe("resolveAreaIcon (fallback de ícone)", () => {
  it("resolve todos os ícones da lista permitida sem cair no fallback", () => {
    for (const icon of STUDY_AREA_ICONS) {
      expect(resolveAreaIcon(icon)).toBe(resolveAreaIcon(icon));
      expect(resolveAreaIcon(icon)).not.toBeUndefined();
    }
  });

  it("cai no fallback (BookOpen) para um ícone desconhecido", () => {
    expect(resolveAreaIcon("IconeQueNaoExiste")).toBe(resolveAreaIcon("BookOpen"));
  });

  it("cai no fallback para null/undefined/vazio", () => {
    expect(resolveAreaIcon(null)).toBe(resolveAreaIcon("BookOpen"));
    expect(resolveAreaIcon(undefined)).toBe(resolveAreaIcon("BookOpen"));
    expect(resolveAreaIcon("")).toBe(resolveAreaIcon("BookOpen"));
  });
});

describe("resolveAreaColorTokens (fallback de cor)", () => {
  it("resolve uma cor válida com tokens distintos do fallback", () => {
    expect(resolveAreaColorTokens("magenta").dot).toBe("bg-fuchsia-500");
  });

  it("cai no fallback (slate) para uma cor desconhecida", () => {
    expect(resolveAreaColorTokens("purple")).toEqual(resolveAreaColorTokens("slate"));
  });

  it("cai no fallback para null/undefined", () => {
    expect(resolveAreaColorTokens(null)).toEqual(resolveAreaColorTokens("slate"));
    expect(resolveAreaColorTokens(undefined)).toEqual(resolveAreaColorTokens("slate"));
  });
});

describe("COURSE_STATUS_LABELS", () => {
  it("tem rótulo em português para todos os status", () => {
    const statuses: CourseStatus[] = ["not_started", "in_progress", "completed"];
    for (const status of statuses) {
      expect(COURSE_STATUS_LABELS[status]).toBeTruthy();
    }
    expect(COURSE_STATUS_LABELS.not_started).toBe("Não iniciado");
    expect(COURSE_STATUS_LABELS.in_progress).toBe("Em andamento");
    expect(COURSE_STATUS_LABELS.completed).toBe("Concluído");
  });
});

describe("sortByPosition", () => {
  it("ordena por position crescente sem mutar o array original", () => {
    const input = [
      { id: "c", position: 2 },
      { id: "a", position: 0 },
      { id: "b", position: 1 },
    ];
    const sorted = sortByPosition(input);
    expect(sorted.map((i) => i.id)).toEqual(["a", "b", "c"]);
    expect(input.map((i) => i.id)).toEqual(["c", "a", "b"]);
  });
});

describe("filterByArchiveState", () => {
  const items = [
    { id: "1", is_archived: false },
    { id: "2", is_archived: true },
    { id: "3", is_archived: false },
  ];

  it("filtro 'active' retorna só os não arquivados", () => {
    expect(filterByArchiveState(items, "active").map((i) => i.id)).toEqual(["1", "3"]);
  });

  it("filtro 'archived' retorna só os arquivados", () => {
    expect(filterByArchiveState(items, "archived").map((i) => i.id)).toEqual(["2"]);
  });

  it("filtro 'all' retorna todos", () => {
    expect(filterByArchiveState(items, "all")).toHaveLength(3);
  });
});

describe("searchStudyAreas / searchCourses", () => {
  const areas = [
    { name: "Marketing", description: "Tráfego pago e branding" },
    { name: "História", description: null },
  ];

  it("busca vazia retorna tudo", () => {
    expect(searchStudyAreas(areas, "")).toHaveLength(2);
  });

  it("busca por nome (case-insensitive)", () => {
    expect(searchStudyAreas(areas, "marketing")).toHaveLength(1);
  });

  it("busca por descrição", () => {
    expect(searchStudyAreas(areas, "branding")).toHaveLength(1);
  });

  it("busca sem correspondência retorna lista vazia", () => {
    expect(searchStudyAreas(areas, "geografia")).toHaveLength(0);
  });

  it("searchCourses tolera description null", () => {
    const courses = [{ name: "Curso A", description: null }];
    expect(searchCourses(courses, "curso")).toHaveLength(1);
    expect(searchCourses(courses, "inexistente")).toHaveLength(0);
  });
});

describe("isCourseOutsideArea", () => {
  it("true quando o curso é null/undefined", () => {
    expect(isCourseOutsideArea(null, "area-1")).toBe(true);
    expect(isCourseOutsideArea(undefined, "area-1")).toBe(true);
  });

  it("true quando o curso pertence a outra área", () => {
    expect(isCourseOutsideArea({ study_area_id: "area-2" }, "area-1")).toBe(true);
  });

  it("false quando o curso pertence à área da URL", () => {
    expect(isCourseOutsideArea({ study_area_id: "area-1" }, "area-1")).toBe(false);
  });
});

describe("canConfirmAreaDeletion", () => {
  it("permite confirmar sem digitar nada quando a área não tem cursos", () => {
    expect(canConfirmAreaDeletion("Marketing", 0, "")).toBe(true);
  });

  it("exige o nome exato quando a área tem cursos", () => {
    expect(canConfirmAreaDeletion("Marketing", 3, "")).toBe(false);
    expect(canConfirmAreaDeletion("Marketing", 3, "market")).toBe(false);
    expect(canConfirmAreaDeletion("Marketing", 3, "Marketing")).toBe(true);
  });

  it("tolera espaços nas pontas do texto digitado", () => {
    expect(canConfirmAreaDeletion("Marketing", 1, "  Marketing  ")).toBe(true);
  });
});

describe("nextActivePosition (criação e restauração)", () => {
  it("retorna 0 quando não há nenhuma linha ativa", () => {
    expect(nextActivePosition([])).toBe(0);
  });

  it("retorna 0 quando só existem linhas arquivadas (restauração de item arquivado, lista vazia)", () => {
    const items = [
      { position: 3, is_archived: true },
      { position: 7, is_archived: true },
    ];
    expect(nextActivePosition(items)).toBe(0);
  });

  it("ignora arquivadas e usa max(position)+1 só entre as ativas (criação normal / restauração)", () => {
    const items = [
      { position: 0, is_archived: false },
      { position: 1, is_archived: false },
      { position: 99, is_archived: true },
    ];
    expect(nextActivePosition(items)).toBe(2);
  });

  it("criação após existirem lacunas de posição entre as ativas usa o maior valor real, não o comprimento da lista", () => {
    // 2 linhas ativas, mas com positions [0, 5] (lacuna deixada por uma
    // exclusão ou arquivamento anterior) — o próximo valor tem que ser
    // 6, nunca 2 (que seria o array.length).
    const items = [
      { position: 0, is_archived: false },
      { position: 5, is_archived: false },
      { position: 2, is_archived: true },
    ];
    expect(nextActivePosition(items)).toBe(6);
  });
});

describe("validateReorderIds (mesma validação de conjunto completo do banco)", () => {
  it("aceita uma reordenação completa válida", () => {
    expect(validateReorderIds(["a", "b", "c"], ["a", "b", "c"])).toEqual({ valid: true });
    expect(validateReorderIds(["c", "a", "b"], ["a", "b", "c"])).toEqual({ valid: true });
  });

  it("rejeita array parcial (subconjunto)", () => {
    expect(validateReorderIds(["a", "b"], ["a", "b", "c"])).toEqual({
      valid: false,
      reason: "incomplete-set",
    });
  });

  it("rejeita array com IDs duplicados", () => {
    expect(validateReorderIds(["a", "a", "b"], ["a", "b"])).toEqual({
      valid: false,
      reason: "duplicate",
    });
  });

  it("rejeita ID arquivado (fora do conjunto esperado, que já exclui arquivadas)", () => {
    // "area-arquivada" existe na tabela mas não faz parte do conjunto
    // esperado (WHERE is_archived = false) — do ponto de vista da
    // validação, é indistinguível de um ID que não existe.
    expect(validateReorderIds(["a", "area-arquivada"], ["a", "b"])).toEqual({
      valid: false,
      reason: "invalid-ids",
    });
  });

  it("rejeita ID de outro usuário (fora do conjunto esperado deste usuário)", () => {
    expect(validateReorderIds(["a", "id-de-outro-usuario"], ["a", "b"])).toEqual({
      valid: false,
      reason: "invalid-ids",
    });
  });

  it("rejeita curso de outra área (fora do conjunto esperado desta área)", () => {
    // conjunto esperado já filtrado por study_area_id = área atual
    expect(validateReorderIds(["curso-1", "curso-de-outra-area"], ["curso-1", "curso-2"])).toEqual({
      valid: false,
      reason: "invalid-ids",
    });
  });

  it("array vazio é válido quando o conjunto esperado também está vazio", () => {
    expect(validateReorderIds([], [])).toEqual({ valid: true });
  });

  it("array vazio é rejeitado quando existem registros ativos esperados", () => {
    expect(validateReorderIds([], ["a", "b"])).toEqual({
      valid: false,
      reason: "empty-but-not-empty",
    });
  });

  it("rejeita módulo de outro usuário (fora do conjunto esperado)", () => {
    expect(validateReorderIds(["m1", "modulo-de-outro-usuario"], ["m1", "m2"])).toEqual({
      valid: false,
      reason: "invalid-ids",
    });
  });

  it("rejeita aula de outro módulo (fora do conjunto esperado deste módulo)", () => {
    expect(validateReorderIds(["a1", "aula-de-outro-modulo"], ["a1", "a2"])).toEqual({
      valid: false,
      reason: "invalid-ids",
    });
  });
});

describe("isModuleOutsideCourse", () => {
  it("true quando o módulo é null/undefined", () => {
    expect(isModuleOutsideCourse(null, "curso-1")).toBe(true);
    expect(isModuleOutsideCourse(undefined, "curso-1")).toBe(true);
  });

  it("true quando o módulo pertence a outro curso", () => {
    expect(isModuleOutsideCourse({ course_id: "curso-2" }, "curso-1")).toBe(true);
  });

  it("false quando o módulo pertence ao curso da URL", () => {
    expect(isModuleOutsideCourse({ course_id: "curso-1" }, "curso-1")).toBe(false);
  });
});

describe("isLessonOutsideModule", () => {
  it("true quando a aula é null/undefined", () => {
    expect(isLessonOutsideModule(null, "modulo-1")).toBe(true);
    expect(isLessonOutsideModule(undefined, "modulo-1")).toBe(true);
  });

  it("true quando a aula pertence a outro módulo", () => {
    expect(isLessonOutsideModule({ module_id: "modulo-2" }, "modulo-1")).toBe(true);
  });

  it("false quando a aula pertence ao módulo da URL", () => {
    expect(isLessonOutsideModule({ module_id: "modulo-1" }, "modulo-1")).toBe(false);
  });
});

describe("canConfirmModuleDeletion", () => {
  it("permite confirmar sem digitar nada quando o módulo não tem aulas", () => {
    expect(canConfirmModuleDeletion("Módulo 1", 0, "")).toBe(true);
  });

  it("exige o nome exato quando o módulo tem aulas", () => {
    expect(canConfirmModuleDeletion("Módulo 1", 3, "")).toBe(false);
    expect(canConfirmModuleDeletion("Módulo 1", 3, "modulo 1")).toBe(false);
    expect(canConfirmModuleDeletion("Módulo 1", 3, "Módulo 1")).toBe(true);
  });
});

describe("searchModules / searchLessons", () => {
  const modules = [
    { name: "Fundamentos", description: "Conceitos básicos do tema" },
    { name: "Avançado", description: null },
  ];

  it("busca vazia retorna tudo", () => {
    expect(searchModules(modules, "")).toHaveLength(2);
  });

  it("busca por nome do módulo (case-insensitive)", () => {
    expect(searchModules(modules, "fundamentos")).toHaveLength(1);
  });

  it("busca por descrição do módulo", () => {
    expect(searchModules(modules, "básicos")).toHaveLength(1);
  });

  it("searchLessons busca por título e tolera description null", () => {
    const lessons = [{ title: "Introdução", description: null }];
    expect(searchLessons(lessons, "intro")).toHaveLength(1);
    expect(searchLessons(lessons, "inexistente")).toHaveLength(0);
  });
});

describe("filterByCompletion", () => {
  const lessons = [
    { id: "1", is_completed: true },
    { id: "2", is_completed: false },
    { id: "3", is_completed: true },
  ];

  it("'all' retorna todas", () => {
    expect(filterByCompletion(lessons, "all")).toHaveLength(3);
  });

  it("'completed' retorna só as concluídas", () => {
    expect(filterByCompletion(lessons, "completed").map((l) => l.id)).toEqual(["1", "3"]);
  });

  it("'pending' retorna só as pendentes", () => {
    expect(filterByCompletion(lessons, "pending").map((l) => l.id)).toEqual(["2"]);
  });
});

describe("isTreeFiltering", () => {
  it("false quando ativas, sem busca e sem filtro de conclusão", () => {
    expect(isTreeFiltering("active", "", "all")).toBe(false);
  });

  it("true com filtro de arquivamento diferente de 'active'", () => {
    expect(isTreeFiltering("archived", "", "all")).toBe(true);
    expect(isTreeFiltering("all", "", "all")).toBe(true);
  });

  it("true com busca não vazia", () => {
    expect(isTreeFiltering("active", "aula 1", "all")).toBe(true);
  });

  it("true com busca só de espaços é tratada como vazia (trim)", () => {
    expect(isTreeFiltering("active", "   ", "all")).toBe(false);
  });

  it("true com filtro de conclusão diferente de 'all'", () => {
    expect(isTreeFiltering("active", "", "completed")).toBe(true);
    expect(isTreeFiltering("active", "", "pending")).toBe(true);
  });
});

describe("calculateModuleProgress", () => {
  it("sem aulas retorna 0%", () => {
    expect(calculateModuleProgress([])).toEqual({ completedCount: 0, totalCount: 0, percent: 0 });
  });

  it("todas pendentes", () => {
    const lessons = [
      { is_archived: false, is_completed: false },
      { is_archived: false, is_completed: false },
    ];
    expect(calculateModuleProgress(lessons)).toEqual({
      completedCount: 0,
      totalCount: 2,
      percent: 0,
    });
  });

  it("parte concluída", () => {
    const lessons = [
      { is_archived: false, is_completed: true },
      { is_archived: false, is_completed: false },
      { is_archived: false, is_completed: false },
      { is_archived: false, is_completed: false },
    ];
    expect(calculateModuleProgress(lessons)).toEqual({
      completedCount: 1,
      totalCount: 4,
      percent: 25,
    });
  });

  it("todas concluídas", () => {
    const lessons = [
      { is_archived: false, is_completed: true },
      { is_archived: false, is_completed: true },
    ];
    expect(calculateModuleProgress(lessons)).toEqual({
      completedCount: 2,
      totalCount: 2,
      percent: 100,
    });
  });

  it("aula arquivada não conta nem no numerador nem no denominador", () => {
    const lessons = [
      { is_archived: false, is_completed: true },
      { is_archived: true, is_completed: true },
      { is_archived: true, is_completed: false },
    ];
    expect(calculateModuleProgress(lessons)).toEqual({
      completedCount: 1,
      totalCount: 1,
      percent: 100,
    });
  });

  it("aula reaberta reduz o progresso", () => {
    const before = calculateModuleProgress([
      { is_archived: false, is_completed: true },
      { is_archived: false, is_completed: true },
    ]);
    const after = calculateModuleProgress([
      { is_archived: false, is_completed: false },
      { is_archived: false, is_completed: true },
    ]);
    expect(before.percent).toBe(100);
    expect(after.percent).toBe(50);
  });

  it("aula restaurada volta a contar", () => {
    const archived = calculateModuleProgress([
      { is_archived: true, is_completed: true },
      { is_archived: false, is_completed: false },
    ]);
    const restored = calculateModuleProgress([
      { is_archived: false, is_completed: true },
      { is_archived: false, is_completed: false },
    ]);
    expect(archived).toEqual({ completedCount: 0, totalCount: 1, percent: 0 });
    expect(restored).toEqual({ completedCount: 1, totalCount: 2, percent: 50 });
  });
});

describe("calculateCourseProgress", () => {
  it("sem módulos retorna 0%", () => {
    expect(calculateCourseProgress([], [])).toEqual({
      moduleCount: 0,
      lessonCount: 0,
      completedCount: 0,
      percent: 0,
    });
  });

  it("módulo arquivado: nenhuma aula dele conta, mesmo se a aula não estiver arquivada", () => {
    const modules = [
      { id: "m1", is_archived: false },
      { id: "m2", is_archived: true },
    ];
    const lessons = [
      { module_id: "m1", is_archived: false, is_completed: true },
      { module_id: "m2", is_archived: false, is_completed: true },
      { module_id: "m2", is_archived: false, is_completed: false },
    ];
    expect(calculateCourseProgress(modules, lessons)).toEqual({
      moduleCount: 1,
      lessonCount: 1,
      completedCount: 1,
      percent: 100,
    });
  });

  it("aula arquivada em módulo ativo não conta", () => {
    const modules = [{ id: "m1", is_archived: false }];
    const lessons = [
      { module_id: "m1", is_archived: false, is_completed: true },
      { module_id: "m1", is_archived: true, is_completed: true },
    ];
    expect(calculateCourseProgress(modules, lessons)).toEqual({
      moduleCount: 1,
      lessonCount: 1,
      completedCount: 1,
      percent: 100,
    });
  });

  it("percentual sem arredondamento inconsistente (1 de 3 = 33%)", () => {
    const modules = [{ id: "m1", is_archived: false }];
    const lessons = [
      { module_id: "m1", is_archived: false, is_completed: true },
      { module_id: "m1", is_archived: false, is_completed: false },
      { module_id: "m1", is_archived: false, is_completed: false },
    ];
    expect(calculateCourseProgress(modules, lessons).percent).toBe(33);
  });
});
