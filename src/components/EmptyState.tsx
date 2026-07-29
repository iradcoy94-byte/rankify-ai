import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { MessageCircle, UploadCloud } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

/** Placeholder shown when no students have been added yet. */
export function EmptyState() {
  const { canManageData } = useAuth();
  const Icon = canManageData ? UploadCloud : MessageCircle;

  return (
    <div className="rounded-2xl border border-dashed border-border p-12 text-center">
      <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-gradient-primary shadow-elegant">
        <Icon className="h-6 w-6 text-primary-foreground" />
      </div>
      <h4 className="mb-1 text-lg font-semibold">Belum ada data</h4>
      <p className="mb-4 text-sm text-muted-foreground">
        {canManageData
          ? "Upload gambar daftar nilai dari halaman input data untuk mulai membuat peringkat."
          : "Data peringkat akan muncul setelah guru mengunggah dan memvalidasi nilai."}
      </p>
      <Button asChild variant="hero">
        <Link to={canManageData ? "/upload" : "/"}>
          {canManageData ? "Ke Halaman Upload" : "Kembali ke AI Assistant"}
        </Link>
      </Button>
    </div>
  );
}
