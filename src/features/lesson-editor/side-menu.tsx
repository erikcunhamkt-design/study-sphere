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
 * Igual ao menu lateral do laboratório (Fase 03.0), com um adicional:
 * transformar tipo de bloco — só entre tipos textuais compatíveis
 * (content: "inline"), e só porque testei ao vivo que
 * editor.updateBlock(id, {type}) preserva ID/conteúdo/estilos/filhos (ver
 * docs/AUDITORIA_FASE_03_1.md §8). Código (content: "plain") e divisor
 * (content: "none") ficam de fora — não são compatíveis.
 */

const TEXTUAL_COMPATIBLE_TYPES = [
  { type: "paragraph", label: "Texto" },
  { type: "heading", label: "Título 1", props: { level: 1 } },
  { type: "bulletListItem", label: "Lista com marcadores" },
  { type: "numberedListItem", label: "Lista numerada" },
  { type: "checkListItem", label: "Checklist", props: { checked: false } },
  { type: "toggleListItem", label: "Lista recolhível" },
  { type: "quote", label: "Citação" },
  { type: "callout", label: "Aviso", props: { type: "info" } },
] as const;

function MoveBlockItem(props: { direction: "up" | "down"; children: ReactNode }) {
  const editor = useBlockNoteEditor();
  const Components = useComponentsContext()!;
  const block = useExtensionState(SideMenuExtension, { selector: (state) => state?.block });

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

function DuplicateBlockItem(props: { children: ReactNode }) {
  const editor = useBlockNoteEditor();
  const Components = useComponentsContext()!;
  const block = useExtensionState(SideMenuExtension, { selector: (state) => state?.block });

  if (!block) return null;

  return (
    <Components.Generic.Menu.Item
      onClick={() => {
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

function TransformTypeItems() {
  const editor = useBlockNoteEditor();
  const Components = useComponentsContext()!;
  const block = useExtensionState(SideMenuExtension, { selector: (state) => state?.block });

  if (!block) return null;
  const targets = TEXTUAL_COMPATIBLE_TYPES.filter((t) => t.type !== block.type);
  if (targets.length === 0) return null;

  return (
    <>
      <Components.Generic.Menu.Label>Transformar em</Components.Generic.Menu.Label>
      {targets.map((target) => (
        <Components.Generic.Menu.Item
          key={target.type}
          onClick={() => {
            editor.updateBlock(block, {
              type: target.type,
              props: "props" in target ? target.props : undefined,
            } as Parameters<typeof editor.updateBlock>[1]);
          }}
        >
          {target.label}
        </Components.Generic.Menu.Item>
      ))}
    </>
  );
}

const LessonEditorDragHandleMenu = () => (
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
    <TransformTypeItems />
    <BlockColorsItem>Cores</BlockColorsItem>
    <RemoveBlockItem>Excluir</RemoveBlockItem>
  </DragHandleMenu>
);

const LessonEditorSideMenu = (props: SideMenuProps) => (
  <SideMenu {...props} dragHandleMenu={LessonEditorDragHandleMenu} />
);

export function LessonEditorSideMenuController() {
  return <SideMenuController sideMenu={LessonEditorSideMenu} />;
}
