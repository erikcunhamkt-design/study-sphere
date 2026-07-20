import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CompletionFilterControl } from "./completion-filter-control";

afterEach(cleanup);

describe("CompletionFilterControl", () => {
  it("marca a opção atual como selecionada (aria-selected)", () => {
    render(<CompletionFilterControl value="completed" onChange={() => {}} />);
    expect(screen.getByRole("tab", { name: "Concluídas" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByRole("tab", { name: "Todas" })).toHaveAttribute("aria-selected", "false");
  });

  it("chama onChange com o valor clicado", () => {
    const onChange = vi.fn();
    render(<CompletionFilterControl value="all" onChange={onChange} />);
    fireEvent.click(screen.getByRole("tab", { name: "Pendentes" }));
    expect(onChange).toHaveBeenCalledWith("pending");
  });
});
