import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { moveId, ReorderButtons } from "./reorder-buttons";

afterEach(cleanup);

describe("moveId (lógica pura de reordenação)", () => {
  const ids = ["a", "b", "c"];

  it("move um item para cima trocando de posição com o anterior", () => {
    expect(moveId(ids, 1, "up")).toEqual(["b", "a", "c"]);
  });

  it("move um item para baixo trocando de posição com o próximo", () => {
    expect(moveId(ids, 1, "down")).toEqual(["a", "c", "b"]);
  });

  it("não faz nada ao mover o primeiro item para cima", () => {
    expect(moveId(ids, 0, "up")).toEqual(ids);
  });

  it("não faz nada ao mover o último item para baixo", () => {
    expect(moveId(ids, 2, "down")).toEqual(ids);
  });

  it("não muta o array original", () => {
    const original = [...ids];
    moveId(ids, 1, "up");
    expect(ids).toEqual(original);
  });
});

describe("ReorderButtons (componente)", () => {
  it("expõe nomes acessíveis específicos para cada botão", () => {
    render(
      <ReorderButtons
        label="área Marketing"
        disabledUp={false}
        disabledDown={false}
        onMoveUp={() => {}}
        onMoveDown={() => {}}
      />,
    );
    expect(
      screen.getByRole("button", { name: "Mover área Marketing para cima" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Mover área Marketing para baixo" }),
    ).toBeInTheDocument();
  });

  it("desabilita o botão de subir no primeiro item e o de descer no último", () => {
    render(
      <ReorderButtons
        label="item"
        disabledUp={true}
        disabledDown={false}
        onMoveUp={() => {}}
        onMoveDown={() => {}}
      />,
    );
    expect(screen.getByRole("button", { name: "Mover item para cima" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Mover item para baixo" })).not.toBeDisabled();
  });

  it("chama onMoveUp/onMoveDown ao clicar", () => {
    const onMoveUp = vi.fn();
    const onMoveDown = vi.fn();
    render(
      <ReorderButtons
        label="item"
        disabledUp={false}
        disabledDown={false}
        onMoveUp={onMoveUp}
        onMoveDown={onMoveDown}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Mover item para cima" }));
    fireEvent.click(screen.getByRole("button", { name: "Mover item para baixo" }));
    expect(onMoveUp).toHaveBeenCalledTimes(1);
    expect(onMoveDown).toHaveBeenCalledTimes(1);
  });
});
