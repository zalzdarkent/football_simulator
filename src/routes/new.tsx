import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useStore } from "../lib/store";
import { COUNTRIES } from "../data/countries";
import { CLUBS, clubsByTier } from "../data/clubs";
import { POSITIONS } from "../lib/sim/types";
import type { Foot, Position } from "../lib/sim/types";
import { genInitialAttributes } from "../lib/sim/attributes";
import { mulberry32, randSeed } from "../lib/sim/rng";
import { PlayerCard } from "../components/PlayerCard";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";

export const Route = createFileRoute("/new")({
  head: () => ({ meta: [{ title: "Buat Pemain Baru — Become a Legend" }] }),
  component: NewCareer,
});

function NewCareer() {
  const navigate = useNavigate();
  const createSave = useStore((s) => s.createSave);

  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [countryCode, setCountryCode] = useState("ID");
  const [age, setAge] = useState(17);
  const [height, setHeight] = useState(180);
  const [foot, setFoot] = useState<Foot>("Right");
  const [position, setPosition] = useState<Position>("ST");

  // 3 random starter clubs (tier 3-4)
  const [clubOptions] = useState(() => {
    const pool = [...clubsByTier(3), ...clubsByTier(4)];
    const seed = randSeed();
    const rng = mulberry32(seed);
    const arr = [...pool].sort(() => rng() - 0.5).slice(0, 3);
    return arr;
  });
  const [clubId, setClubId] = useState(clubOptions[0].id);

  const previewSave = useMemo(() => {
    const rng = mulberry32(1);
    const attributes = genInitialAttributes(position, age, rng);
    const club = CLUBS.find((c) => c.id === clubId)!;
    return {
      player: { name: name || "Pemain Baru", countryCode, position, age, height, foot, avatarSeed: "" },
      attributes,
      currentClub: { clubId: club.id, shirtNumber: 10, wage: 20, contractUntilSeason: 3 },
    };
  }, [name, countryCode, position, age, height, foot, clubId]);

  const submit = () => {
    if (!name.trim()) return;
    createSave({ name, countryCode, position, age, height, foot, clubId });
    navigate({ to: "/dashboard" });
  };

  return (
    <main className="max-w-6xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-display font-extrabold mb-2">Buat Pemain</h1>
      <p className="text-muted-foreground mb-8">Langkah {step} dari 3</p>

      <div className="grid lg:grid-cols-[1fr_320px] gap-8">
        <Card className="bg-card-gradient border-border/60">
          <CardContent className="p-6">
            {step === 1 && (
              <div className="space-y-5">
                <h2 className="font-display font-bold text-xl">Identitas</h2>
                <Field label="Nama pemain">
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="cth. Rizki Pratama" />
                </Field>
                <Field label="Negara">
                  <Select value={countryCode} onValueChange={setCountryCode}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {COUNTRIES.map((c) => (
                        <SelectItem key={c.code} value={c.code}>
                          {c.flag} {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <div className="grid grid-cols-3 gap-4">
                  <Field label="Umur">
                    <Input type="number" min={16} max={22} value={age}
                      onChange={(e) => setAge(Math.max(16, Math.min(22, +e.target.value || 17)))} />
                  </Field>
                  <Field label="Tinggi (cm)">
                    <Input type="number" min={160} max={205} value={height}
                      onChange={(e) => setHeight(Math.max(160, Math.min(205, +e.target.value || 180)))} />
                  </Field>
                  <Field label="Kaki dominan">
                    <Select value={foot} onValueChange={(v) => setFoot(v as Foot)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Right">Kanan</SelectItem>
                        <SelectItem value="Left">Kiri</SelectItem>
                        <SelectItem value="Both">Keduanya</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                </div>
                <div className="flex justify-end">
                  <Button onClick={() => setStep(2)} disabled={!name.trim()}>Lanjut</Button>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-5">
                <h2 className="font-display font-bold text-xl">Posisi</h2>
                <div className="grid grid-cols-5 gap-2">
                  {POSITIONS.map((p) => (
                    <button
                      key={p}
                      onClick={() => setPosition(p)}
                      className={`rounded-lg border p-3 text-center transition-all ${
                        position === p
                          ? "border-primary bg-primary text-primary-foreground shadow-md"
                          : "border-border bg-panel-2 hover:bg-accent"
                      }`}
                    >
                      <div className="font-display font-bold">{p}</div>
                    </button>
                  ))}
                </div>
                <div className="flex justify-between">
                  <Button variant="ghost" onClick={() => setStep(1)}>Kembali</Button>
                  <Button onClick={() => setStep(3)}>Lanjut</Button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-5">
                <h2 className="font-display font-bold text-xl">Klub awal</h2>
                <p className="text-sm text-muted-foreground">
                  Pilih salah satu dari 3 klub yang menawarkan kontrak untukmu.
                </p>
                <div className="grid gap-3">
                  {clubOptions.map((c) => {
                    const selected = c.id === clubId;
                    return (
                      <button
                        key={c.id}
                        onClick={() => setClubId(c.id)}
                        className={`text-left rounded-lg border p-4 flex items-center gap-4 transition-all ${
                          selected ? "border-primary bg-panel-2" : "border-border hover:bg-accent"
                        }`}
                      >
                        <div
                          className="w-12 h-12 rounded-md flex items-center justify-center font-display font-bold"
                          style={{ backgroundColor: c.colors[0], color: c.colors[1] }}
                        >
                          {c.short}
                        </div>
                        <div className="flex-1">
                          <div className="font-medium">{c.name}</div>
                          <div className="text-xs text-muted-foreground">{c.city} • Tier {c.tier} • Reputation {c.reputation}</div>
                        </div>
                        {selected && <span className="text-primary">✓</span>}
                      </button>
                    );
                  })}
                </div>
                <div className="flex justify-between">
                  <Button variant="ghost" onClick={() => setStep(2)}>Kembali</Button>
                  <Button onClick={submit}>Mulai Karier</Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div>
          <div className="text-xs uppercase tracking-widest text-muted-foreground mb-3">Preview Kartu</div>
          <PlayerCard save={previewSave} size="md" />
        </div>
      </div>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="text-xs uppercase tracking-wider text-muted-foreground mb-2 block">{label}</Label>
      {children}
    </div>
  );
}
