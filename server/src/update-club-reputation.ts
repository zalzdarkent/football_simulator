// Script buat re-generate `clubs.reputation` supaya bervariasi & realistis —
// TANPA bergantung ke tabel players/player_stats (yang sudah dihapus).
//
// Sumber sinyal:
//  1. Baseline per tier liga (liga top lebih tinggi dari liga kecil)
//  2. Daftar kurasi manual untuk klub-klub besar, di-MATCH BERDASARKAN NAMA
//     (bukan id numerik API-Football, biar nggak salah tebak ID). Opsional,
//     bisa nyicil ditambah — nggak perlu isi semua 230 klub.
//  3. Jitter deterministic kecil buat klub yang nggak ada di daftar kurasi,
//     biar nggak semuanya identik dalam satu tier.
//
// Run: pnpm --filter server update:club-reputation
// (atau: cd server && tsx src/update-club-reputation.ts)

import { query, pool } from "./db.js";
import dotenv from "dotenv";

dotenv.config();

// Baseline reputation per tier liga (tier 1 = liga top, makin besar makin rendah).
// Sesuaikan kalau kamu punya lebih dari 4 tier di data kamu.
const TIER_BASELINE: Record<number, number> = {
  1: 68,
  2: 60,
  3: 55,
  4: 48,
};
const DEFAULT_BASELINE = 50;

// Kurasi manual — di-match pakai keyword yang muncul di nama klub (case-insensitive,
// "includes", bukan exact match), jadi nggak peduli variasi penulisan resmi di DB kamu
// (mis. "Bayern München" vs "FC Bayern Munich" tetap kena selama keyword-nya cocok).
// Nggak wajib lengkap; makin banyak makin akurat, tapi game tetap jalan normal
// walau daftar ini kosong (fallback ke baseline+jitter).
// Angka di sini adalah reputation ABSOLUT (0-99), bukan bonus tambahan.
// Urutan penting: yang lebih spesifik taruh duluan biar nggak ketiban keyword generik.
const CURATED_OVERRIDES: Array<{ keywords: string[]; reputation: number }> = [
  // Taruh di paling atas: nama yg mengandung substring klub lain (mis. "Inter Miami"
  // mengandung "inter" yg juga keyword Inter Milan) — biar dicek & match duluan.
  { keywords: ["inter miami"], reputation: 74 },
  // England
  { keywords: ["manchester city"], reputation: 94 },
  { keywords: ["liverpool"], reputation: 92 },
  { keywords: ["arsenal"], reputation: 90 },
  { keywords: ["manchester united"], reputation: 88 },
  { keywords: ["chelsea"], reputation: 88 },
  { keywords: ["tottenham"], reputation: 85 },
  { keywords: ["newcastle"], reputation: 80 },
  { keywords: ["aston villa"], reputation: 78 },
  { keywords: ["west ham"], reputation: 74 },
  { keywords: ["brighton"], reputation: 73 },
  // Spain
  { keywords: ["real madrid"], reputation: 97 },
  { keywords: ["barcelona"], reputation: 95 },
  { keywords: ["atletico madrid", "atlético madrid"], reputation: 87 },
  { keywords: ["athletic club", "athletic bilbao"], reputation: 78 },
  { keywords: ["real sociedad"], reputation: 76 },
  { keywords: ["villarreal"], reputation: 76 },
  { keywords: ["real betis", "betis"], reputation: 74 },
  { keywords: ["sevilla"], reputation: 74 },
  // Italy
  { keywords: ["inter", "internazionale"], reputation: 88 },
  { keywords: ["juventus"], reputation: 87 },
  { keywords: ["milan"], reputation: 86 }, // hati2: harus setelah "internazionale" biar ga ke-skip
  { keywords: ["napoli"], reputation: 84 },
  { keywords: ["roma"], reputation: 79 },
  { keywords: ["atalanta"], reputation: 78 },
  { keywords: ["lazio"], reputation: 77 },
  { keywords: ["fiorentina"], reputation: 74 },
  // Germany
  { keywords: ["bayern"], reputation: 93 },
  { keywords: ["dortmund"], reputation: 85 },
  { keywords: ["leverkusen"], reputation: 82 },
  { keywords: ["rb leipzig", "leipzig"], reputation: 81 },
  { keywords: ["eintracht frankfurt"], reputation: 75 },
  { keywords: ["borussia mönchengladbach", "borussia monchengladbach", "gladbach"], reputation: 73 },
  { keywords: ["vfl wolfsburg", "wolfsburg"], reputation: 72 },
  // France
  { keywords: ["paris saint germain", "psg"], reputation: 91 },
  { keywords: ["monaco"], reputation: 79 },
  { keywords: ["marseille"], reputation: 77 },
  { keywords: ["lyon"], reputation: 75 },
  { keywords: ["lille"], reputation: 73 },
  // Portugal / Netherlands / Turkey / MLS / Saudi
  { keywords: ["benfica"], reputation: 79 },
  { keywords: ["porto"], reputation: 78 },
  { keywords: ["sporting"], reputation: 76 },
  { keywords: ["ajax"], reputation: 78 },
  { keywords: ["psv"], reputation: 76 },
  { keywords: ["feyenoord"], reputation: 74 },
  { keywords: ["galatasaray"], reputation: 78 },
  { keywords: ["fenerbahce", "fenerbahçe"], reputation: 76 },
  { keywords: ["al hilal", "al-hilal"], reputation: 78 },
  { keywords: ["al nassr", "al-nassr"], reputation: 78 },
];

