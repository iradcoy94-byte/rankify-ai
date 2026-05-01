import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, X, RefreshCw, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface CameraCaptureProps {
  open: boolean;
  onClose: () => void;
  /** Called once the user confirms a captured shot. */
  onCapture: (file: File) => void;
}

/**
 * CameraCapture — opens a modal that streams the user's webcam (desktop) or
 * device camera (mobile) via getUserMedia, lets the user snap a photo, review
 * it, then either retake or confirm. The confirmed shot is returned as a File
 * so the existing OCR pipeline can consume it without changes.
 */
export function CameraCapture({ open, onClose, onCapture }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [shot, setShot] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [facing, setFacing] = useState<"user" | "environment">("environment");

  /** Stop any active media tracks. Safe to call multiple times. */
  const stopStream = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  };

  /** Request camera access and bind to <video>. */
  const startStream = async (mode: "user" | "environment") => {
    setStarting(true);
    stopStream();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: mode } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
    } catch (err) {
      console.error("getUserMedia failed:", err);
      toast.error(
        "Tidak dapat mengakses kamera. Pastikan izin kamera sudah diberikan.",
      );
      onClose();
    } finally {
      setStarting(false);
    }
  };

  // Start/stop with modal lifecycle
  useEffect(() => {
    if (open) {
      setShot(null);
      startStream(facing);
    } else {
      stopStream();
      setShot(null);
    }
    return () => stopStream();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  /** Switch front/back camera (mainly mobile). */
  const flipCamera = async () => {
    const next = facing === "environment" ? "user" : "environment";
    setFacing(next);
    await startStream(next);
  };

  /** Grab a frame from <video> to a canvas → return as data URL. */
  const takeShot = () => {
    const v = videoRef.current;
    if (!v || v.videoWidth === 0) return;
    const canvas = document.createElement("canvas");
    canvas.width = v.videoWidth;
    canvas.height = v.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(v, 0, 0);
    setShot(canvas.toDataURL("image/jpeg", 0.92));
  };

  /** Convert preview data URL → File and emit upstream. */
  const confirmShot = async () => {
    if (!shot) return;
    const blob = await (await fetch(shot)).blob();
    const file = new File([blob], `kamera-${Date.now()}.jpg`, {
      type: "image/jpeg",
    });
    onCapture(file);
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 grid place-items-center bg-background/80 p-4 backdrop-blur"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, y: 12 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, y: 12 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl overflow-hidden rounded-2xl border border-border bg-card shadow-elegant"
          >
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div className="flex items-center gap-2">
                <Camera className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold">Ambil foto daftar nilai</h3>
              </div>
              <button
                onClick={onClose}
                className="rounded-md p-1.5 text-muted-foreground transition-smooth hover:bg-secondary hover:text-foreground"
                aria-label="Tutup"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="relative aspect-video w-full bg-black">
              {/* Live preview */}
              {!shot && (
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  className="h-full w-full object-contain"
                />
              )}
              {/* Captured snapshot */}
              {shot && (
                <img
                  src={shot}
                  alt="Hasil tangkapan"
                  className="h-full w-full object-contain"
                />
              )}
              {starting && (
                <div className="absolute inset-0 grid place-items-center text-sm text-muted-foreground">
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" /> Menyalakan kamera…
                  </span>
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border bg-card/60 px-4 py-3">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={flipCamera}
                disabled={starting || !!shot}
              >
                <RefreshCw className="h-4 w-4" /> Putar kamera
              </Button>

              <div className="flex gap-2">
                {!shot ? (
                  <Button
                    type="button"
                    variant="hero"
                    onClick={takeShot}
                    disabled={starting}
                  >
                    <Camera className="h-4 w-4" /> Jepret
                  </Button>
                ) : (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShot(null)}
                    >
                      <RefreshCw className="h-4 w-4" /> Ulang
                    </Button>
                    <Button type="button" variant="hero" onClick={confirmShot}>
                      <Check className="h-4 w-4" /> Gunakan foto
                    </Button>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
