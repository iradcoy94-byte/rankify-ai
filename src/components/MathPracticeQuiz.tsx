import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Award,
  BookOpen,
  CheckCircle2,
  HelpCircle,
  Loader2,
  RefreshCw,
  Sparkles,
  XCircle,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { MathMessageContent } from "@/components/AIAssistant";
import { supabase } from "@/integrations/supabase/client";

export interface QuizOption {
  id: string; // "A" | "B" | "C" | "D"
  text: string;
}

export interface QuizQuestion {
  id: number;
  question: string;
  options: QuizOption[];
  correctAnswer: string;
  explanation: string;
  topic?: string;
}

export const DEFAULT_QUIZ_BANKS: Record<string, QuizQuestion[]> = {
  "Persamaan & Fungsi Kuadrat": [
    {
      id: 1,
      question: "Tentukan himpunan penyelesaian dari persamaan kuadrat $x^2 - 5x + 6 = 0$.",
      options: [
        { id: "A", text: "$\\{x = 2 \\text{ atau } x = 3\\}$" },
        { id: "B", text: "$\\{x = -2 \\text{ atau } x = -3\\}$" },
        { id: "C", text: "$\\{x = 1 \\text{ atau } x = 6\\}$" },
        { id: "D", text: "$\\{x = -1 \\text{ atau } x = -6\\}$" },
      ],
      correctAnswer: "A",
      explanation:
        "Faktorkan persamaan kuadrat:\n$$x^2 - 5x + 6 = (x - 2)(x - 3) = 0$$\nMaka diperoleh akar-akar $x = 2$ atau $x = 3$.",
      topic: "Persamaan & Fungsi Kuadrat",
    },
    {
      id: 2,
      question: "Nilai diskriminan ($D$) dari fungsi kuadrat $f(x) = 2x^2 - 4x + 1$ adalah...",
      options: [
        { id: "A", text: "$D = 8$" },
        { id: "B", text: "$D = 24$" },
        { id: "C", text: "$D = -8$" },
        { id: "D", text: "$D = 12$" },
      ],
      correctAnswer: "A",
      explanation:
        "Rumus diskriminan adalah $D = b^2 - 4ac$.\nDiketahui $a = 2$, $b = -4$, $c = 1$.\n$$D = (-4)^2 - 4(2)(1) = 16 - 8 = 8$$\nKarena $D > 0$, kurva memotong sumbu-$x$ di dua titik berlainan.",
      topic: "Persamaan & Fungsi Kuadrat",
    },
    {
      id: 3,
      question: "Koordinat titik balik/puncak dari grafik parabola $y = x^2 - 6x + 5$ adalah...",
      options: [
        { id: "A", text: "$(3, -4)$" },
        { id: "B", text: "$(3, 4)$" },
        { id: "C", text: "$(-3, -4)$" },
        { id: "D", text: "$(6, 5)$" },
      ],
      correctAnswer: "A",
      explanation:
        "Sumbu simetri:\n$$x_p = -\\frac{b}{2a} = -\\frac{-6}{2(1)} = 3$$\nSubstitusikan $x_p = 3$ ke fungsi kuadrat:\n$$y_p = (3)^2 - 6(3) + 5 = 9 - 18 + 5 = -4$$\nJadi koordinat puncak adalah $(3, -4)$.",
      topic: "Persamaan & Fungsi Kuadrat",
    },
  ],
  Trigonometri: [
    {
      id: 1,
      question: "Berapakah nilai dari $\\sin(30^\\circ) + \\cos(60^\\circ)$?",
      options: [
        { id: "A", text: "$1$" },
        { id: "B", text: "$\\frac{1}{2}$" },
        { id: "C", text: "$\\sqrt{3}$" },
        { id: "D", text: "$\\frac{1}{2}\\sqrt{3}$" },
      ],
      correctAnswer: "A",
      explanation:
        "Nilai sudut istimewa:\n$$\\sin(30^\\circ) = \\frac{1}{2}, \\quad \\cos(60^\\circ) = \\frac{1}{2}$$\nMaka:\n$$\\frac{1}{2} + \\frac{1}{2} = 1$$",
      topic: "Trigonometri",
    },
    {
      id: 2,
      question: "Bentuk sederhana dari identitas $(\\sin x + \\cos x)^2 - 2\\sin x \\cos x$ adalah...",
      options: [
        { id: "A", text: "$1$" },
        { id: "B", text: "$\\sin^2 x$" },
        { id: "C", text: "$0$" },
        { id: "D", text: "$2$" },
      ],
      correctAnswer: "A",
      explanation:
        "Jabarkan kuadrat suku dua:\n$$(\\sin x + \\cos x)^2 = \\sin^2 x + 2\\sin x \\cos x + \\cos^2 x$$\nKurangkan dengan $2\\sin x \\cos x$:\n$$\\sin^2 x + \\cos^2 x = 1$$ (Identitas Pythagoras Trigonometri).",
      topic: "Trigonometri",
    },
    {
      id: 3,
      question: "Jika $\\tan \\theta = \\frac{3}{4}$ dan $\\theta$ berada di kuadran I, maka nilai $\\cos \\theta$ adalah...",
      options: [
        { id: "A", text: "$\\frac{4}{5}$" },
        { id: "B", text: "$\\frac{3}{5}$" },
        { id: "C", text: "$\\frac{5}{4}$" },
        { id: "D", text: "$\\frac{5}{3}$" },
      ],
      correctAnswer: "A",
      explanation:
        "Diketahui $\\tan \\theta = \\frac{\\text{depan}}{\\text{samping}} = \\frac{3}{4}$.\nSisi miring $r = \\sqrt{3^2 + 4^2} = \\sqrt{25} = 5$.\nMaka $\\cos \\theta = \\frac{\\text{samping}}{\\text{miring}} = \\frac{4}{5}$.",
      topic: "Trigonometri",
    },
  ],
  "Turunan & Kalkulus Dasar": [
    {
      id: 1,
      question: "Turunan pertama dari fungsi $f(x) = 3x^3 - 5x^2 + 4x - 7$ adalah...",
      options: [
        { id: "A", text: "$f'(x) = 9x^2 - 10x + 4$" },
        { id: "B", text: "$f'(x) = 9x^2 - 10x$" },
        { id: "C", text: "$f'(x) = 6x^2 - 5x + 4$" },
        { id: "D", text: "$f'(x) = 9x^3 - 10x^2 + 4x$" },
      ],
      correctAnswer: "A",
      explanation:
        "Aturan turunan polinomial $\\frac{d}{dx}[a x^n] = a \\cdot n x^{n-1}$:\n- $\\frac{d}{dx}(3x^3) = 9x^2$\n- $\\frac{d}{dx}(-5x^2) = -10x$\n- $\\frac{d}{dx}(4x) = 4$\n- $\\frac{d}{dx}(-7) = 0$\nJadi $f'(x) = 9x^2 - 10x + 4$.",
      topic: "Turunan & Kalkulus Dasar",
    },
    {
      id: 2,
      question: "Hasil dari integral tak tentu $\\int (6x^2 - 4x + 3)\\,dx$ adalah...",
      options: [
        { id: "A", text: "$2x^3 - 2x^2 + 3x + C$" },
        { id: "B", text: "$3x^3 - 4x^2 + 3x + C$" },
        { id: "C", text: "$12x - 4 + C$" },
        { id: "D", text: "$2x^3 - 4x^2 + C$" },
      ],
      correctAnswer: "A",
      explanation:
        "Gunakan rumus $\\int x^n \\,dx = \\frac{x^{n+1}}{n+1} + C$:\n$$\\int 6x^2\\,dx = 2x^3$$\n$$\\int -4x\\,dx = -2x^2$$\n$$\\int 3\\,dx = 3x$$\nJadi hasilnya adalah $2x^3 - 2x^2 + 3x + C$.",
      topic: "Turunan & Kalkulus Dasar",
    },
    {
      id: 3,
      question: "Fungsi $f(x) = x^2 - 4x + 6$ memiliki nilai minimum sebesar...",
      options: [
        { id: "A", text: "$2$" },
        { id: "B", text: "$-2$" },
        { id: "C", text: "$4$" },
        { id: "D", text: "$6$" },
      ],
      correctAnswer: "A",
      explanation:
        "Cari titik stasioner saat $f'(x) = 0$:\n$$f'(x) = 2x - 4 = 0 \\implies x = 2$$\nNilai minimum didapat dengan mensubstitusi $x = 2$:\n$$f(2) = (2)^2 - 4(2) + 6 = 4 - 8 + 6 = 2$$.",
      topic: "Turunan & Kalkulus Dasar",
    },
  ],
};

