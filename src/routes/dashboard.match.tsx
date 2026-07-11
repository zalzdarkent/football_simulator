import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRequireSave } from "../hooks/use-require-save";
import { useStore } from "../lib/store";
import { clubById } from "../data/clubs";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";

export const Route = createFileRoute("/dashboard/match")({
  head: () => ({ meta: [{ title: "Pertandingan — Become a Legend" }] }),
  component: MatchSpin,
});

function MatchSpin() {
  const save = useRequireSave();
  const navigate = useNavigate();
  const previewMatch = useStore((s) => s.previewMatch);
  const confirmMatch = useStore((s) => s.confirmMatch);

  const [spinning, setSpinning] = useState(false);
  const [preview, setPreview] = useState<ReturnType<typeof previewMatch>>(null);
  const [reveal, setReveal] = useState(0); // 0..4

  if (!save) return null;
  if (save.season.matchday >= save.season.totalMatches) {
    return (
      <main className="max-w-3xl mx-auto p-8 text-center">
        <h1 className="text-2xl font-display font-bold mb-4">Musim berakhir!</h1>
        <p className="text-muted-foreground mb-6">Saatnya melihat hasil akhir musim.</p>
        <Button onClick={() => navigate({ to: "/dashboard/season-end" })}>Ke Akhir Musim</Button>
      </main>
    );
  }

  const spin = () => {
    setSpinning(true);
    setReveal(0);
    setPreview(null);
    setTimeout(() => {
      const p = previewMatch(save.id);
      setPreview(p);
      setSpinning(false);
      // reveal stages
      [1, 2, 3, 4].forEach((n, i) => setTimeout(() => setReveal(n), 400 + i * 500));
    }, 900);
  };

  const confirm = () => {
    if (!preview) return;
    confirmMatch(save.id, preview);
    setPreview(null);
    setReveal(0);
    navigate({ to: "/dashboard" });
  };

  const club = clubById(save.currentClub.clubId)!;
  const opp = preview ? clubById(preview.result.opponentClubId) : null;
  
  const matchHistory = save.spinLog.filter(entry => entry.type === "match" && entry.season === save.season.index);

  return (
    <main className="max-w-4xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="text-xs uppercase tracking-widest text-muted-foreground">Musim {save.season.index} • Pekan {save.season.matchday + 1}/{save.season.totalMatches}</div>
          <h1 className="text-3xl font-display font-extrabold">Pertandingan Berikutnya</h1>
        </div>
        <Button variant="ghost" onClick={() => navigate({ to: "/dashboard" })}>Batal</Button>
      </div>

      {!preview && !spinning && (
        <Card className="bg-card-gradient border-border/60">
          <CardContent className="p-10 text-center">
            <div className="text-6xl mb-4">🎲</div>
            <p className="text-muted-foreground mb-6">Klik spin untuk memulai. Kamu bisa re-roll sepuasnya sebelum mengonfirmasi.</p>
            <Button size="lg" onClick={spin}>Spin</Button>
          </CardContent>
        </Card>
      )}

      {spinning && (
        <Card className="bg-card-gradient border-border/60">
          <CardContent className="p-16 flex flex-col items-center gap-4">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 0.6, repeat: Infinity, ease: "linear" }}
              className="w-24 h-24 border-4 border-primary border-t-transparent rounded-full"
            />
            <p className="text-muted-foreground">Menentukan hasil...</p>
          </CardContent>
        </Card>
      )}

      {preview && opp && (
        <div className="space-y-4">
          <Card className="bg-card-gradient border-border/60 overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-center justify-center gap-6 text-center">
                <ClubBadge id={club.id} />
                <div>
                  <div className="text-xs uppercase tracking-widest text-muted-foreground">
                    {preview.result.home ? "Kandang" : "Tandang"}
                  </div>
                  <AnimatePresence>
                    {reveal >= 2 && (
                      <motion.div
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="text-5xl font-display font-extrabold my-2"
                      >
                        {preview.result.goalsFor} - {preview.result.goalsAgainst}
                      </motion.div>
                    )}
                  </AnimatePresence>
                  <AnimatePresence>
                    {reveal >= 2 && (
                      <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                        className={`text-sm font-semibold ${
                          preview.result.teamResult === "W" ? "text-primary"
                          : preview.result.teamResult === "L" ? "text-destructive" : "text-muted-foreground"
                        }`}
                      >
                        {preview.result.teamResult === "W" ? "MENANG" : preview.result.teamResult === "L" ? "KALAH" : "SERI"}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                <ClubBadge id={opp.id} />
              </div>

              <AnimatePresence>
                {reveal >= 1 && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    className="mt-6 text-center"
                  >
                    <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${
                      preview.result.selection === "starter" ? "bg-primary text-primary-foreground"
                      : preview.result.selection === "sub" ? "bg-secondary text-secondary-foreground"
                      : "bg-muted text-muted-foreground"
                    }`}>
                      {preview.result.selection === "starter" ? "STARTER"
                        : preview.result.selection === "sub" ? "MASUK DARI BANGKU"
                        : preview.result.selection === "injured" ? "CEDERA"
                        : "TIDAK DIMAINKAN"}
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>

              <AnimatePresence>
                {reveal >= 3 && preview.result.selection !== "benched" && preview.result.selection !== "injured" && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    className="mt-6 grid grid-cols-2 sm:grid-cols-5 gap-3"
                  >
                    <MiniStat k="Menit" v={preview.result.minutes} />
                    <MiniStat k="Gol" v={preview.result.goals} highlight={preview.result.goals > 0} />
                    <MiniStat k="Assist" v={preview.result.assists} />
                    <MiniStat k="Rating" v={preview.result.rating.toFixed(1)} />
                    <MiniStat k="Kartu" v={preview.result.red ? "🟥" : preview.result.yellow ? "🟨" : "—"} />
                  </motion.div>
                )}
              </AnimatePresence>

              <AnimatePresence>
                {reveal >= 4 && (
                  <motion.div
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="mt-6 rounded-lg border border-border/60 bg-panel p-4"
                  >
                    <div className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Headline</div>
                    <div className="font-medium">{preview.news.title}</div>
                    {preview.social && (
                      <div className="mt-3 rounded-lg bg-panel-2 p-3 text-sm">
                        <div className="text-xs text-muted-foreground mb-1">Postingan sosmed</div>
                        {preview.social.content}
                      </div>
                    )}
                    {preview.result.motm && <div className="mt-2 text-sm text-[color:var(--gold)]">🏅 Man of the Match!</div>}
                    {preview.result.injuryMatches > 0 && <div className="mt-2 text-sm text-destructive">Cedera: absen {preview.result.injuryMatches} pertandingan</div>}
                  </motion.div>
                )}
              </AnimatePresence>
            </CardContent>
          </Card>

          <div className="flex justify-center gap-3">
            <Button variant="secondary" onClick={spin}>🎲 Re-roll</Button>
            <Button onClick={confirm} disabled={reveal < 4}>Konfirmasi Hasil</Button>
          </div>
          <p className="text-center text-xs text-muted-foreground">
            Re-roll gratis sepuasnya. Hasil hanya final setelah kamu klik Konfirmasi.
          </p>
        </div>
      )}

      {matchHistory.length > 0 && (
        <Card className="bg-card-gradient border-border/60 mt-6">
          <CardContent className="p-4">
            <div className="text-xs uppercase tracking-widest text-muted-foreground mb-3">Riwayat Pertandingan</div>
            <div className="max-h-64 overflow-y-auto pr-2">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-card">
                  <tr className="border-b border-border/40 text-xs text-muted-foreground">
                    <th className="text-left py-2 px-2 font-medium">Match</th>
                    <th className="text-left py-2 px-2 font-medium">Hasil</th>
                    <th className="text-left py-2 px-2 font-medium">Skor</th>
                    <th className="text-left py-2 px-2 font-medium">Lawan</th>
                    <th className="text-left py-2 px-2 font-medium">Tipe</th>
                  </tr>
                </thead>
                <tbody>
                  {matchHistory.slice(0, 10).map((entry) => {
                    const summary = entry.summary;
                    const resultMatch = summary.match(/(?:•\s*)?(W|D|L)\s+(\d+)-(\d+)/);
                    let result = resultMatch ? resultMatch[1] : null;
                    const score = resultMatch ? `${resultMatch[2]}-${resultMatch[3]}` : summary;
                    
                    // Fix: if score shows draw but result is L/D, correct the result
                    if (resultMatch && resultMatch[2] === resultMatch[3]) {
                      result = 'D';
                    } else if (resultMatch && parseInt(resultMatch[2]) > parseInt(resultMatch[3])) {
                      result = 'W';
                    } else if (resultMatch && parseInt(resultMatch[2]) < parseInt(resultMatch[3])) {
                      result = 'L';
                    }
                    
                    return (
                      <tr key={entry.id} className="border-b border-border/20 last:border-0 hover:bg-accent/50">
                        <td className="py-2 px-2 text-muted-foreground">M{entry.season}</td>
                        <td className="py-2 px-2">
                          <span className={`font-semibold px-2 py-0.5 rounded text-xs ${
                            result === 'W' ? 'bg-primary/20 text-primary' :
                            result === 'L' ? 'bg-destructive/20 text-destructive' :
                            result === 'D' ? 'bg-secondary/50 text-secondary-foreground' :
                            'bg-muted text-muted-foreground'
                          }`}>
                            {result || '—'}
                          </span>
                        </td>
                        <td className="py-2 px-2 font-medium">{score}</td>
                        <td className="py-2 px-2 text-muted-foreground">{entry.opponentName || '—'}</td>
                        <td className="py-2 px-2 text-muted-foreground capitalize">{entry.matchType || '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </main>
  );
}

function ClubBadge({ id }: { id: string }) {
  const c = clubById(id)!;
  return (
    <div className="flex flex-col items-center">
      <div
        className="w-16 h-16 rounded-xl flex items-center justify-center font-display font-bold text-lg"
        style={{ backgroundColor: c.colors[0], color: c.colors[1] }}
      >
        {c.short}
      </div>
      <div className="mt-2 text-xs font-medium max-w-[120px] text-center">{c.name}</div>
    </div>
  );
}

function MiniStat({ k, v, highlight }: { k: string; v: number | string; highlight?: boolean }) {
  return (
    <div className={`rounded-lg p-3 text-center ${highlight ? "bg-primary text-primary-foreground" : "bg-panel-2"}`}>
      <div className="font-display font-extrabold text-2xl">{v}</div>
      <div className="text-[10px] uppercase tracking-widest opacity-80">{k}</div>
    </div>
  );
}
