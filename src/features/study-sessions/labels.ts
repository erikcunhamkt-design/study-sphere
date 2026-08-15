import type { StudyMethod } from "./types";

export const STUDY_METHOD_LABELS: Record<StudyMethod, string> = {
  livre: "Sessão Livre",
  pomodoro: "Pomodoro",
  feynman: "Explicar conceito",
  cornell: "Anotar e organizar",
  blurting: "Recuperar o que lembra",
  flashcards: "Testar memória",
  aprender: "Aprender primeiro",
  exame: "Simulado",
};

export const STUDY_METHOD_DESCRIPTIONS: Record<StudyMethod, string> = {
  livre: "Estude livremente sem vincular a sessão a um método específico.",
  pomodoro: "Estude em blocos de tempo com intervalos.",
  feynman: "Explique o conceito com suas próprias palavras para verificar se realmente entendeu.",
  cornell: "Estruture suas anotações com pistas e resumos.",
  blurting: "Escreva tudo o que lembra sem consultar o material.",
  flashcards: "Responda perguntas e compare com a resposta.",
  aprender: "Primeiro compreenda o material; depois o Dominus poderá testar o que você realmente reteve.",
  exame: "Avalie seu conhecimento com questões simuladas.",
};
