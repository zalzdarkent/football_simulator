import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useStore, clubById } from "../lib/store";
import { countryByCode } from "../lib/store";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { PlayerCard } from "../components/PlayerCard";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Become a Legend — Mulai Karier Sepakbolamu" },
      { name: "description", content: "Buat pemain, spin pertandingan, kumpulkan trofi. Simulator karier sepakbola yang bikin ketagihan." },
    ],
  }),
  component: Landing,
});

function Landing() {
  const saves = useStore((s) => s.saves);
  const setActive = useStore((s) => s.setActive);
  const deleteSave = useStore((s) => s.deleteSave);
  const navigate = useNavigate();

  const active = saves.filter((s) => s.status === "active");
  const retired = saves.filter((s) => s.status === "retired");

  return (
    <main className="min-h-[calc(100vh-3.5rem)]">
      <section className="max-w-7xl mx-auto px-4 pt-16 pb-10">
        <div className="grid lg:grid-cols-2 gap-10 items-center">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-primary font-semibold mb-4">
              Football Career Simulator
            </p>
            <h1 className="text-5xl sm:text-6xl font-display font-extrabold leading-[0.95] tracking-tight">
              Jalani karier <span className="text-primary">sepakbola</span> impianmu.
              <br /> Tanpa main <span className="text-[color:var(--gold)]">bola beneran</span>.
            </h1>
            <p className="mt-5 text-lg text-muted-foreground max-w-xl">
              Buat pemain, spin tiap pertandingan, pindah klub, koleksi trofi, dan raih Ballon d'Or.
              Cerita karier yang unik setiap kali main.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button size="lg" onClick={() => navigate({ to: "/new" })}>
                Karier Baru
              </Button>
              <Button size="lg" variant="outline" onClick={() => navigate({ to: "/auth" })}>
                Login / Daftar
              </Button>
              {active.length > 0 && (
                <Button size="lg" variant="secondary" onClick={() => {
                  void setActive(active[0].id).then(() => navigate({ to: "/dashboard" }));
                }}>
                  Lanjutkan
                </Button>
              )}
            </div>
            <div className="mt-8 grid grid-cols-3 max-w-md gap-4 text-center">
              <Feature n="10" l="Liga top" />
              <Feature n="80+" l="Klub" />
              <Feature n="∞" l="Cerita" />
            </div>
          </div>

          <div className="flex justify-center">
            <div className="relative">
              <div className="absolute -inset-8 bg-gold-gradient opacity-20 blur-3xl rounded-full" />
              <div className="relative flex gap-4">
                <div className="rotate-[-8deg] mt-8">
                  <MockCard name="A. Silva" ovr={87} pos="ST" color1="#DA291C" color2="#FBE122" />
                </div>
                <div className="rotate-[6deg]">
                  <MockCard name="M. Rossi" ovr={91} pos="CAM" color1="#010E80" color2="#000000" gold />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {saves.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 pb-20">
          <h2 className="text-2xl font-display font-bold mb-4">Karier tersimpan</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {active.map((s) => (
              <SaveCard key={s.id} save={s} onOpen={() => { void setActive(s.id).then(() => navigate({ to: "/dashboard" })); }} onDelete={() => { void deleteSave(s.id); }} />
            ))}
            {retired.map((s) => (
              <SaveCard key={s.id} save={s} retired onOpen={() => { void setActive(s.id).then(() => navigate({ to: "/dashboard/journey" })); }} onDelete={() => { void deleteSave(s.id); }} />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}

function Feature({ n, l }: { n: string; l: string }) {
  return (
    <div>
      <div className="font-display font-extrabold text-3xl text-primary">{n}</div>
      <div className="text-xs uppercase tracking-widest text-muted-foreground mt-1">{l}</div>
    </div>
  );
}

function MockCard({ name, ovr, pos, color1, color2, gold }: { name: string; ovr: number; pos: string; color1: string; color2: string; gold?: boolean }) {
  return (
    <div className={`w-56 aspect-[3/4] rounded-2xl ${gold ? "bg-gold-gradient" : "bg-pitch-gradient"} text-primary-foreground shadow-2xl relative overflow-hidden`}>
      <div className="absolute top-3 left-3">
        <div className="text-4xl font-display font-extrabold leading-none">{ovr}</div>
        <div className="text-[10px] uppercase tracking-widest font-semibold opacity-80">{pos}</div>
        <div className="mt-2 w-8 h-8 rounded-md border border-white/30 flex items-center justify-center text-[9px] font-bold" style={{ backgroundColor: color1, color: color2 }}>
          FC
        </div>
      </div>
      <div className="absolute inset-x-0 top-[45%] flex justify-center">
        <div className="w-24 h-24 rounded-full bg-white/10 flex items-center justify-center text-4xl">👤</div>
      </div>
      <div className="absolute inset-x-0 bottom-6 text-center font-display font-bold text-lg">{name}</div>
    </div>
  );
}

function SaveCard({ save, onOpen, onDelete, retired }: { save: ReturnType<typeof useStore.getState>["saves"][number]; onOpen: () => void; onDelete: () => void; retired?: boolean }) {
  const club = clubById(save.currentClub.clubId);
  const country = countryByCode(save.player.countryCode);
  return (
    <Card className="bg-card-gradient border-border/60 overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          <div className="scale-90 origin-left">
            <PlayerCard save={save} size="sm" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <div className="font-display font-bold truncate">{save.player.name}</div>
              {retired && <span className="text-[10px] uppercase bg-muted rounded px-1.5 py-0.5">Pensiun</span>}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {country?.flag} {save.player.position} • {club?.short ?? "—"} • Umur {save.player.age}
            </div>
            <div className="mt-2 grid grid-cols-3 gap-2 text-center text-xs">
              <Stat k="Musim" v={save.season.index} />
              <Stat k="Gol" v={save.careerStats.goals} />
              <Stat k="Trofi" v={save.careerStats.trophies} />
            </div>
            <div className="mt-3 flex gap-2">
              <Button size="sm" onClick={onOpen}>Buka</Button>
              <Button size="sm" variant="ghost" onClick={() => { if (confirm("Hapus karier ini?")) onDelete(); }}>
                Hapus
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function Stat({ k, v }: { k: string; v: number }) {
  return (
    <div className="bg-panel-2 rounded-md py-1">
      <div className="font-display font-bold text-sm">{v}</div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{k}</div>
    </div>
  );
}
