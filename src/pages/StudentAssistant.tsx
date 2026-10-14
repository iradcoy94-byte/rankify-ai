import { useState } from "react";
import { MessageCircle, Zap } from "lucide-react";
import { AssistantChatSurface } from "@/components/AIAssistant";
import { MathPracticeQuiz } from "@/components/MathPracticeQuiz";
import { useStudentsCtx } from "@/context/StudentsContext";

export default function StudentAssistant() {
  const { students } = useStudentsCtx();
  const [activeTab, setActiveTab] = useState<"chat" | "quiz">("chat");

  return (
    <div className="flex flex-col h-[calc(100vh-73px)] min-h-[520px]">
      {/* Top Mode Navigation */}
      <div className="border-b border-border bg-card/60 px-4 py-2.5 backdrop-blur-sm">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Mode Belajar:
            </span>
            <div className="flex rounded-xl border border-border bg-background p-1">
              <button
                type="button"
                onClick={() => setActiveTab("chat")}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-medium transition-smooth ${
                  activeTab === "chat"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <MessageCircle className="h-3.5 w-3.5" />
                Tanya AI Tutor
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("quiz")}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-medium transition-smooth ${
                  activeTab === "quiz"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Zap className="h-3.5 w-3.5" />
                Kuis Latihan Mandiri
              </button>
            </div>
          </div>
          <span className="hidden text-xs text-muted-foreground sm:inline-block">
            {activeTab === "chat"
              ? "Tanya soal & konsep matematika"
              : "3 soal latihan pilihan ganda"}
          </span>
        </div>
      </div>

      {/* Surface Area */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === "chat" ? (
          <AssistantChatSurface students={students} fullPage />
        ) : (
          <div className="container py-8">
            <MathPracticeQuiz />
          </div>
        )}
      </div>
    </div>
  );
}