interface MathPracticeQuizProps {
  initialTopic?: string;
  onFinished?: (score: number, total: number) => void;
}

export function MathPracticeQuiz({ initialTopic, onFinished }: MathPracticeQuizProps) {
  const topics = Object.keys(DEFAULT_QUIZ_BANKS);
  const [selectedTopic, setSelectedTopic] = useState<string>(
    initialTopic && topics.includes(initialTopic) ? initialTopic : topics[0]
  );
  const [dbMaterials, setDbMaterials] = useState<{ id: string; title: string }[]>([]);
  const [questions, setQuestions] = useState<QuizQuestion[]>(
    DEFAULT_QUIZ_BANKS[selectedTopic] ?? []
  );
  const [userAnswers, setUserAnswers] = useState<Record<number, string>>({});
  const [isGenerating, setIsGenerating] = useState(false);

  // Load uploaded approved materials from database if available
  useEffect(() => {
    async function loadMaterials() {
      try {
        const { data } = await supabase
          .from("learning_materials")
          .select("id, title")
          .eq("review_status", "approved")
          .limit(5);
        if (data && data.length > 0) {
          setDbMaterials(data);
        }
      } catch {
        // Fallback gracefully to default topics
      }
    }
    void loadMaterials();
  }, []);

  const handleSelectTopic = (topic: string) => {
    setSelectedTopic(topic);
    setUserAnswers({});
    if (DEFAULT_QUIZ_BANKS[topic]) {
      setQuestions(DEFAULT_QUIZ_BANKS[topic]);
    }
  };

  const handleSelectAnswer = (questionId: number, optionId: string) => {
    if (userAnswers[questionId]) return; // Answer locked once chosen
    const nextAnswers = { ...userAnswers, [questionId]: optionId };
    setUserAnswers(nextAnswers);

    // If all questions are answered, notify parent
    if (Object.keys(nextAnswers).length === questions.length && onFinished) {
      let correct = 0;
      questions.forEach((q) => {
        if (nextAnswers[q.id] === q.correctAnswer) correct++;
      });
      const finalScore = Math.round((correct / questions.length) * 100);
      onFinished(finalScore, questions.length);
    }
  };

  const handleResetQuiz = () => {
    setUserAnswers({});
  };

  const handleGenerateNewQuiz = () => {
    setIsGenerating(true);
    setTimeout(() => {
      setUserAnswers({});
      // Pick questions or shuffle
      const bank = DEFAULT_QUIZ_BANKS[selectedTopic] || DEFAULT_QUIZ_BANKS[topics[0]];
      const shuffled = [...bank].sort(() => Math.random() - 0.5);
      setQuestions(shuffled);
      setIsGenerating(false);
    }, 400);
  };

  const answeredCount = Object.keys(userAnswers).length;
  const totalQuestions = questions.length;
  const progressPercentage = (answeredCount / totalQuestions) * 100;

  const correctCount = questions.reduce(
    (count, q) => (userAnswers[q.id] === q.correctAnswer ? count + 1 : count),
    0
  );
  const isComplete = answeredCount === totalQuestions;
  const scorePercent = isComplete ? Math.round((correctCount / totalQuestions) * 100) : 0;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Quiz Header & Topic Switcher */}
      <div className="rounded-2xl border border-border bg-card/60 p-5 shadow-sm backdrop-blur-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Zap className="h-4 w-4" />
              </span>
              <h3 className="text-xl font-bold tracking-tight">Kuis Latihan Mandiri (AI Quiz)</h3>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Uji pemahaman konsep matematika dengan 3 soal pilihan ganda berorientasi formula LaTeX.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleGenerateNewQuiz}
              disabled={isGenerating}
              className="gap-1.5 text-xs font-medium"
            >
              {isGenerating ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" />
              )}
              Soal Baru
            </Button>
          </div>
        </div>

        {/* Topic Pills */}
        <div className="mt-4 flex flex-wrap items-center gap-1.5 border-t border-border/50 pt-3">
          <span className="text-xs font-medium text-muted-foreground mr-1 flex items-center gap-1">
            <BookOpen className="h-3.5 w-3.5" /> Topik:
          </span>
          {topics.map((t) => (
            <button
              key={t}
              onClick={() => handleSelectTopic(t)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-smooth ${
                selectedTopic === t
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-secondary/70 text-secondary-foreground hover:bg-secondary"
              }`}
            >
              {t}
            </button>
          ))}
          {dbMaterials.map((m) => (
            <button
              key={m.id}
              onClick={() => handleSelectTopic(m.title)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-smooth ${
                selectedTopic === m.title
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-secondary/70 text-secondary-foreground hover:bg-secondary"
              }`}
            >
              📄 {m.title}
            </button>
          ))}
        </div>

        {/* Progress bar */}
        <div className="mt-4 space-y-1.5">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>
              Progres: {answeredCount} dari {totalQuestions} Soal
            </span>
            <span>{Math.round(progressPercentage)}%</span>
          </div>
          <Progress value={progressPercentage} className="h-2" />
        </div>
      </div>

      {/* Completion Banner */}
      <AnimatePresence>
        {isComplete && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={`rounded-2xl border p-5 text-center shadow-md ${
              scorePercent >= 70
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-950 dark:text-emerald-100"
                : "border-amber-500/30 bg-amber-500/10 text-amber-950 dark:text-amber-100"
            }`}
          >
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-background shadow-inner">
              <Award
                className={`h-6 w-6 ${scorePercent >= 70 ? "text-emerald-500" : "text-amber-500"}`}
              />
            </div>
            <h4 className="text-xl font-bold">
              {scorePercent >= 70 ? "Capaian Luar Biasa! 🎉" : "Terus Berlatih & Tingkatkan! 💪"}
            </h4>
            <p className="mt-1 text-sm font-semibold">
              Skor Anda: <span className="text-lg font-bold">{scorePercent}/100</span> (
              {correctCount} dari {totalQuestions} benar)
            </p>
            <p className="mt-1 text-xs opacity-90 max-w-lg mx-auto">
              {scorePercent === 100
                ? "Semua jawaban Anda tepat! Pemahaman konsep rumus dan komputasi matematika Anda sangat solid."
                : scorePercent >= 70
                ? "Bagus sekali! Perhatikan pembahasan pada soal yang belum tepat untuk memantapkan pemahaman."
                : "Jangan berkecil hati. Pelajari langkah-langkah pembahasan pada tiap soal, lalu coba lagi!"}
            </p>
            <div className="mt-4 flex justify-center gap-3">
              <Button size="sm" variant="outline" onClick={handleResetQuiz}>
                Coba Lagi Soal Ini
              </Button>
              <Button size="sm" variant="hero" onClick={handleGenerateNewQuiz}>
                <Sparkles className="h-3.5 w-3.5" />
                Latihan Topik Lain
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Quiz Questions List */}
      <div className="space-y-6">
        {questions.map((q, qIndex) => {
          const selectedAnswer = userAnswers[q.id];
          const isAnswered = selectedAnswer !== undefined;
          const isCorrect = selectedAnswer === q.correctAnswer;

          return (
            <motion.div
              key={q.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: qIndex * 0.1 }}
              className={`rounded-2xl border bg-card p-5 shadow-card-soft transition-smooth ${
                isAnswered
                  ? isCorrect
                    ? "border-emerald-500/40 shadow-emerald-500/5"
                    : "border-destructive/40 shadow-destructive/5"
                  : "border-border hover:border-primary/30"
              }`}
            >
              {/* Question header */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="font-mono text-xs">
                    Soal {qIndex + 1}
                  </Badge>
                  {isAnswered && (
                    <Badge
                      className={
                        isCorrect
                          ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                          : "bg-destructive/15 text-destructive border-destructive/30"
                      }
                    >
                      {isCorrect ? (
                        <span className="flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" /> Benar (+33 Poin)
                        </span>
                      ) : (
                        <span className="flex items-center gap-1">
                          <XCircle className="h-3 w-3" /> Kurang Tepat
                        </span>
                      )}
                    </Badge>
                  )}
                </div>
              </div>

              {/* Question text with LaTeX support */}
              <div className="mt-3 text-sm font-medium leading-relaxed text-foreground">
                <MathMessageContent text={q.question} isUser={false} />
              </div>

              {/* Options */}
              <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
                {q.options.map((opt) => {
                  const isSelected = selectedAnswer === opt.id;
                  const isThisCorrect = opt.id === q.correctAnswer;

                  let optionStyle =
                    "border-border/70 bg-background/60 hover:bg-primary/5 hover:border-primary/40 text-foreground";

                  if (isAnswered) {
                    if (isThisCorrect) {
                      optionStyle =
                        "border-emerald-500 bg-emerald-500/15 text-emerald-900 dark:text-emerald-100 font-semibold ring-1 ring-emerald-500";
                    } else if (isSelected) {
                      optionStyle =
                        "border-destructive bg-destructive/15 text-destructive font-semibold";
                    } else {
                      optionStyle = "opacity-50 border-border/40 bg-muted/20 text-muted-foreground";
                    }
                  }

                  return (
                    <button
                      key={opt.id}
                      type="button"
                      disabled={isAnswered}
                      onClick={() => handleSelectAnswer(q.id, opt.id)}
                      className={`flex items-center gap-3 rounded-xl border p-3 text-left text-sm transition-all ${optionStyle}`}
                    >
                      <span
                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-xs font-bold transition-all ${
                          isAnswered && isThisCorrect
                            ? "bg-emerald-500 text-white"
                            : isAnswered && isSelected
                            ? "bg-destructive text-white"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {opt.id}
                      </span>
                      <div className="flex-1 overflow-x-auto">
                        <MathMessageContent text={opt.text} isUser={false} />
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Explanation Reveal */}
              {isAnswered && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="mt-4 rounded-xl border border-primary/20 bg-primary/5 p-3.5 text-xs text-foreground"
                >
                  <div className="mb-1.5 flex items-center gap-1.5 font-semibold text-primary">
                    <HelpCircle className="h-3.5 w-3.5" />
                    Pembahasan & Langkah Penyelesaian:
                  </div>
                  <MathMessageContent text={q.explanation} isUser={false} />
                </motion.div>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
