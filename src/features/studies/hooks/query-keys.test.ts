import { describe, expect, it } from "vitest";

import { studyAreaKey, studyAreasKey } from "./use-study-areas";
import { allCoursesKey, coursesByAreaKey, courseKey } from "./use-courses";

// As query keys precisam conter o ID do usuário (ou dependerem só do
// próprio hook estar desabilitado sem ele) — sem isso, trocar de conta sem
// reload arriscaria reaproveitar dados em cache da sessão anterior. Ver
// docs/AUDITORIA_FASE_01_FINAL.md §8 para o mesmo cuidado em profile/
// preferences na Fase 01.

describe("query keys de studies incluem o ID do usuário", () => {
  it("studyAreasKey", () => {
    expect(studyAreasKey("user-a")).toContain("user-a");
    expect(studyAreasKey("user-a")).not.toEqual(studyAreasKey("user-b"));
  });

  it("studyAreaKey", () => {
    expect(studyAreaKey("user-a", "area-1")).toContain("user-a");
    expect(studyAreaKey("user-a", "area-1")).not.toEqual(studyAreaKey("user-b", "area-1"));
  });

  it("coursesByAreaKey", () => {
    expect(coursesByAreaKey("user-a", "area-1")).toContain("user-a");
    expect(coursesByAreaKey("user-a", "area-1")).not.toEqual(coursesByAreaKey("user-b", "area-1"));
  });

  it("allCoursesKey", () => {
    expect(allCoursesKey("user-a")).toContain("user-a");
    expect(allCoursesKey("user-a")).not.toEqual(allCoursesKey("user-b"));
  });

  it("courseKey", () => {
    expect(courseKey("user-a", "course-1")).toContain("user-a");
    expect(courseKey("user-a", "course-1")).not.toEqual(courseKey("user-b", "course-1"));
  });

  it("chaves de escopos diferentes (área vs. curso) nunca colidem", () => {
    expect(studyAreasKey("user-a")).not.toEqual(coursesByAreaKey("user-a", undefined));
    expect(studyAreaKey("user-a", "x")).not.toEqual(courseKey("user-a", "x"));
  });
});
