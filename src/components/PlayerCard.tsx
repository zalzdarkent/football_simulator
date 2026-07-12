import { useEffect, useState } from "react";
import { clubById } from "../data/clubs";
import { countryByCode } from "../data/countries";
import { POSITION_LABEL } from "../lib/sim/types";
import type { Save } from "../lib/sim/types";

type Props = {
  save: Pick<Save, "player" | "attributes" | "currentClub">;
  size?: "sm" | "md" | "lg";
};

export function PlayerCard({ save, size = "md" }: Props) {
  const club = clubById(save.currentClub.clubId);
  const [realLogo, setRealLogo] = useState<string | null>(null);

  useEffect(() => {
    if (!club?.logoUrl) return;

    fetch(club.logoUrl)
      .then((res) => res.json())
      .then((data) => {
        if (data.teams && data.teams[0]) {
          setRealLogo(data.teams[0].strBadge);
        }
      })
      .catch((err) => console.error("Gagal memuat logo:", err));
  }, [club]);
  const country = countryByCode(save.player.countryCode);
  const ovr = save.attributes.overall;
  const isGold = ovr >= 75;
  const dim = size === "sm" ? "w-40" : size === "lg" ? "w-72" : "w-56";
  const gradient = isGold ? "bg-gold-gradient" : "bg-pitch-gradient";

  const stats =
    save.player.position === "GK"
      ? ([
          ["DIV", save.attributes.goalkeeping],
          ["HAN", save.attributes.goalkeeping - 2],
          ["KIC", save.attributes.passing],
          ["REF", save.attributes.goalkeeping + 1],
          ["SPD", save.attributes.pace],
          ["POS", save.attributes.defending],
        ] as const)
      : ([
          ["PAC", save.attributes.pace],
          ["SHO", save.attributes.shooting],
          ["PAS", save.attributes.passing],
          ["DRI", save.attributes.dribbling],
          ["DEF", save.attributes.defending],
          ["PHY", save.attributes.physical],
        ] as const);

  // Menggunakan layanan flagcdn agar bendera ter-render sebagai gambar asli yang konsisten di semua device
  const flagUrl = save.player.countryCode
    ? `https://flagcdn.com/w40/${save.player.countryCode.toLowerCase()}.png`
    : null;

  return (
    <div
      className={`${dim} aspect-[3/4.5] rounded-2xl ${gradient} text-primary-foreground shadow-2xl relative overflow-hidden flex flex-col`}
      style={{ boxShadow: "0 10px 40px -10px oklch(0.72 0.19 145 / 0.4)" }}
    >
      {/* Top section: Diubah menjadi flexbox pembungkus yang rapi */}
      <div className="p-4 flex justify-between items-start z-10">
        {/* Kiri: OVR dan Posisi */}
        <div>
          <div className="text-5xl font-display font-extrabold leading-none text-white">{ovr}</div>
          <div className="text-xs uppercase tracking-widest font-semibold opacity-80 mt-1.5 text-white">
            {save.player.position}
          </div>
        </div>

        {/* Kanan: Kolom Vertikal (Bendera -> Klub -> Nomor Punggung) */}
        <div className="flex flex-col items-center gap-2">
          {/* Bendera Negara (Bukan emoji, tapi gambar asli beresolusi pas) */}
          <div className="w-8 h-5 overflow-hidden rounded shadow-sm bg-black/10 flex items-center justify-center">
            {flagUrl ? (
              <img
                src={flagUrl}
                alt={save.player.countryCode}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-xs">🏳️</span>
            )}
          </div>

          {/* Logo/Badge Klub */}
          {club && (
            <div className="w-9 h-9 rounded-xl border border-white/20 flex items-center justify-center shadow-md transform transition active:scale-95 overflow-hidden bg-white/10">
              {realLogo ? (
                <img
                  src={realLogo}
                  alt={club.name}
                  className="w-full h-full object-contain"
                />
              ) : (
                <div
                  className="w-full h-full flex items-center justify-center text-xs font-bold"
                  style={{
                    backgroundColor: club.colors[0],
                    color: club.colors[1],
                    boxShadow: `inset 0 0 0 1px ${club.colors[1]}20`,
                  }}
                >
                  {club.short}
                </div>
              )}
            </div>
          )}

          {/* Nomor Punggung di bawah klub */}
          <div className="text-lg font-display font-bold text-white/90 tracking-tight mt-0.5">
            {save.currentClub.shirtNumber}
          </div>
        </div>
      </div>

      {/* Player avatar */}
      <div className="flex-1 flex items-center justify-center min-h-0 relative -mt-4">
        <div className="w-24 h-24 rounded-full bg-primary-foreground/10 flex items-center justify-center text-5xl border-2 border-primary-foreground/20 shadow-inner">
          👤
        </div>
      </div>

      {/* Player name */}
      <div className="text-center px-4 pb-2">
        <div className="font-display font-bold text-xl uppercase tracking-wide leading-tight truncate text-white">
          {save.player.name}
        </div>
      </div>

      {/* Stats */}
      <div className="bg-black/20 backdrop-blur-sm p-3 border-t border-white/5">
        <div className="grid grid-cols-3 gap-1.5">
          {stats.map(([k, v]) => (
            <div key={k} className="bg-white/10 rounded-lg p-1.5 text-center backdrop-blur-md">
              <div className="text-base font-extrabold leading-tight text-white">{v}</div>
              <div className="text-[9px] uppercase tracking-wider opacity-75 font-semibold leading-tight text-white">
                {k}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function positionLabel(p: Save["player"]["position"]) {
  return POSITION_LABEL[p];
}
