import { createReactBlockSpec } from "@blocknote/react";
import {
  AlertTriangle,
  BookOpen,
  FlaskConical,
  GitBranch,
  HelpCircle,
  History,
  Library,
  Lightbulb,
  MessageCircleQuestion,
  NotebookText,
  Sigma,
  Wrench,
  XCircle,
} from "lucide-react";

/**
 * Bloco de estudo (Fase 03.3): o vocabulário acadêmico real do StudyOS,
 * evoluindo o callout genérico da prova técnica. Um único tipo de bloco
 * com a variante em props.kind — IDs estáveis (validados na 03.0) tornam
 * esses blocos endereçáveis pelas fases futuras: flashcards a partir de
 * "Pergunta de revisão" (Fase 04), buscas que priorizam "Definição",
 * revisão espaçada ancorada em "Conceito".
 *
 * O callout genérico (info/attention/success) permanece no schema por
 * compatibilidade com documentos já persistidos.
 */

export const STUDY_KINDS = {
  conceito: {
    label: "Conceito",
    icon: Lightbulb,
    className: "border-l-violet-500 bg-violet-500/5",
    iconClassName: "text-violet-600 dark:text-violet-400",
  },
  definicao: {
    label: "Definição",
    icon: BookOpen,
    className: "border-l-blue-500 bg-blue-500/5",
    iconClassName: "text-blue-600 dark:text-blue-400",
  },
  exemplo: {
    label: "Exemplo",
    icon: FlaskConical,
    className: "border-l-emerald-500 bg-emerald-500/5",
    iconClassName: "text-emerald-600 dark:text-emerald-400",
  },
  duvida: {
    label: "Dúvida",
    icon: HelpCircle,
    className: "border-l-cyan-500 bg-cyan-500/5",
    iconClassName: "text-cyan-600 dark:text-cyan-400",
  },
  atencao: {
    label: "Atenção",
    icon: AlertTriangle,
    className: "border-l-amber-500 bg-amber-500/5",
    iconClassName: "text-amber-600 dark:text-amber-400",
  },
  resumo: {
    label: "Resumo",
    icon: NotebookText,
    className: "border-l-slate-500 bg-slate-500/5",
    iconClassName: "text-slate-600 dark:text-slate-400",
  },
  formula: {
    label: "Fórmula",
    icon: Sigma,
    className: "border-l-indigo-500 bg-indigo-500/5",
    iconClassName: "text-indigo-600 dark:text-indigo-400",
  },
  linhaDoTempo: {
    label: "Linha do tempo",
    icon: History,
    className: "border-l-teal-500 bg-teal-500/5",
    iconClassName: "text-teal-600 dark:text-teal-400",
  },
  perguntaRevisao: {
    label: "Pergunta de revisão",
    icon: MessageCircleQuestion,
    className: "border-l-fuchsia-500 bg-fuchsia-500/5",
    iconClassName: "text-fuchsia-600 dark:text-fuchsia-400",
  },
  referencia: {
    label: "Referência",
    icon: Library,
    className: "border-l-sky-500 bg-sky-500/5",
    iconClassName: "text-sky-600 dark:text-sky-400",
  },
  aplicacaoPratica: {
    label: "Aplicação prática",
    icon: Wrench,
    className: "border-l-orange-500 bg-orange-500/5",
    iconClassName: "text-orange-600 dark:text-orange-400",
  },
  causaConsequencia: {
    label: "Causa e consequência",
    icon: GitBranch,
    className: "border-l-purple-500 bg-purple-500/5",
    iconClassName: "text-purple-600 dark:text-purple-400",
  },
  erroComum: {
    label: "Erro comum",
    icon: XCircle,
    className: "border-l-rose-500 bg-rose-500/5",
    iconClassName: "text-rose-600 dark:text-rose-400",
  },
} as const;

export type StudyKind = keyof typeof STUDY_KINDS;

export const STUDY_KIND_VALUES = Object.keys(STUDY_KINDS) as StudyKind[];

const FALLBACK_KIND: StudyKind = "conceito";

export const studyBlock = createReactBlockSpec(
  {
    type: "studyBlock",
    propSchema: {
      kind: {
        default: FALLBACK_KIND,
        values: STUDY_KIND_VALUES,
      },
    },
    content: "inline",
  },
  {
    render: ({ block, contentRef }) => {
      // Defesa em runtime: o propSchema do BlockNote não valida valores
      // vindos de dados persistidos (achado da Fase 03.0 §13) — um kind
      // desconhecido degrada para o fallback em vez de quebrar o render.
      const rawKind = block.props.kind as string;
      const kind: StudyKind = rawKind in STUDY_KINDS ? (rawKind as StudyKind) : FALLBACK_KIND;
      const { label, icon: Icon, className, iconClassName } = STUDY_KINDS[kind];

      return (
        <div
          className={`my-0.5 flex w-full gap-2 rounded-md border-l-4 py-2 pl-3 pr-2 ${className}`}
          data-study-kind={kind}
          role="note"
          aria-label={label}
        >
          <div className="flex shrink-0 flex-col items-center pt-0.5" contentEditable={false}>
            <Icon className={`h-4 w-4 ${iconClassName}`} aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <div
              className={`mb-0.5 text-[11px] font-semibold uppercase tracking-wide ${iconClassName}`}
              contentEditable={false}
            >
              {label}
            </div>
            <div className={kind === "formula" ? "font-mono text-sm" : ""} ref={contentRef} />
          </div>
        </div>
      );
    },
  },
);
