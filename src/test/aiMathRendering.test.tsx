import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MathMessageContent } from "@/components/AIAssistant";

describe("AIAssistant — MathMessageContent Rendering", () => {
  it("merender teks biasa tanpa tanda dollar secara normal", () => {
    const { container } = render(<MathMessageContent text="Halo siswa, apa yang ingin ditanyakan?" isUser={false} />);
    expect(screen.getByText("Halo siswa, apa yang ingin ditanyakan?")).toBeInTheDocument();
    expect(container.querySelectorAll("code")).toHaveLength(0);
  });

  it("merender formula inline $...$ sebagai elemen code yang rapi", () => {
    const { container } = render(
      <MathMessageContent
        text={String.raw`Akar-akar persamaan kuadrat $ax^2 + bx + c = 0$ dapat dihitung dengan rumus abc.`}
        isUser={false}
      />
    );

    const codeElements = container.querySelectorAll("code");
    expect(codeElements).toHaveLength(1);
    expect(codeElements[0].textContent).toBe(String.raw`ax^2 + bx + c = 0`);
    expect(screen.getByText(/Akar-akar persamaan kuadrat/)).toBeInTheDocument();
  });

  it("merender formula display $$...$$ sebagai kartu rumus terpusat", () => {
    const { container } = render(
      <MathMessageContent
        text={String.raw`Rumus turunan fungsi komposisi (aturan rantai):
$$(f \circ g)'(x) = f'(g(x)) \cdot g'(x)$$
Perhatikan aturan di atas.`}
        isUser={false}
      />
    );

    const displayBlock = screen.getByText("Rumus Matematika");
    expect(displayBlock).toBeInTheDocument();

    const codeElements = container.querySelectorAll("code");
    expect(codeElements).toHaveLength(1);
    expect(codeElements[0].textContent).toBe(String.raw`(f \circ g)'(x) = f'(g(x)) \cdot g'(x)`);
  });

  it("merender teks pengguna secara langsung tanpa parsing formula khusus", () => {
    const { container } = render(
      <MathMessageContent text="Saya bingung dengan soal $2x + 5 = 15$ ini." isUser={true} />
    );
    expect(screen.getByText("Saya bingung dengan soal $2x + 5 = 15$ ini.")).toBeInTheDocument();
    expect(container.querySelectorAll("code")).toHaveLength(0);
  });
});
