import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useRequireSave } from "../hooks/use-require-save";
import { useStore } from "../lib/store";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Card, CardContent } from "../components/ui/card";

export const Route = createFileRoute("/dashboard/settings")({
  head: () => ({ meta: [{ title: "Pengaturan — Become a Legend" }] }),
  component: Settings,
});

function Settings() {
  const save = useRequireSave();
  const navigate = useNavigate();
  const renameSave = useStore((s) => s.renameSave);
  const deleteSave = useStore((s) => s.deleteSave);
  const importSave = useStore((s) => s.importSave);

  const [name, setName] = useState(save?.player.name ?? "");
  if (!save) return null;

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(save, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${save.player.name.replace(/\s+/g, "-")}-career.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const onImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result as string);
        importSave(parsed);
        alert("Karier berhasil diimpor!");
      } catch {
        alert("File tidak valid.");
      }
    };
    reader.readAsText(file);
  };

  return (
    <main className="max-w-2xl mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-display font-extrabold">Pengaturan</h1>

      <Card className="bg-card-gradient border-border/60">
        <CardContent className="p-6 space-y-3">
          <h3 className="font-display font-bold">Ganti nama pemain</h3>
          <div className="flex gap-2">
            <Input value={name} onChange={(e) => setName(e.target.value)} />
            <Button onClick={() => renameSave(save.id, name)}>Simpan</Button>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card-gradient border-border/60">
        <CardContent className="p-6 space-y-3">
          <h3 className="font-display font-bold">Backup & pulihkan</h3>
          <p className="text-sm text-muted-foreground">
            Data karier tersimpan di browser. Ekspor untuk backup atau pindah device.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={exportJson}>Ekspor JSON</Button>
            <label className="inline-flex items-center rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium hover:bg-accent cursor-pointer">
              Impor JSON
              <input type="file" accept="application/json" className="hidden" onChange={onImport} />
            </label>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card-gradient border-destructive/40">
        <CardContent className="p-6 space-y-3">
          <h3 className="font-display font-bold text-destructive">Zona bahaya</h3>
          <Button variant="destructive" onClick={() => {
            if (confirm("Hapus karier ini secara permanen?")) {
              deleteSave(save.id);
              navigate({ to: "/" });
            }
          }}>Hapus karier ini</Button>
        </CardContent>
      </Card>
    </main>
  );
}
