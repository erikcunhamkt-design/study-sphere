import { SideMenuExtension } from "@blocknote/core/extensions";
import {
  BlockColorsItem,
  DragHandleMenu,
  RemoveBlockItem,
  SideMenu,
  SideMenuController,
  type SideMenuProps,
  useBlockNoteEditor,
  useComponentsContext,
  useExtensionState,
} from "@blocknote/react";
import { ArrowDown, ArrowUp, Copy } from "lucide-react";
import type { ReactNode } from "react";

/**
 * Ações de "mover para cima/baixo" — alternativa ao arrastar exigida pela
 * prova (acessibilidade, mobile). Usa editor.moveBlocksUp/moveBlocksDown
 * com o bloco atualmente sob o handle (via SideMenuExtension state).
 */
function MoveBlockItem(props: { direction: "up" | "down"; children: ReactNode }) {
  const editor = useBlockNoteEditor();
  const Components = useComponentsContext()!;
  const block = useExtensionState(SideMenuExtension, {
    selector: (state) => state?.block,
  });

  if (!block) return null;

  return (
    <Components.Generic.Menu.Item
      onClick={() => {
        if (props.direction === "up") {
          editor.moveBlocksUp(block);
        } else {
          editor.moveBlocksDown(block);
        }
      }}
    >
      {props.children}
    </Components.Generic.Menu.Item>
  );
}

/**
 * BlockNote 0.52.1 não tem item nativo de "duplicar bloco" — construído
 * aqui como validação mínima da extensibilidade (insertBlocks sem id
 * explícito gera um ID novo automaticamente). "Transformar tipo" também
 * não é nativo e NÃO foi implementado nesta prova (ver auditoria §7/§13):
 * exigiria um seletor de tipos equivalente ao do menu /, fora do escopo
 * mínimo deste spike.
 */
function DuplicateBlockItem(props: { children: ReactNode }) {
  const editor = useBlockNoteEditor();
  const Components = useComponentsContext()!;
  const block = useExtensionState(SideMenuExtension, {
    selector: (state) => state?.block,
  });

  if (!block) return null;

  return (
    <Components.Generic.Menu.Item
      onClick={() => {
        // useExtensionState resolve o bloco contra o schema default do
        // BlockNote, não o schema customizado do laboratório — o cast é
        // necessário nesse limite genérico, o valor em si é o bloco real.
        const clone = {
          type: block.type,
          props: block.props,
          content: block.content,
          children: block.children,
        } as Parameters<typeof editor.insertBlocks>[0][number];
        editor.insertBlocks([clone], block, "after");
      }}
    >
      {props.children}
    </Components.Generic.Menu.Item>
  );
}

const LabEditorDragHandleMenu = () => (
  <DragHandleMenu>
    <MoveBlockItem direction="up">
      <ArrowUp className="mr-2 h-4 w-4" aria-hidden />
      Mover para cima
    </MoveBlockItem>
    <MoveBlockItem direction="down">
      <ArrowDown className="mr-2 h-4 w-4" aria-hidden />
      Mover para baixo
    </MoveBlockItem>
    <DuplicateBlockItem>
      <Copy className="mr-2 h-4 w-4" aria-hidden />
      Duplicar
    </DuplicateBlockItem>
    <BlockColorsItem>Cores</BlockColorsItem>
    <RemoveBlockItem>Excluir</RemoveBlockItem>
  </DragHandleMenu>
);

/**
 * Botão de adicionar + alça de arrastar continuam o comportamento padrão
 * (inclui duplicar/transformar/excluir nativamente); o menu da alça ganha
 * as duas ações alternativas de mover, para não depender só do drag-and-drop.
 */
const LabEditorSideMenu = (props: SideMenuProps) => (
  <SideMenu {...props} dragHandleMenu={LabEditorDragHandleMenu} />
);

export function LabEditorSideMenuController() {
  return <SideMenuController sideMenu={LabEditorSideMenu} />;
}
