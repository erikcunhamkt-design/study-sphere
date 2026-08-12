import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import * as api from "./api";
export function questionsKey(userId) {
    return ["questions", userId];
}
export function examsKey(userId) {
    return ["exams", userId];
}
export function examQuestionsKey(userId, examId) {
    return ["exam-questions", userId, examId];
}
export function examAttemptsKey(userId, examId) {
    return ["exam-attempts", userId, examId];
}
export function questionAttemptsKey(userId, examAttemptId) {
    return ["question-attempts", userId, examAttemptId];
}
// ---------------------------------------------------------------------
// Questions
// ---------------------------------------------------------------------
export function useQuestions() {
    const { user } = useAuth();
    return useQuery({
        enabled: !!user,
        queryKey: questionsKey(user?.id),
        queryFn: () => api.fetchQuestions(user.id),
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
        mutationFn: (input) => api.createQuestion(user.id, input),
        onSuccess: invalidate,
    });
}
export function useUpdateQuestion(questionId) {
    const { user } = useAuth();
    const invalidate = useInvalidateQuestions();
    return useMutation({
        mutationFn: (input) => api.updateQuestion(questionId, user.id, input),
        onSuccess: invalidate,
    });
}
export function useSetQuestionArchived(questionId) {
    const invalidate = useInvalidateQuestions();
    return useMutation({
        mutationFn: (isArchived) => api.setQuestionArchived(questionId, isArchived),
        onSuccess: invalidate,
    });
}
export function useDeleteQuestion() {
    const invalidate = useInvalidateQuestions();
    return useMutation({
        mutationFn: (questionId) => api.deleteQuestion(questionId),
        onSuccess: invalidate,
    });
}
export function useSubmitQuestionAttempt() {
    return useMutation({
        mutationFn: (input) => api.submitQuestionAttempt(input),
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
        queryFn: () => api.fetchExams(user.id),
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
        mutationFn: (input) => api.createExam(user.id, input),
        onSuccess: invalidate,
    });
}
export function useUpdateExam(examId) {
    const invalidate = useInvalidateExams();
    return useMutation({
        mutationFn: (input) => api.updateExam(examId, input),
        onSuccess: invalidate,
    });
}
export function useSetExamArchived(examId) {
    const invalidate = useInvalidateExams();
    return useMutation({
        mutationFn: (isArchived) => api.setExamArchived(examId, isArchived),
        onSuccess: invalidate,
    });
}
export function useDeleteExam() {
    const invalidate = useInvalidateExams();
    return useMutation({
        mutationFn: (examId) => api.deleteExam(examId),
        onSuccess: invalidate,
    });
}
// ---------------------------------------------------------------------
// Exam composition (exam_questions)
// ---------------------------------------------------------------------
export function useExamQuestions(examId) {
    const { user } = useAuth();
    return useQuery({
        enabled: !!user && !!examId,
        queryKey: examQuestionsKey(user?.id, examId),
        queryFn: () => api.fetchExamQuestions(user.id, examId),
    });
}
function useInvalidateExamQuestions(examId) {
    const { user } = useAuth();
    const qc = useQueryClient();
    return () => void qc.invalidateQueries({ queryKey: examQuestionsKey(user?.id, examId) });
}
export function useAddQuestionToExam(examId) {
    const { user } = useAuth();
    const invalidate = useInvalidateExamQuestions(examId);
    return useMutation({
        mutationFn: ({ questionId, position }) => api.addQuestionToExam(user.id, examId, questionId, position),
        onSuccess: invalidate,
    });
}
export function useRemoveQuestionFromExam(examId) {
    const invalidate = useInvalidateExamQuestions(examId);
    return useMutation({
        mutationFn: (questionId) => api.removeQuestionFromExam(examId, questionId),
        onSuccess: invalidate,
    });
}
export function useReorderExamQuestions(examId) {
    const invalidate = useInvalidateExamQuestions(examId);
    return useMutation({
        mutationFn: (orderedQuestionIds) => api.reorderExamQuestions(examId, orderedQuestionIds),
        onSuccess: invalidate,
    });
}
// ---------------------------------------------------------------------
// Exam attempts (execução e histórico)
// ---------------------------------------------------------------------
export function useExamAttempts(examId) {
    const { user } = useAuth();
    return useQuery({
        enabled: !!user,
        queryKey: examAttemptsKey(user?.id, examId),
        queryFn: () => api.fetchExamAttempts(user.id, examId),
    });
}
export function useStartExamAttempt() {
    const { user } = useAuth();
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (examId) => api.startExamAttempt(user.id, examId),
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
        mutationFn: (examAttemptId) => api.finishExamAttempt(examAttemptId),
        onSuccess: () => {
            void qc.invalidateQueries({ queryKey: ["exam-attempts", user?.id] });
        },
    });
}
export function useQuestionAttempts(examAttemptId) {
    const { user } = useAuth();
    return useQuery({
        enabled: !!user && !!examAttemptId,
        queryKey: questionAttemptsKey(user?.id, examAttemptId),
        queryFn: () => api.fetchQuestionAttempts(user.id, examAttemptId),
    });
}
