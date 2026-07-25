import { createReactBlockSpec } from "@blocknote/react";
import { AlertTriangle, CheckCircle2, Info } from "lucide-react";

/**
 * Bloco custom mínimo — não existe callout nativo no BlockNote.
 * Serve só para validar schema/props tipadas/serialização/tema, não é o
 * callout acadêmico definitivo (Fase 03.3).
 */
const CALLOUT_TYPES = {
  info: { label: "Informação", icon: Info },
  attention: { label: "Atenção", icon: AlertTriangle },
  success: { label: "Sucesso", icon: CheckCircle2 },
} as const;

export type CalloutType = keyof typeof CALLOUT_TYPES;

export const calloutBlock = createReactBlockSpec(
  {
    type: "callout",
    propSchema: {
      type: {
        default: "info",
        values: ["info", "attention", "success"],
      },
    },
    content: "inline",
  },
  {
    render: (props) => {
      const calloutType = props.block.props.type as CalloutType;
      const { icon: Icon, label } = CALLOUT_TYPES[calloutType];

      return (
        <div
          className="lab-editor-callout"
          data-callout-type={calloutType}
          role="note"
          aria-label={`Aviso: ${label}`}
        >
          <div className="lab-editor-callout-icon" contentEditable={false}>
            <Icon className="h-4 w-4" aria-hidden />
          </div>
          <div className="lab-editor-callout-content" ref={props.contentRef} />
        </div>
      );
    },
  },
);
