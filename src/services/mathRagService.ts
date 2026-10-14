/**
 * Rankify.AI: Mathematics RAG Service
 * Provides LaTeX-preserving semantic chunking and mathematical concept unit segmentation.
 */

export interface MathChunkOptions {
  maxChunkSize?: number;
  minChunkSize?: number;
  overlap?: number;
}

const DEFAULT_OPTIONS: Required<MathChunkOptions> = {
  maxChunkSize: 1800,
  minChunkSize: 400,
  overlap: 120,
};

// Pola struktur matematis dan materi pelajaran
const CONCEPT_HEADER_PATTERN =
  /(?:^|\n)(?=(?:BAB\s+[0-9IVXLCDM]+|Bab\s+[0-9]+|Definisi\s*[0-9.]*|Teorema\s*[0-9.]*|Sifat[\s-]*sifat|Sifat\s*[0-9.]*|Rumus\s*[0-9.]*|Contoh\s*(?:Soal)?\s*[0-9.]*|Penyelesaian|Solusi|Latihan\s*(?:Soal)?\s*[0-9.]*|Soal\s*[0-9.]*):?[\s\n])/i;

/**
 * Memeriksa apakah teks mengandung ekspresi matematika LaTeX atau simbol matematis.
 */
export function containsMathFormulas(text: string): boolean {
  if (!text) return false;
  // Deteksi inline math $...$, display math $$...$$, atau environment \begin{...}
  const hasLatex = /\$[^$]+\$|\$\$[\s\S]+?\$\$|\\begin\{[a-zA-Z*]+\}[\s\S]+?\\end\{[a-zA-Z*]+\}/.test(text);
  if (hasLatex) return true;
  // Deteksi simbol matematika umum
  const mathSymbols = /[∑∫√±×÷≠≤≥≈∞∈∉⊂⊆∪∩∂∇θπλ]/;
  return mathSymbols.test(text);
}

/**
 * Masking blok formula matematika sebelum pemisahan teks agar formula tidak terpotong.
 */
function protectMathFormulas(text: string): { protectedText: string; restore: (str: string) => string } {
  const placeholders = new Map<string, string>();
  let counter = 0;

  // 1. Lindungi blok display environment \begin{...}...\end{...}
  let protectedText = text.replace(/\\begin\{([a-zA-Z*]+)\}[\s\S]*?\\end\{\1\}/g, (match) => {
    const key = `@@MATH_ENV_${counter++}@@`;
    placeholders.set(key, match);
    return key;
  });

  // 2. Lindungi blok display formula $$...$$
  protectedText = protectedText.replace(/\$\$[\s\S]*?\$\$/g, (match) => {
    const key = `@@MATH_BLOCK_${counter++}@@`;
    placeholders.set(key, match);
    return key;
  });

  // 3. Lindungi blok inline formula $...$
  protectedText = protectedText.replace(/\$([^\$\n]+?)\$/g, (match) => {
    const key = `@@MATH_INLINE_${counter++}@@`;
    placeholders.set(key, match);
    return key;
  });

  const restore = (str: string): string => {
    let result = str;
    for (const [key, value] of placeholders.entries()) {
      result = result.replaceAll(key, value);
    }
    return result;
  };

  return { protectedText, restore };
}

/**
 * Memecah teks dokumen matematika menjadi chunk semantik yang aman terhadap formula LaTeX.
 * Mempertahankan keutuhan definisi, teorema, dan pasangan Contoh Soal + Penyelesaian.
 */
