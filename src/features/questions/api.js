import { supabase } from "@/integrations/supabase/client";
const QUESTION_COLUMNS = "id, user_id, lesson_id, type, statement, options, correct_option_index, expected_answer, is_archived, created_at, updated_at";
export async function fetchQuestions(userId) {
    const { data, error } = await supabase
        .from("questions")
        .select(QUESTION_COLUMNS)
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
    if (error)
        throw error;
    return (data ?? []);
}
function questionInputToRow(userId, input) {
    return {
        user_id: userId,
        lesson_id: input.lessonId,
        type: input.type,
        statement: input.statement,
        options: input.options,
        correct_option_index: input.correctOptionIndex,
        expected_answer: input.expectedAnswer,
    };
}
export async function createQuestion(userId, input) {
    const { data, error } = await supabase
        .from("questions")
        .insert(questionInputToRow(userId, input))
        .select(QUESTION_COLUMNS)
        .single();
    if (error)
        throw error;
    return data;
}
export async function updateQuestion(questionId, userId, input) {
    const { data, error } = await supabase
        .from("questions")
        .update(questionInputToRow(userId, input))
        .eq("id", questionId)
        .select(QUESTION_COLUMNS)
        .single();
    if (error)
        throw error;
    return data;
}
export async function setQuestionArchived(questionId, isArchived) {
    const { error } = await supabase
        .from("questions")
        .update({ is_archived: isArchived })
        .eq("id", questionId);
    if (error)
        throw error;
}
export async function deleteQuestion(questionId) {
    const { error } = await supabase.from("questions").delete().eq("id", questionId);
    if (error)
        throw error;
}
/**
 * Resposta avulsa ou dentro de simulado (p_exam_attempt_id opcional). O
 * cliente nunca calcula is_correct — só envia o que o usuário escolheu/
 * autoavaliou e exibe exatamente o que a RPC devolve.
 */
export async function submitQuestionAttempt(input) {
    const { data, error } = await supabase.rpc("submit_question_attempt", {
        p_question_id: input.questionId,
        p_selected_option_index: (input.selectedOptionIndex ?? undefined),
        p_self_assessed_correct: (input.selfAssessedCorrect ?? undefined),
        p_exam_attempt_id: (input.examAttemptId ?? undefined),
    });
    if (error)
        throw error;
    return data;
}
const EXAM_COLUMNS = "id, user_id, title, description, time_limit_minutes, is_archived, created_at, updated_at";
export async function fetchExams(userId) {
    const { data, error } = await supabase
        .from("exams")
        .select(EXAM_COLUMNS)
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
    if (error)
        throw error;
    return (data ?? []);
}
export async function createExam(userId, input) {
    const { data, error } = await supabase
        .from("exams")
        .insert({
        user_id: userId,
        title: input.title,
        description: input.description,
        time_limit_minutes: input.timeLimitMinutes,
    })
        .select(EXAM_COLUMNS)
        .single();
    if (error)
        throw error;
    return data;
}
export async function updateExam(examId, input) {
    const { data, error } = await supabase
        .from("exams")
        .update({
        title: input.title,
        description: input.description,
        time_limit_minutes: input.timeLimitMinutes,
    })
        .eq("id", examId)
        .select(EXAM_COLUMNS)
        .single();
    if (error)
        throw error;
    return data;
}
export async function setExamArchived(examId, isArchived) {
    const { error } = await supabase
        .from("exams")
        .update({ is_archived: isArchived })
        .eq("id", examId);
    if (error)
        throw error;
}
export async function deleteExam(examId) {
    const { error } = await supabase.from("exams").delete().eq("id", examId);
    if (error)
        throw error;
}
/** Composição atual do simulado, já unida com o conteúdo da questão (join client-side, mesmo dono por RLS). */
export async function fetchExamQuestions(userId, examId) {
    const { data, error } = await supabase
        .from("exam_questions")
        .select(`exam_id, question_id, user_id, position, created_at, question:questions(${QUESTION_COLUMNS})`)
        .eq("user_id", userId)
        .eq("exam_id", examId)
        .order("position", { ascending: true });
    if (error)
        throw error;
    return (data ?? []).map((row) => ({
        exam_id: row.exam_id,
        question_id: row.question_id,
        user_id: row.user_id,
        position: row.position,
        created_at: row.created_at,
        question: row.question,
    }));
}
export async function addQuestionToExam(userId, examId, questionId, position) {
    const { error } = await supabase
        .from("exam_questions")
        .insert({ exam_id: examId, question_id: questionId, user_id: userId, position });
    if (error)
        throw error;
}
export async function removeQuestionFromExam(examId, questionId) {
    const { error } = await supabase
        .from("exam_questions")
        .delete()
        .eq("exam_id", examId)
        .eq("question_id", questionId);
    if (error)
        throw error;
}
/**
 * Só reordena a exibição do banco de questões dentro do simulado — não
 * há RPC dedicada (aprovada assim no Gate 2), e não precisa haver: a
 * ordem não afeta o placar nem a imutabilidade de nenhuma tentativa já
 * congelada.
 */
export async function reorderExamQuestions(examId, orderedQuestionIds) {
    await Promise.all(orderedQuestionIds.map((questionId, index) => supabase
        .from("exam_questions")
        .update({ position: index })
        .eq("exam_id", examId)
        .eq("question_id", questionId)
        .then(({ error }) => {
        if (error)
            throw error;
    })));
}
const EXAM_ATTEMPT_COLUMNS = "id, user_id, exam_id, started_at, ended_at, score_correct, score_total, duration_seconds";
export async function fetchExamAttempts(userId, examId) {
    let query = supabase
        .from("exam_attempts")
        .select(EXAM_ATTEMPT_COLUMNS)
        .eq("user_id", userId)
        .order("started_at", { ascending: false });
    if (examId)
        query = query.eq("exam_id", examId);
    const { data, error } = await query;
    if (error)
        throw error;
    return (data ?? []);
}
export async function startExamAttempt(userId, examId) {
    const { data, error } = await supabase
        .from("exam_attempts")
        .insert({ user_id: userId, exam_id: examId })
        .select(EXAM_ATTEMPT_COLUMNS)
        .single();
    if (error)
        throw error;
    return data;
}
export async function finishExamAttempt(examAttemptId) {
    const { data, error } = await supabase.rpc("finish_exam_attempt", {
        p_exam_attempt_id: examAttemptId,
    });
    if (error)
        throw error;
    return data;
}
export async function fetchQuestionAttempts(userId, examAttemptId) {
    const { data, error } = await supabase
        .from("question_attempts")
        .select("id, user_id, question_id, exam_attempt_id, attempted_at, selected_option_index, self_assessed_correct, is_correct")
        .eq("user_id", userId)
        .eq("exam_attempt_id", examAttemptId);
    if (error)
        throw error;
    return (data ?? []);
}
