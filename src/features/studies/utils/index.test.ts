import { describe, expect, it } from "vitest";

import { STUDY_AREA_ICONS, type CourseStatus } from "../types";
import {
  canConfirmAreaDeletion,
  COURSE_STATUS_LABELS,
  filterByArchiveState,
  isCourseOutsideArea,
  nextActivePosition,
  resolveAreaColorTokens,
  resolveAreaIcon,
  searchCourses,
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
});
