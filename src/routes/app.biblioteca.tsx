import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { 
  Plus, 
  Search,
  Layers,
  ListChecks,
  GraduationCap,
  ExternalLink
} from "lucide-react";
import { z } from "zod";

import { PageHeader } from "@/components/layout/page-shell";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { FlashcardList } from "@/features/flashcards/flashcard-list";
import { FlashcardFormDialog } from "@/features/flashcards/flashcard-form-dialog";
import { useFlashcards } from "@/features/flashcards/hooks";

import { DeckList } from "@/features/decks/deck-list";
import { DeckFormDialog } from "@/features/decks/deck-form-dialog";
import { useDecks } from "@/features/decks/hooks";
import type { DeckRow } from "@/features/decks/types";

import { QuestionList } from "@/features/questions/question-list";
import { QuestionFormDialog } from "@/features/questions/question-form-dialog";
import { ExamList } from "@/features/questions/exam-list";
import { ExamFormDialog } from "@/features/questions/exam-form-dialog";
import { useQuestions, useExams } from "@/features/questions/hooks";
import { MaterialList } from "@/features/study-materials/material-list";
import { MaterialFormDialog } from "@/features/study-materials/material-form-dialog";
import { useStudyMaterials } from "@/features/study-materials/hooks";
import type { StudyMaterialRow } from "@/features/study-materials/types";

const librarySearchSchema = z.object({
  tab: z.enum(["flashcards", "decks", "questions", "exams", "materials"]).optional().default("flashcards"),
});

export const Route = createFileRoute("/app/biblioteca")({
  validateSearch: (search) => librarySearchSchema.parse(search),
  component: LibraryPage,
});

