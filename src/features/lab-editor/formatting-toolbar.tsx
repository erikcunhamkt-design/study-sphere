import {
  BasicTextStyleButton,
  ColorStyleButton,
  CreateLinkButton,
  FormattingToolbar,
  FormattingToolbarController,
} from "@blocknote/react";

/**
 * Toolbar de formatação restrita ao conjunto curto exigido pela prova:
 * negrito, itálico, sublinhado, tachado, código inline, link, cor de
 * texto e destaque (ambos cobertos pelo ColorStyleButton nativo, que já
 * usa a paleta curta de --bn-colors-highlights-*, mapeada ao tema).
 * Sem alinhamento, sem comentários, sem seletor de tipo de bloco — fora
 * do escopo desta prova.
 */
export function LabEditorFormattingToolbar() {
  return (
    <FormattingToolbarController
      formattingToolbar={() => (
        <FormattingToolbar>
          <BasicTextStyleButton basicTextStyle="bold" />
          <BasicTextStyleButton basicTextStyle="italic" />
          <BasicTextStyleButton basicTextStyle="underline" />
          <BasicTextStyleButton basicTextStyle="strike" />
          <BasicTextStyleButton basicTextStyle="code" />
          <ColorStyleButton />
          <CreateLinkButton />
        </FormattingToolbar>
      )}
    />
  );
}
