import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { UploadCloud } from "lucide-react";

/** Placeholder shown when no students have been added yet. */
export function EmptyState() {
  return (
    <div className="rounded-2xl border border-dashed border-border p-12 text-center">
      <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-gradient-primary shadow-elegant">
        <UploadCloud className="h-6 w-6 text-primary-foreground" />
      </div>
      <h4 className="mb-1 text-lg font-semibold">Belum ada data</h4>
      <p className="mb-4 text-sm text-muted-foreground">
        Upload gambar daftar nilai dari halaman beranda untuk mulai membuat
        peringkat.
      </p>
      <Button asChild variant="hero">
        <Link to="/">Ke Halaman Upload</Link>
      </Button>
    </div>
  );
}
