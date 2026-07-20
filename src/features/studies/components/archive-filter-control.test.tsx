import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ArchiveFilterControl } from "./archive-filter-control";

afterEach(cleanup);

describe("ArchiveFilterControl", () => {
  it("marca a opção atual como selecionada (aria-selected)", () => {
    render(<ArchiveFilterControl value="archived" onChange={() => {}} />);
    expect(screen.getByRole("tab", { name: "Arquivadas" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByRole("tab", { name: "Ativas" })).toHaveAttribute("aria-selected", "false");
  });

  it("chama onChange com o valor clicado", () => {
    const onChange = vi.fn();
    render(<ArchiveFilterControl value="active" onChange={onChange} />);
    fireEvent.click(screen.getByRole("tab", { name: "Todas" }));
    expect(onChange).toHaveBeenCalledWith("all");
  });
});
