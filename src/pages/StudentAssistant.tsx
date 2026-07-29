import { AssistantChatSurface } from "@/components/AIAssistant";
import { useStudentsCtx } from "@/context/StudentsContext";

export default function StudentAssistant() {
  const { students } = useStudentsCtx();

  return (
    <div className="container flex h-[calc(100vh-96px)] min-h-[620px] flex-col py-4 md:py-6">
      <div className="mb-4">
        <h2 className="text-2xl font-bold md:text-3xl">AI Assistant Matematika</h2>
        <p className="text-sm text-muted-foreground">
          Fokus untuk tanya jawab materi dan soal matematika dengan jawaban dari API yang sama.
        </p>
      </div>
      <div className="min-h-0 flex-1 overflow-hidden rounded-2xl border border-border bg-card shadow-card-soft">
        <AssistantChatSurface students={students} />
      </div>
    </div>
  );
}
