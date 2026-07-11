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
  const country = countryByCode(save.player.countryCode);
  const ovr = save.attributes.overall;
  const isGold = ovr >= 75;
  const dim = size === "sm" ? "w-40" : size === "lg" ? "w-72" : "w-56";
  const gradient = isGold ? "bg-gold-gradient" : "bg-pitch-gradient";

  const stats = save.player.position === "GK"
    ? [
        ["DIV", save.attributes.goalkeeping],
        ["HAN", save.attributes.goalkeeping - 2],
        ["KIC", save.attributes.passing],
        ["REF", save.attributes.goalkeeping + 1],
        ["SPD", save.attributes.pace],
        ["POS", save.attributes.defending],
      ] as const
    : [
        ["PAC", save.attributes.pace],
        ["SHO", save.attributes.shooting],
        ["PAS", save.attributes.passing],
        ["DRI", save.attributes.dribbling],
        ["DEF", save.attributes.defending],
        ["PHY", save.attributes.physical],
      ] as const;

  return (
    <div
      className={`${dim} aspect-[3/4.5] rounded-2xl ${gradient} text-primary-foreground shadow-2xl relative overflow-hidden flex flex-col`}
      style={{ boxShadow: "0 10px 40px -10px oklch(0.72 0.19 145 / 0.4)" }}
    >
      {/* Top section: Overall, position, country, club */}
      <div className="p-3 flex justify-between items-start">
        <div>
          <div className="text-5xl font-display font-extrabold leading-none">{ovr}</div>
          <div className="text-xs uppercase tracking-widest font-semibold opacity-80 mt-1">
            {save.player.position}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <div className="text-2xl">{country?.flag ?? "🏳️"}</div>
          {club && (
            <div
              className="w-10 h-10 rounded-md border border-primary-foreground/30 flex items-center justify-center text-xs font-bold"
              style={{ backgroundColor: club.colors[0], color: club.colors[1] }}
            >
              {club.short}
            </div>
          )}
        </div>
      </div>

      {/* Shirt number */}
      <div className="absolute top-3 right-3 text-right text-xs font-bold opacity-80">
        #{save.currentClub.shirtNumber}
      </div>

      {/* Player avatar */}
      <div className="flex-1 flex items-center justify-center min-h-0">
        <div className="w-24 h-24 rounded-full bg-primary-foreground/10 flex items-center justify-center text-5xl border-2 border-primary-foreground/20">
          👤
        </div>
      </div>

      {/* Player name */}
      <div className="text-center px-4 pb-1">
        <div className="font-display font-bold text-lg leading-tight truncate text-white">
          {save.player.name}
        </div>
      </div>

      {/* Stats */}
      <div className="bg-black/20 backdrop-blur-sm p-2.5">
        <div className="grid grid-cols-3 gap-1.5">
          {stats.map(([k, v]) => (
            <div key={k} className="bg-primary-foreground/10 rounded p-1.5 text-center">
              <div className="text-base font-bold leading-tight text-white">{v}</div>
              <div className="text-[9px] uppercase tracking-wider opacity-70 leading-tight text-white">{k}</div>
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
