import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "@/hooks/use-auth";
import * as api from "./api";

export function questionsKey(userId: string | undefined) {
  return ["questions", userId] as const;
}

export function examsKey(userId: string | undefined) {
  return ["exams", userId] as const;
}

export function examQuestionsKey(userId: string | undefined, examId: string | undefined) {
  return ["exam-questions", userId, examId] as const;
}

export function examAttemptsKey(userId: string | undefined, examId: string | undefined) {
  return ["exam-attempts", userId, examId] as const;
}

export function questionAttemptsKey(userId: string | undefined, examAttemptId: string | undefined) {
  return ["question-attempts", userId, examAttemptId] as const;
}

// ---------------------------------------------------------------------
// Questions
// ---------------------------------------------------------------------

export function useQuestions() {
  const { user } = useAuth();
  return useQuery({
    enabled: !!user,
    queryKey: questionsKey(user?.id),
    queryFn: () => api.fetchQuestions(user!.id),
  });
}

function useInvalidateQuestions() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return () => void qc.invalidateQueries({ queryKey: questionsKey(user?.id) });
}

export function useCreateQuestion() {
  const { user } = useAuth();
  const invalidate = useInvalidateQuestions();
  return useMutation({
    mutationFn: (input: api.QuestionInput) => api.createQuestion(user!.id, input),
    onSuccess: invalidate,
  });
}

export function useUpdateQuestion(questionId: string) {
  const { user } = useAuth();
  const invalidate = useInvalidateQuestions();
  return useMutation({
    mutationFn: (input: api.QuestionInput) => api.updateQuestion(questionId, user!.id, input),
    onSuccess: invalidate,
  });
}

export function useSetQuestionArchived(questionId: string) {
  const invalidate = useInvalidateQuestions();
  return useMutation({
    mutationFn: (isArchived: boolean) => api.setQuestionArchived(questionId, isArchived),
    onSuccess: invalidate,
  });
}

export function useDeleteQuestion() {
  const invalidate = useInvalidateQuestions();
  return useMutation({
    mutationFn: (questionId: string) => api.deleteQuestion(questionId),
    onSuccess: invalidate,
  });
}

export function useSubmitQuestionAttempt() {
  return useMutation({
    mutationFn: (input: Parameters<typeof api.submitQuestionAttempt>[0]) =>
      api.submitQuestionAttempt(input),
  });
}

// ---------------------------------------------------------------------
// Exams
// ---------------------------------------------------------------------

export function useExams() {
  const { user } = useAuth();
  return useQuery({
    enabled: !!user,
    queryKey: examsKey(user?.id),
    queryFn: () => api.fetchExams(user!.id),
  });
}

function useInvalidateExams() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return () => void qc.invalidateQueries({ queryKey: examsKey(user?.id) });
}

export function useCreateExam() {
  const { user } = useAuth();
  const invalidate = useInvalidateExams();
  return useMutation({
    mutationFn: (input: api.ExamInput) => api.createExam(user!.id, input),
    onSuccess: invalidate,
  });
}

export function useUpdateExam(examId: string) {
  const invalidate = useInvalidateExams();
  return useMutation({
    mutationFn: (input: api.ExamInput) => api.updateExam(examId, input),
    onSuccess: invalidate,
  });
}

export function useSetExamArchived(examId: string) {
  const invalidate = useInvalidateExams();
  return useMutation({
    mutationFn: (isArchived: boolean) => api.setExamArchived(examId, isArchived),
    onSuccess: invalidate,
  });
}

export function useDeleteExam() {
  const invalidate = useInvalidateExams();
  return useMutation({
    mutationFn: (examId: string) => api.deleteExam(examId),
    onSuccess: invalidate,
  });
}

// ---------------------------------------------------------------------
// Exam composition (exam_questions)
// ---------------------------------------------------------------------

export function useExamQuestions(examId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    enabled: !!user && !!examId,
    queryKey: examQuestionsKey(user?.id, examId),
    queryFn: () => api.fetchExamQuestions(user!.id, examId!),
  });
}

function useInvalidateExamQuestions(examId: string | undefined) {
  const { user } = useAuth();
  const qc = useQueryClient();
  return () => void qc.invalidateQueries({ queryKey: examQuestionsKey(user?.id, examId) });
}

export function useAddQuestionToExam(examId: string) {
  const { user } = useAuth();
  const invalidate = useInvalidateExamQuestions(examId);
  return useMutation({
    mutationFn: ({ questionId, position }: { questionId: string; position: number }) =>
      api.addQuestionToExam(user!.id, examId, questionId, position),
    onSuccess: invalidate,
  });
}

export function useRemoveQuestionFromExam(examId: string) {
  const invalidate = useInvalidateExamQuestions(examId);
  return useMutation({
    mutationFn: (questionId: string) => api.removeQuestionFromExam(examId, questionId),
    onSuccess: invalidate,
  });
}

export function useReorderExamQuestions(examId: string) {
  const invalidate = useInvalidateExamQuestions(examId);
  return useMutation({
    mutationFn: (orderedQuestionIds: string[]) =>
      api.reorderExamQuestions(examId, orderedQuestionIds),
    onSuccess: invalidate,
  });
}

// ---------------------------------------------------------------------
// Exam attempts (execução e histórico)
// ---------------------------------------------------------------------

export function useExamAttempts(examId?: string) {
  const { user } = useAuth();
  return useQuery({
    enabled: !!user,
    queryKey: examAttemptsKey(user?.id, examId),
    queryFn: () => api.fetchExamAttempts(user!.id, examId),
  });
}

export function useStartExamAttempt() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (examId: string) => api.startExamAttempt(user!.id, examId),
    onSuccess: (attempt) => {
      void qc.invalidateQueries({
        queryKey: examAttemptsKey(user?.id, attempt.exam_id ?? undefined),
      });
      void qc.invalidateQueries({ queryKey: examAttemptsKey(user?.id, undefined) });
    },
  });
}

export function useFinishExamAttempt() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (examAttemptId: string) => api.finishExamAttempt(examAttemptId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["exam-attempts", user?.id] });
    },
  });
}

export function useQuestionAttempts(examAttemptId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    enabled: !!user && !!examAttemptId,
    queryKey: questionAttemptsKey(user?.id, examAttemptId),
    queryFn: () => api.fetchQuestionAttempts(user!.id, examAttemptId!),
  });
}
