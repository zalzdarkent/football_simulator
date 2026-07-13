import { useState } from "react";
import { clubById, countryByCode } from "../lib/store";
import { POSITION_LABEL } from "../lib/sim/types";
import type { Save } from "../lib/sim/types";

type Props = {
  save: Pick<Save, "player" | "attributes" | "currentClub">;
  size?: "xs" | "sm" | "md" | "lg";
};

export function PlayerCard({ save, size = "md" }: Props) {
  const club = clubById(save.currentClub.clubId);
  const realLogo = club?.logoUrl || null;
  const country = countryByCode(save.player.countryCode);
  const ovr = save.attributes.overall;
  const isGold = ovr >= 75;
  const isSmall = size === "xs" || size === "sm";
  const dim = size === "xs" ? "w-28" : size === "sm" ? "w-40" : size === "lg" ? "w-72" : "w-56";
  const gradient = isGold ? "bg-gold-gradient" : "bg-pitch-gradient";
  const [logoFailed, setLogoFailed] = useState(false);

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

  const flagUrl = save.player.countryCode
    ? `https://flagcdn.com/w40/${save.player.countryCode.toLowerCase()}.png`
    : null;

  return (
    <div
      className={`${dim} aspect-[3/4.5] rounded-2xl ${gradient} text-primary-foreground shadow-2xl relative overflow-hidden flex flex-col`}
      style={{ boxShadow: "0 10px 40px -10px oklch(0.72 0.19 145 / 0.4)" }}
    >
      {/* Top section */}
      <div className={`${isSmall ? "p-2.5" : "p-4"} flex justify-between items-start z-10`}>
        {/* Kiri: OVR dan Posisi */}
        <div>
          <div
            className={`${size === "xs" ? "text-2xl" : size === "sm" ? "text-3xl" : size === "lg" ? "text-6xl" : "text-5xl"} font-display font-extrabold leading-none text-white`}
          >
            {ovr}
          </div>
          <div
            className={`${size === "xs" ? "text-[8px]" : "text-xs"} uppercase tracking-widest font-semibold opacity-80 mt-1 text-white`}
          >
            {save.player.position}
          </div>
        </div>

        {/* Kanan: Kolom Vertikal */}
        <div className={`flex flex-col items-center ${isSmall ? "gap-1" : "gap-2"}`}>
          <div
            className={`${size === "xs" ? "w-5 h-3" : "w-8 h-5"} overflow-hidden rounded shadow-sm bg-black/10 flex items-center justify-center`}
          >
            {flagUrl ? (
              <img
                src={flagUrl}
                alt={save.player.countryCode}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-[8px]">🏳️</span>
            )}
          </div>

          {club && (
            <div
              className={`${size === "xs" ? "w-6 h-6" : "w-9 h-9"} rounded-xl border border-white/20 flex items-center justify-center shadow-md overflow-hidden bg-white/10`}
            >
              {realLogo && !logoFailed ? (
                <img
                  src={realLogo}
                  alt={club.name}
                  className="w-full h-full object-contain"
                  onError={() => setLogoFailed(true)}
                />
              ) : (
                <div
                  className="w-full h-full flex items-center justify-center text-[8px] font-bold"
                  style={{
                    backgroundColor: club.colors[0],
                    color: club.colors[1],
                  }}
                >
                  {club.short}
                </div>
              )}
            </div>
          )}

          <div
            className={`${size === "xs" ? "text-xs" : "text-lg"} font-display font-bold text-white/90 tracking-tight`}
          >
            {save.currentClub.shirtNumber}
          </div>
        </div>
      </div>

      {/* Player avatar */}
      <div className="flex-1 flex items-center justify-center min-h-0 relative -mt-4">
        <div
          className={`${size === "xs" ? "w-14 h-14 text-3xl" : size === "sm" ? "w-18 h-18 text-4xl" : "w-24 h-24 text-5xl"} rounded-full bg-primary-foreground/10 flex items-center justify-center border-2 border-primary-foreground/20 shadow-inner`}
        >
          👤
        </div>
      </div>

      {/* Player name */}
      <div className={`text-center ${isSmall ? "px-2 pb-1" : "px-4 pb-2"}`}>
        <div
          className={`font-display font-bold ${size === "xs" ? "text-xs" : size === "sm" ? "text-sm" : size === "lg" ? "text-2xl" : "text-xl"} uppercase tracking-wide leading-tight truncate text-white`}
        >
          {save.player.name}
        </div>
      </div>

      {/* Stats */}
      <div
        className={`bg-black/20 backdrop-blur-sm ${isSmall ? "p-1.5" : "p-3"} border-t border-white/5`}
      >
        <div className="grid grid-cols-3 gap-1">
          {stats.map(([k, v]) => (
            <div
              key={k}
              className={`bg-white/10 rounded-lg ${isSmall ? "p-0.5" : "p-1.5"} text-center backdrop-blur-md`}
            >
              <div
                className={`${size === "xs" ? "text-[10px]" : "text-base"} font-extrabold leading-tight text-white`}
              >
                {v}
              </div>
              <div
                className={`${size === "xs" ? "text-[6px]" : "text-[9px]"} uppercase tracking-wider opacity-75 font-semibold leading-tight text-white`}
              >
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