function normalize(name: string): string {
  return name.toLowerCase();
}

function findCuratedReputation(clubName: string): number | null {
  const n = normalize(clubName);
  for (const entry of CURATED_OVERRIDES) {
    if (entry.keywords.some((kw) => n.includes(kw))) return entry.reputation;
  }
  return null;
}

// Deterministic jitter dari id klub (bukan random tiap run — konsisten & reproducible).
function deterministicJitter(seedStr: string, spread: number): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < seedStr.length; i++) {
    h ^= seedStr.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const t = (h >>> 0) / 4294967296; // 0..1
  return (t - 0.5) * 2 * spread; // -spread..+spread
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

async function main() {
  console.log("🔄 Menghitung ulang reputation semua klub...\n");

  const { rows: clubs } = await query<{ id: string; name: string; tier: number; reputation: number }>(
    "SELECT id, name, tier, reputation FROM clubs"
  );
  console.log(`Ditemukan ${clubs.length} klub.\n`);

  let updated = 0;
  let curated = 0;

  // Urutin biar preview keliatan dari yg reputation tertinggi ke rendah,
  // gampang buat verifikasi cepat (mis. mastiin Real Madrid emang di atas).
  const results: { name: string; tier: number; old: number; next: number; curated: boolean }[] = [];

  for (const club of clubs) {
    const curatedRep = findCuratedReputation(club.name);
    let reputation: number;

    if (curatedRep !== null) {
      reputation = Math.round(clamp(curatedRep + deterministicJitter(club.id, 2), 40, 99));
      curated++;
    } else {
      const baseline = TIER_BASELINE[club.tier] ?? DEFAULT_BASELINE;
      reputation = Math.round(clamp(baseline + deterministicJitter(club.id, 8), 40, 79));
    }

    if (reputation !== club.reputation) {
      await query("UPDATE clubs SET reputation = $1 WHERE id = $2", [reputation, club.id]);
      updated++;
    }
    results.push({ name: club.name, tier: club.tier, old: club.reputation, next: reputation, curated: curatedRep !== null });
  }

  results.sort((a, b) => b.next - a.next);
  for (const r of results) {
    console.log(`${r.name.padEnd(28)} tier=${r.tier}  reputation ${r.old} → ${r.next}${r.curated ? "  [kurasi]" : ""}`);
  }

  console.log(`\n✅ Selesai. ${updated}/${clubs.length} klub di-update (${curated} dari daftar kurasi).`);
  console.log(`💡 Cek urutan di atas — kalau ada klub kurasi yg ternyata KEHILANGAN tag [kurasi] (harusnya match tapi nggak), berarti keyword-nya belum cocok sama nama persis di DB kamu. Tambahin keyword-nya di CURATED_OVERRIDES.`);

  await pool.end();
}

main().catch((err) => {
  console.error("❌ Error:", err);
  process.exit(1);
});