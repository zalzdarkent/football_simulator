import { clubById } from "../data/clubs";
import { countryByCode } from "../data/countries";
import { POSITION_LABEL } from "../lib/sim/attributes";
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
      className={`${dim} aspect-[3/4] rounded-2xl ${gradient} text-primary-foreground shadow-2xl relative overflow-hidden`}
      style={{ boxShadow: "0 10px 40px -10px oklch(0.72 0.19 145 / 0.4)" }}
    >
      <div className="absolute top-3 left-3">
        <div className="text-4xl font-display font-extrabold leading-none">{ovr}</div>
        <div className="text-[10px] uppercase tracking-widest font-semibold opacity-80">
          {save.player.position}
        </div>
        <div className="mt-1 text-lg">{country?.flag ?? "🏳️"}</div>
        {club && (
          <div
            className="mt-1 w-8 h-8 rounded-md border border-primary-foreground/30 flex items-center justify-center text-[9px] font-bold"
            style={{ backgroundColor: club.colors[0], color: club.colors[1] }}
          >
            {club.short}
          </div>
        )}
      </div>

      <div className="absolute top-3 right-3 text-right text-[10px] uppercase opacity-70">
        #{save.currentClub.shirtNumber}
      </div>

      <div className="absolute inset-x-0 top-[45%] flex justify-center">
        <div className="w-24 h-24 rounded-full bg-primary-foreground/10 flex items-center justify-center text-4xl">
          👤
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-14 text-center px-4">
        <div className="font-display font-bold text-lg leading-tight truncate">
          {save.player.name}
        </div>
      </div>

      <div className="absolute inset-x-3 bottom-3 grid grid-cols-3 gap-x-2 gap-y-0.5 text-[10px] font-semibold">
        {stats.map(([k, v]) => (
          <div key={k} className="flex items-center justify-between">
            <span>{v}</span>
            <span className="opacity-70">{k}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function positionLabel(p: Save["player"]["position"]) {
  return POSITION_LABEL[p];
}
