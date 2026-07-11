import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useRequireSave } from "../hooks/use-require-save";
import { useStore } from "../lib/store";
import { clubById } from "../data/clubs";
import { competitionById, AWARDS } from "../data/awards";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import type { Offer, SeasonEndResult } from "../lib/sim/types";

export const Route = createFileRoute("/dashboard/season-end")({
  head: () => ({ meta: [{ title: "Akhir Musim — Become a Legend" }] }),
  component: SeasonEnd,
});

function SeasonEnd() {
  const save = useRequireSave();
  const navigate = useNavigate();
  const preview = useStore((s) => s.previewSeasonEnd);
  const confirmSeason = useStore((s) => s.confirmSeasonAndOffer);

  const [result, setResult] = useState<SeasonEndResult | null>(null);
  const [chosen, setChosen] = useState<Offer | { kind: "stay" } | null>(null);

  if (!save) return null;

  // Load result immediately without spin
  useEffect(() => {
    const r = preview(save.id);
    setResult(r);
  }, [save.id, preview]);

  const finalize = () => {
    if (!result || !chosen) return;
    confirmSeason(save.id, chosen, result);
    setResult(null); setChosen(null);
    navigate({ to: "/dashboard" });
  };

  return (
    <main className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <div className="text-xs uppercase tracking-widest text-muted-foreground">Musim {save.season.index}</div>
        <h1 className="text-3xl font-display font-extrabold">Ringkasan Akhir Musim</h1>
      </div>

      {!result && (
        <div className="text-center py-16">
          <div className="text-6xl mb-4">🏆</div>
          <p className="text-muted-foreground">Memuat ringkasan musim...</p>
        </div>
      )}

      {result && (
        <div className="space-y-4">
          <Card className="bg-card-gradient border-border/60">
            <CardContent className="p-6">
              <div className="text-xs uppercase tracking-widest text-muted-foreground">Posisi Liga</div>
              <div className="text-5xl font-display font-extrabold mt-1">
                #{result.leaguePosition}
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                {clubById(save.currentClub.clubId)?.name}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card-gradient border-border/60">
            <CardContent className="p-6">
              <h3 className="font-display font-bold mb-3">Statistik Musim Ini</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <StatBox label="Pertandingan" value={save.season.currentStats.apps} />
                <StatBox label="Gol" value={save.season.currentStats.goals} />
                <StatBox label="Assist" value={save.season.currentStats.assists} />
                <StatBox label="Rating" value={save.season.currentStats.ratingCount ? (save.season.currentStats.ratingSum / save.season.currentStats.ratingCount).toFixed(1) : '—'} />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card-gradient border-border/60">
            <CardContent className="p-6">
              <h3 className="font-display font-bold mb-3">Trofi</h3>
              {result.trophies.length === 0 ? (
                <p className="text-muted-foreground text-sm">Tidak ada trofi musim ini.</p>
              ) : (
                <div className="grid sm:grid-cols-2 gap-2">
                  {result.trophies.map((t) => (
                    <div key={t.id} className="flex items-center gap-3 bg-panel-2 rounded-lg p-3">
                      <div className="text-2xl">🏆</div>
                      <div>
                        <div className="font-medium">{competitionById(t.competitionId)?.name}</div>
                        <div className="text-xs text-muted-foreground">Musim {t.season}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-card-gradient border-border/60">
            <CardContent className="p-6">
              <h3 className="font-display font-bold mb-3">Penghargaan</h3>
              {result.awards.length === 0 ? (
                <p className="text-muted-foreground text-sm">Belum ada penghargaan musim ini.</p>
              ) : (
                <div className="grid sm:grid-cols-2 gap-2">
                  {result.awards.map((a) => {
                    const meta = AWARDS[a.awardId as keyof typeof AWARDS];
                    return (
                      <div key={a.id} className="flex items-center gap-3 bg-panel-2 rounded-lg p-3">
                        <div className="text-2xl">{meta.icon}</div>
                        <div>
                          <div className="font-medium">{meta.name}</div>
                          {a.detail && <div className="text-xs text-muted-foreground">{a.detail}</div>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-card-gradient border-border/60">
            <CardContent className="p-6">
              <h3 className="font-display font-bold mb-3">Masa depan</h3>
              <div className="grid sm:grid-cols-2 gap-3">
                <OfferCard
                  label="Bertahan (kontrak tersisa)"
                  selected={chosen && "kind" in chosen && chosen.kind === "stay"}
                  onClick={() => setChosen({ kind: "stay" })}
                  subtitle={`Kontrak sampai musim ${save.currentClub.contractUntilSeason}`}
                  clubId={save.currentClub.clubId}
                />
                {result.renewal && (
                  <OfferCard
                    label="Perpanjang kontrak"
                    selected={chosen && "id" in chosen && chosen.id === result.renewal.id}
                    onClick={() => setChosen(result.renewal!)}
                    subtitle={`€${result.renewal.wage}k/pekan • ${result.renewal.years} tahun`}
                    clubId={result.renewal.clubId}
                  />
                )}
                {result.offers.map((o) => (
                  <OfferCard
                    key={o.id}
                    label="Tawaran transfer"
                    selected={chosen && "id" in chosen && chosen.id === o.id}
                    onClick={() => setChosen(o)}
                    subtitle={`€${o.fee}jt • €${o.wage}k/pekan • ${o.years} tahun`}
                    clubId={o.clubId}
                  />
                ))}
              </div>
              <div className="mt-6 flex justify-center gap-3">
                <Button onClick={finalize} disabled={!chosen}>Konfirmasi & Lanjut Musim {save.season.index + 1}</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </main>
  );
}

function OfferCard({ label, subtitle, clubId, selected, onClick }: {
  label: string; subtitle: string; clubId: string; selected: boolean | null; onClick: () => void;
}) {
  const c = clubById(clubId)!;
  return (
    <button onClick={onClick}
      className={`text-left rounded-lg border p-3 flex items-center gap-3 transition-all ${
        selected ? "border-primary bg-panel-2" : "border-border hover:bg-accent"
      }`}
    >
      <div className="w-10 h-10 rounded-md flex items-center justify-center font-display font-bold text-sm"
        style={{ backgroundColor: c.colors[0], color: c.colors[1] }}>
        {c.short}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs uppercase tracking-widest text-muted-foreground">{label}</div>
        <div className="font-medium truncate">{c.name}</div>
        <div className="text-xs text-muted-foreground">{subtitle}</div>
      </div>
    </button>
  );
}

function StatBox({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="bg-panel-2 rounded-lg p-3 text-center">
      <div className="text-2xl font-display font-bold">{value}</div>
      <div className="text-xs text-muted-foreground uppercase tracking-wider mt-1">{label}</div>
    </div>
  );
}