export function chunkMathContent(text: string, options: MathChunkOptions = {}): string[] {
  const trimmed = text.trim();
  if (!trimmed) return [];

  const { maxChunkSize, minChunkSize, overlap } = { ...DEFAULT_OPTIONS, ...options };

  // Bila panjang teks masih dalam batas maksimum satu chunk, kembalikan langsung
  if (trimmed.length <= maxChunkSize) {
    return [trimmed];
  }

  // 1. Lindungi formula matematika agar tidak terpotong saat pemisahan
  const { protectedText, restore } = protectMathFormulas(trimmed);

  // 2. Bagi teks berdasarkan boundary konsep/bab/contoh soal
  const rawSections = protectedText
    .split(CONCEPT_HEADER_PATTERN)
    .map((s) => s.trim())
    .filter(Boolean);

  // Bila tidak ada header konsep terdeteksi, bagi berdasarkan paragraf (\n\n+)
  const sections = rawSections.length > 0 ? rawSections : protectedText.split(/\n{2,}/).map((s) => s.trim()).filter(Boolean);

  const chunks: string[] = [];
  let currentChunk = "";

  for (const section of sections) {
    // Jika bagian ini sendiri melebihi maxChunkSize, kita pecah lagi berdasarkan paragraf atau kalimat
    if (section.length > maxChunkSize) {
      if (currentChunk) {
        chunks.push(restore(currentChunk.trim()));
        currentChunk = "";
      }

      const paragraphs = section.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
      for (const paragraph of paragraphs) {
        if (paragraph.length > maxChunkSize) {
          // Pecah berdasarkan kalimat dengan aman
          const sentences = paragraph.split(/(?<=[.!?])\s+/).filter(Boolean);
          let sentenceBuffer = "";

          for (const sentence of sentences) {
            if (sentenceBuffer.length + sentence.length + 1 > maxChunkSize) {
              if (sentenceBuffer) {
                chunks.push(restore(sentenceBuffer.trim()));
                sentenceBuffer = "";
              }
              // Jika satu kalimat saja masih lebih besar dari maxChunkSize, potong di batas spasi
              if (sentence.length > maxChunkSize) {
                const words = sentence.split(/\s+/);
                let wordBuffer = "";
                for (const word of words) {
                  if (wordBuffer.length + word.length + 1 > maxChunkSize) {
                    chunks.push(restore(wordBuffer.trim()));
                    wordBuffer = word;
                  } else {
                    wordBuffer = wordBuffer ? `${wordBuffer} ${word}` : word;
                  }
                }
                if (wordBuffer) sentenceBuffer = wordBuffer;
              } else {
                sentenceBuffer = sentence;
              }
            } else {
              sentenceBuffer = sentenceBuffer ? `${sentenceBuffer} ${sentence}` : sentence;
            }
          }
          if (sentenceBuffer) {
            currentChunk = sentenceBuffer;
          }
        } else {
          if (currentChunk && currentChunk.length + paragraph.length + 2 > maxChunkSize) {
            chunks.push(restore(currentChunk.trim()));
            currentChunk = paragraph;
          } else {
            currentChunk = currentChunk ? `${currentChunk}\n\n${paragraph}` : paragraph;
          }
        }
      }
    } else {
      // Periksa apakah menggabungkan section ini akan melebihi maxChunkSize
      if (currentChunk && currentChunk.length + section.length + 2 > maxChunkSize) {
        chunks.push(restore(currentChunk.trim()));

        // Tambahkan konteks overlap jika memungkinkan (mengambil akhir chunk sebelumnya)
        if (overlap > 0 && currentChunk.length > overlap) {
          const overlapText = currentChunk.slice(-overlap).trim();
          currentChunk = `${overlapText}\n\n${section}`;
        } else {
          currentChunk = section;
        }
      } else {
        currentChunk = currentChunk ? `${currentChunk}\n\n${section}` : section;
      }
    }
  }

  if (currentChunk.trim()) {
    chunks.push(restore(currentChunk.trim()));
  }

  // Final check: pastikan tidak ada chunk kosong dan semua formula dipulihkan
  return chunks.map((c) => c.trim()).filter((c) => c.length > 0);
}

export interface MathValidationResult {
  isValid: boolean;
  formulaCount: number;
  warning?: string;
}

/**
 * Memvalidasi keseimbangan sintaks formula matematika (dollar sign, environment) dalam teks.
 */
export function validateMathSyntax(text: string): MathValidationResult {
  if (!text) return { isValid: true, formulaCount: 0 };

  // Hitung inline dan display math
  const displayMatches = text.match(/\$\$[\s\S]*?\$\$/g) || [];
  const textWithoutDisplay = text.replace(/\$\$[\s\S]*?\$\$/g, "");
  const inlineMatches = textWithoutDisplay.match(/\$([^\$\n]+?)\$/g) || [];
  const formulaCount = displayMatches.length + inlineMatches.length;

  // Cek jika jumlah karakter '$' ganjil (tanda dollar tidak tertutup)
  const dollarCount = (text.match(/\$/g) || []).length;
  if (dollarCount % 2 !== 0) {
    return {
      isValid: false,
      formulaCount,
      warning: "Tanda dollar ($) tidak seimbang. Ada formula yang belum tertutup.",
    };
  }

  // Cek keseimbangan \begin{env} dan \end{env}
  const begins = (text.match(/\\begin\{([a-zA-Z*]+)\}/g) || []).map((m) => m.slice(7, -1));
  const ends = (text.match(/\\end\{([a-zA-Z*]+)\}/g) || []).map((m) => m.slice(5, -1));
  if (begins.length !== ends.length) {
    return {
      isValid: false,
      formulaCount,
      warning: `Environment LaTeX tidak seimbang (${begins.length} \\begin vs ${ends.length} \\end).`,
    };
  }

  return { isValid: true, formulaCount };
}

export interface MultiPageInput {
  page: number;
  text: string;
}

export interface ChunkedPageOutput {
  page_number: number;
  content: string;
}

/**
 * Melakukan chunking multi-halaman dengan membawa buffer kontinuitas (cross-page overlap)
 * jika suatu halaman berakhir tanpa tanda baca final atau di tengah pengerjaan soal/formula.
 */
export function chunkMultiPageDocument(
  pages: MultiPageInput[],
  options: MathChunkOptions = {}
): ChunkedPageOutput[] {
  const result: ChunkedPageOutput[] = [];
  let carryOverContext = "";

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    const pageText = page.text.trim();
    if (!pageText) continue;

    // Tambahkan carry-over dari halaman sebelumnya jika ada
    const fullTextForPage = carryOverContext
      ? `[Lanjutan Halaman ${pages[i - 1].page}]:\n${carryOverContext}\n\n${pageText}`
      : pageText;

    // Lakukan chunking pada halaman ini
    const pageChunks = chunkMathContent(fullTextForPage, options);
    for (const chunk of pageChunks) {
      result.push({
        page_number: page.page,
        content: chunk,
      });
    }

    // Periksa apakah halaman ini berakhir di tengah kalimat/formula
    const endsWithTerminal = /[.!?:]\s*$/.test(pageText) || pageText.endsWith("$$");
    if (!endsWithTerminal && pageText.length > 50) {
      // Ambil kalimat atau baris terakhir (maksimal 160 karakter) sebagai buffer kontinuitas
      const lastLine = pageText.split("\n").filter(Boolean).pop() || "";
      carryOverContext = lastLine.length > 160 ? lastLine.slice(-160) : lastLine;
    } else {
      carryOverContext = "";
    }
  }

  return result;
}