function LibraryPage() {
  const { tab } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const [search, setSearch] = useState("");

  const [flashcardFormOpen, setFlashcardFormOpen] = useState(false);
  const [deckFormOpen, setDeckFormOpen] = useState(false);
  const [editingDeck, setEditingDeck] = useState<DeckRow | null>(null);
  const [questionFormOpen, setQuestionFormOpen] = useState(false);
  const [examFormOpen, setExamFormOpen] = useState(false);
  const [materialFormOpen, setMaterialFormOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<StudyMaterialRow | null>(null);

  const { data: flashcards = [] } = useFlashcards();
  const { data: decks = [] } = useDecks();
  const { data: questions = [] } = useQuestions();
  const { data: exams = [] } = useExams();
  const { data: materials = [] } = useStudyMaterials();

  const unlinkedFlashcards = flashcards.filter(
    (c) => c.lesson_id === null && !c.is_archived
  );
  const unlinkedQuestions = questions.filter(
    (q) => q.lesson_id === null && !q.is_archived
  );
  const activeExams = exams.filter(
    (e) => !e.is_archived
  );
  const unlinkedMaterials = materials.filter(
    (m) => m.course_id === null && !m.is_archived
  );

  const filteredFlashcards = unlinkedFlashcards.filter((c) => 
    JSON.stringify(c.front).toLowerCase().includes(search.toLowerCase()) ||
    JSON.stringify(c.back).toLowerCase().includes(search.toLowerCase())
  );

  const filteredQuestions = unlinkedQuestions.filter((q) =>
    q.statement.toLowerCase().includes(search.toLowerCase())
  );

  const filteredExams = activeExams.filter((e) =>
    e.title.toLowerCase().includes(search.toLowerCase())
  );
  const filteredMaterials = unlinkedMaterials.filter((m) =>
    m.title.toLowerCase().includes(search.toLowerCase()) ||
    m.url.toLowerCase().includes(search.toLowerCase())
  );

  const filteredDecks = decks.filter((d) =>
    d.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <PageHeader
          title="Biblioteca"
          description="Gestão de conteúdos avulsos (flashcards e questões não vinculados a aulas)."
        />
        <div className="flex items-center gap-2">
          <div className="relative w-full md:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar na biblioteca..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      <Tabs 
        value={tab} 
        onValueChange={(val) => navigate({ search: { tab: val as any }, replace: true })}
        className="w-full"
      >
        <div className="flex items-center justify-between border-b border-border pb-1">
          <TabsList className="bg-transparent h-auto p-0 gap-6 overflow-x-auto no-scrollbar">
            <TabsTrigger 
              value="flashcards"
              className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 py-2 h-auto whitespace-nowrap"
            >
              <Layers className="mr-2 h-4 w-4" /> Flashcards
              <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                {unlinkedFlashcards.length}
              </span>
            </TabsTrigger>
            <TabsTrigger 
              value="decks"
              className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 py-2 h-auto whitespace-nowrap"
            >
              <Layers className="mr-2 h-4 w-4" /> Baralhos
              <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                {decks.length}
              </span>
            </TabsTrigger>
            <TabsTrigger 
              value="questions"
              className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 py-2 h-auto whitespace-nowrap"
            >
              <ListChecks className="mr-2 h-4 w-4" /> Questões
              <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                {unlinkedQuestions.length}
              </span>
            </TabsTrigger>
            <TabsTrigger 
              value="exams"
              className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 py-2 h-auto whitespace-nowrap"
            >
              <GraduationCap className="mr-2 h-4 w-4" /> Simulados
              <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                {activeExams.length}
              </span>
            </TabsTrigger>
            <TabsTrigger 
              value="materials"
              className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 py-2 h-auto whitespace-nowrap"
            >
              <ExternalLink className="mr-2 h-4 w-4" /> Materiais
              <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                {unlinkedMaterials.length}
              </span>
            </TabsTrigger>
          </TabsList>

          <div className="hidden sm:flex items-center gap-2">
            {tab === "flashcards" && (
              <Button onClick={() => setFlashcardFormOpen(true)} size="sm" className="gap-2">
                <Plus className="h-4 w-4" /> Novo flashcard
              </Button>
            )}
            {tab === "decks" && (
              <Button onClick={() => setDeckFormOpen(true)} size="sm" className="gap-2">
                <Plus className="h-4 w-4" /> Novo baralho
              </Button>
            )}
            {tab === "questions" && (
              <Button onClick={() => setQuestionFormOpen(true)} size="sm" className="gap-2">
                <Plus className="h-4 w-4" /> Nova questão
              </Button>
            )}
            {tab === "exams" && (
              <Button onClick={() => setExamFormOpen(true)} size="sm" className="gap-2">
                <Plus className="h-4 w-4" /> Novo simulado
              </Button>
            )}
            {tab === "materials" && (
              <Button onClick={() => setMaterialFormOpen(true)} size="sm" className="gap-2">
                <Plus className="h-4 w-4" /> Novo material
              </Button>
            )}
          </div>
        </div>

        <TabsContent value="flashcards" className="pt-6">
          {filteredFlashcards.length > 0 ? (
            <FlashcardList cards={filteredFlashcards} />
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed rounded-xl">
              <Layers className="h-10 w-10 text-muted-foreground mb-4 opacity-20" />
              <p className="text-muted-foreground">Nenhum flashcard avulso encontrado.</p>
              <Button variant="link" onClick={() => setFlashcardFormOpen(true)}>Criar primeiro flashcard</Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="questions" className="pt-6">
          {filteredQuestions.length > 0 ? (
            <QuestionList questions={filteredQuestions} />
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed rounded-xl">
              <ListChecks className="h-10 w-10 text-muted-foreground mb-4 opacity-20" />
              <p className="text-muted-foreground">Nenhuma questão avulsa encontrada.</p>
              <Button variant="link" onClick={() => setQuestionFormOpen(true)}>Criar primeira questão</Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="exams" className="pt-6">
          {filteredExams.length > 0 ? (
            <ExamList 
              exams={filteredExams} 
              onStart={(exam) => navigate({ 
                to: "/app/estudar",
                search: { method: "recordacao_ativa" }
              })} 
            />
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed rounded-xl">
              <GraduationCap className="h-10 w-10 text-muted-foreground mb-4 opacity-20" />
              <p className="text-muted-foreground">Nenhum simulado avulso encontrado.</p>
              <Button variant="link" onClick={() => setExamFormOpen(true)}>Criar primeiro simulado</Button>
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="materials" className="pt-6">
          {filteredMaterials.length > 0 ? (
            <MaterialList 
              materials={filteredMaterials} 
              onEdit={(m) => setEditingMaterial(m)} 
            />
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed rounded-xl">
              <ExternalLink className="h-10 w-10 text-muted-foreground mb-4 opacity-20" />
              <p className="text-muted-foreground">Nenhum material avulso encontrado.</p>
              <Button variant="link" onClick={() => setMaterialFormOpen(true)}>Criar primeiro material</Button>
            </div>
          )}
        </TabsContent>
      </Tabs>

      <FlashcardFormDialog 
        open={flashcardFormOpen} 
        onOpenChange={setFlashcardFormOpen}
        prefill={{
          lessonId: null,
          sourceBlockId: null,
          front: "",
          frontContent: null
        }}
      />
      <QuestionFormDialog 
        open={questionFormOpen} 
        onOpenChange={setQuestionFormOpen}
        prefill={{ lessonId: null }}
      />
      <ExamFormDialog 
        open={examFormOpen} 
        onOpenChange={setExamFormOpen}
      />
      <MaterialFormDialog 
        open={materialFormOpen || !!editingMaterial} 
        onOpenChange={(open) => {
          setMaterialFormOpen(open);
          if (!open) setEditingMaterial(null);
        }}
        material={editingMaterial ?? undefined}
        prefill={{ courseId: null }}
      />
    </div>
  );
}
