import { useCallback, useRef, useState } from "react";
import { useDropzone } from "react-dropzone";
import { motion, AnimatePresence } from "framer-motion";
import {
  Image as ImageIcon,
  UploadCloud,
  Loader2,
  X,
  Camera,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { runOcr } from "@/services/ocrService";

interface UploaderProps {
  /**
   * Called with raw OCR text once recognition finishes successfully.
   * The host page is expected to APPEND (not replace) the parsed rows so
   * users can build up data from multiple photos.
   */
  onTextExtracted: (text: string) => void;
}

/**
 * Image uploader with drag & drop, camera capture, preview, and live OCR
 * progress. All OCR work goes through the ocrService — this component is UI.
 */
export function Uploader({ onTextExtracted }: UploaderProps) {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  // Hidden <input capture> opens the device camera directly on mobile.
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const acceptFile = useCallback((f: File | undefined | null) => {
    if (!f) return;
    if (!/^image\/(png|jpe?g|webp|heic|heif)$/i.test(f.type) && !f.type.startsWith("image/")) {
      toast.error("Hanya file gambar yang didukung");
      return;
    }
    setFile(f);
    setPreviewUrl(URL.createObjectURL(f));
    setProgress(0);
  }, []);

  const handleDrop = useCallback(
    (accepted: File[]) => acceptFile(accepted[0]),
    [acceptFile],
  );

  const { getRootProps, getInputProps, isDragActive, open: openFilePicker } =
    useDropzone({
      onDrop: handleDrop,
      accept: { "image/*": [] },
      multiple: false,
      disabled: isProcessing,
      noClick: false,
    });

  /** Run Tesseract OCR and forward the resulting text upstream. */
  const handleProcess = async () => {
    if (!file) return;
    setIsProcessing(true);
    setProgress(0);
    try {
      const text = await runOcr(file, setProgress);
      toast.success("OCR selesai — data ditambahkan ke tabel");
      onTextExtracted(text);
      // Reset preview so user can immediately add another photo.
      handleClear();
    } catch (err) {
      console.error(err);
      toast.error("Gagal memproses gambar");
    } finally {
      setIsProcessing(false);
    }
  };

  /** Clear the current selection. */
  const handleClear = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(null);
    setPreviewUrl(null);
    setProgress(0);
  };

  /** Trigger the device camera (mobile) or webcam (desktop, browser-dependent). */
  const handleOpenCamera = () => cameraInputRef.current?.click();

  return (
    <div className="space-y-4">
      {/* Hidden input that requests the camera directly on mobile. */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => acceptFile(e.target.files?.[0])}
      />

      <AnimatePresence mode="wait">
        {!previewUrl ? (
          <motion.div
            key="dropzone"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="space-y-3"
          >
            <div
              {...(getRootProps() as any)}
              className={`group relative cursor-pointer rounded-2xl border-2 border-dashed p-10 text-center transition-smooth ${
                isDragActive
                  ? "border-primary bg-primary/5 shadow-glow"
                  : "border-border bg-card/40 hover:border-primary/60 hover:bg-card/70"
              }`}
            >
              <input {...getInputProps()} />
              <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-gradient-primary shadow-elegant">
                <UploadCloud className="h-7 w-7 text-primary-foreground" />
              </div>
              <p className="mb-1 text-lg font-semibold">
                {isDragActive
                  ? "Lepaskan File Di Sini"
                  : "Drag & Drop Foto Daftar Nilai"}
              </p>
              <p className="text-sm text-muted-foreground">
                atau klik di sini untuk memilih file JPG/PNG
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={openFilePicker}
                className="flex-1"
              >
                <ImageIcon className="h-4 w-4" /> Pilih file
              </Button>
              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={handleOpenCamera}
                className="flex-1"
              >
                <Camera className="h-4 w-4" /> Foto kamera
              </Button>
            </div>
            <p className="text-center text-xs text-muted-foreground">
              Pastikan upload file yang <strong className="text-foreground">jelas</strong>{" "}
              agar tidak ada kekeliruan.
            </p>
          </motion.div>
        ) : (
          <motion.div
            key="preview"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="overflow-hidden rounded-2xl border border-border bg-gradient-card shadow-card-soft"
          >
            <div className="relative">
              <img
                src={previewUrl}
                alt="Preview daftar nilai"
                className="max-h-[420px] w-full object-contain bg-background/40"
              />
              {!isProcessing && (
                <button
                  onClick={handleClear}
                  className="absolute right-3 top-3 rounded-full bg-background/80 p-2 backdrop-blur transition-smooth hover:bg-destructive hover:text-destructive-foreground"
                  aria-label="Hapus gambar"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            <div className="space-y-3 p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <ImageIcon className="h-4 w-4" />
                <span className="truncate">{file?.name}</span>
              </div>

              {(isProcessing || progress > 0) && (
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">
                      {isProcessing ? "Mengenali teks…" : "Selesai"}
                    </span>
                    <span className="font-mono font-semibold text-primary">
                      {progress}%
                    </span>
                  </div>
                  <Progress value={progress} className="h-2" />
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  variant="hero"
                  size="lg"
                  onClick={handleProcess}
                  disabled={isProcessing}
                  className="flex-1"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Memproses…
                    </>
                  ) : (
                    <>
                      <Sparkle /> Mulai OCR & Tambah
                    </>
                  )}
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Tiny inline icon to avoid an extra import */
function Sparkle() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
      <path d="M12 2l1.8 5.4L19 9.2l-4.8 2.6L12 17l-2.2-5.2L5 9.2l5.2-1.8L12 2z" />
    </svg>
  );
}
