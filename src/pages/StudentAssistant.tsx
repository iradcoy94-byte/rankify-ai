import { AssistantChatSurface } from "@/components/AIAssistant";
import { useStudentsCtx } from "@/context/StudentsContext";

export default function StudentAssistant() {
  const { students } = useStudentsCtx();

  return (
    <div className="h-[calc(100vh-73px)] min-h-[520px]">
      <AssistantChatSurface students={students} fullPage />
    </div>
  );
}
