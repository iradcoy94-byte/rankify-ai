import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MathPracticeQuiz, DEFAULT_QUIZ_BANKS } from "@/components/MathPracticeQuiz";

describe("MathPracticeQuiz", () => {
  it("has valid questions in all default quiz banks with correct answers and explanations", () => {
    const topics = Object.keys(DEFAULT_QUIZ_BANKS);
    expect(topics.length).toBeGreaterThanOrEqual(3);

    for (const topic of topics) {
      const questions = DEFAULT_QUIZ_BANKS[topic];
      expect(questions.length).toBe(3);

      for (const q of questions) {
        expect(q.id).toBeDefined();
        expect(q.question.trim().length).toBeGreaterThan(0);
        expect(q.options.length).toBe(4);
        expect(["A", "B", "C", "D"]).toContain(q.correctAnswer);
        const hasCorrectOption = q.options.some((opt) => opt.id === q.correctAnswer);
        expect(hasCorrectOption).toBe(true);
        expect(q.explanation.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it("renders quiz header, topic selection, and first question options", () => {
    render(<MathPracticeQuiz initialTopic="Persamaan & Fungsi Kuadrat" />);

    expect(screen.getByText(/Kuis Latihan Mandiri \(AI Quiz\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Persamaan & Fungsi Kuadrat/i)).toBeInTheDocument();
    expect(screen.getByText(/Trigonometri/i)).toBeInTheDocument();
    expect(screen.getByText(/Progres: 0 dari 3 Soal/i)).toBeInTheDocument();
  });

  it("allows answering a question, provides instant feedback, and shows explanation", () => {
    render(<MathPracticeQuiz initialTopic="Persamaan & Fungsi Kuadrat" />);

    // In the first question (x^2 - 5x + 6 = 0), option A is the correct answer
    const optionAButtons = screen.getAllByRole("button").filter((btn) =>
      btn.textContent?.includes("A")
    );

    expect(optionAButtons.length).toBeGreaterThan(0);
    fireEvent.click(optionAButtons[0]);

    // Check that explanation / pembahasan appears
    expect(screen.getByText(/Pembahasan & Langkah Penyelesaian/i)).toBeInTheDocument();
    expect(screen.getByText(/Benar \(\+33 Poin\)/i)).toBeInTheDocument();
  });

  it("completes quiz and calculates final score when all questions are answered", () => {
    const onFinishedMock = vi.fn();
    render(
      <MathPracticeQuiz
        initialTopic="Persamaan & Fungsi Kuadrat"
        onFinished={onFinishedMock}
      />
    );

    // Answer all 3 questions with option A (which is the correct answer for all 3 questions in this set)
    const allOptionA = screen.getAllByRole("button").filter(
      (btn) => btn.querySelector("span")?.textContent === "A"
    );

    expect(allOptionA.length).toBe(3);
    fireEvent.click(allOptionA[0]);
    fireEvent.click(allOptionA[1]);
    fireEvent.click(allOptionA[2]);

    expect(screen.getByText(/Capaian Luar Biasa!/i)).toBeInTheDocument();
    expect(screen.getByText(/100\/100/i)).toBeInTheDocument();
    expect(onFinishedMock).toHaveBeenCalledWith(100, 3);
  });
});
