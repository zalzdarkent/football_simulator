
# Football Career Simulator — "Become a Legend"

Web app single-player berbasis spin, semua data karier disimpan di browser (localStorage). Mendukung banyak save/karier per browser. Semua fitur Fase 1+2+3 dari PRD masuk.

> Catatan hak cipta: kamu memilih pakai nama asli klub/liga/penghargaan. Ini berisiko legal kalau nanti dipublish komersial — aku akan tetap kerjakan sesuai permintaan, tapi pakai dataset seed statis (tidak menarik dari API resmi). Nama pemain lain di liga tetap fiktif.

---

## 1. Arsitektur & Tech

- **Frontend only**: TanStack Start (template project) + React 19 + Tailwind v4 + shadcn.
- **State & persistence**: Zustand store dengan middleware `persist` ke `localStorage`. Semua RNG spin dijalankan di sisi client (karena local-only) — struktur logic tetap dipisah bersih di `src/lib/sim/*` supaya mudah dipindahkan ke server function saat Cloud diaktifkan nanti.
- **RNG**: seeded PRNG (mulberry32) per karier, seed disimpan di save → hasil reproducible & bisa mendukung mode preview (re-roll di preview tidak advance seed final sampai konfirmasi).
- **Animasi spin**: Framer Motion (roda berputar, angka gol bergulir, kartu award terbuka).
- **Routing**: TanStack file-based di `src/routes/`.

## 2. Data Seed (statis, di repo)

`src/data/`:
- `countries.ts` — daftar negara + kode bendera (emoji).
- `leagues.ts` — liga top: Premier League, La Liga, Serie A, Bundesliga, Ligue 1, Eredivisie, Liga Portugal, Süper Lig, MLS, Saudi Pro League + Champions League/Europa League sebagai kompetisi.
- `clubs.ts` — ±20 klub per liga top (nama asli), dengan `tier` (1–4), `reputation`, `budget`, kota, warna kit.
- `awards.ts` — Ballon d'Or, FIFA Best, Golden Boot (per liga), Golden Glove, POTM, MOTM, TOTS, Best Young Player, UCL top scorer, dll.
- `newsTemplates.ts` & `socialTemplates.ts` — template string dengan placeholder `{player}`, `{club}`, `{goals}`, dll.
- `firstNames.ts` / `lastNames.ts` per region — untuk generate pemain lain (rival top scorer, dll).

## 3. Model Data (TypeScript types, disimpan di localStorage)

```text
Save
 ├─ id, createdAt, seed
 ├─ player: { name, country, position, age, dob, height, foot, avatarSeed }
 ├─ attributes: { overall, potential, pace, shooting, passing, dribbling, defending, physical, gk? }
 ├─ currentClub: { clubId, shirtNumber, wage, contractUntilSeason }
 ├─ season: { index, matchesPlayed, totalMatches (default 38), seasonStats }
 ├─ careerStats: aggregate
 ├─ statsBySeason[]: per musim {clubId, apps, goals, assists, avgRating, ...}
 ├─ transfers[]: {fromClubId, toClubId, season, type, fee}
 ├─ trophies[]: {competitionId, season, clubId}
 ├─ awards[]: {awardId, season, clubId}
 ├─ milestones[]: {type, value, season, at}
 ├─ news[]: {id, seasonWeek, title, body, tag}
 ├─ social[]: {id, content, likes, comments, at}
 ├─ spinLog[]: {type, resultSummary, at}
 ├─ status: active | retired
 └─ retirement?: {season, reason, finalOverall}
```

Root state:
```text
AppState
 ├─ saves: Save[]
 ├─ activeSaveId?: string
 └─ settings: { spinMode: 'preview' } // fixed for MVP
```

## 4. Logika Spin (semua di `src/lib/sim/`)

### 4.1 Match Spin
Input: player attributes, position, club tier, opponent tier (dipilih otomatis dari fixture generator).
Output: `{ selection: 'starter'|'sub'|'benched', teamResult: 'W'|'D'|'L', goals, assists, cards, rating (1–10), injuryDays }`.
Peluang di-tune berdasarkan overall vs opponent, plus modifier posisi (ST lebih besar peluang gol; GK dapat clean sheet & save-of-the-match).

### 4.2 Season-End Spin
Dihitung dari akumulasi season stats + roll:
- Trofi tim: probabilitas berdasarkan tier klub.
- Awards individu: threshold (mis. Golden Boot butuh top-3 gol di liga secara relatif; POTY butuh Ballon d'Or roll di atas ambang).
- Menghasilkan `offers[]` untuk transfer & `renewal?` untuk perpanjangan.

### 4.3 Transfer/Contract Spin
Menghasilkan 3–5 tawaran klub (fee, wage, kontrak, tier). User memilih: **Stay**, **Extend**, atau **Pindah**.

### 4.4 Preview Mode
- Sebelum konfirmasi, user bisa klik "Re-roll" tak terbatas — implementasi: fungsi spin dipanggil dengan seed sementara acak (bukan seed persist).
- Tombol "Konfirmasi" → tulis hasil ke save & advance state (matchesPlayed++, dsb.).
- Tombol "Batal" hanya tersedia sebelum konfirmasi.

### 4.5 Progres atribut & umur
- Setiap akhir musim: umur++, overall bergerak berdasarkan performa & kurva umur (peak 27–30, decline setelah 32).
- Auto-retire saat overall < 60 dan umur ≥ 34, atau user klik "Pensiun".

## 5. Struktur Route

```
src/routes/
  __root.tsx          → shell + header (nav muncul saat ada save aktif)
  index.tsx           → Landing (New Career / Continue / pilih save)
  new.tsx             → Character creation wizard (3 langkah + preview kartu)
  dashboard.tsx       → Layout karier aktif dgn <Outlet /> + sidebar
  dashboard.index.tsx → Home dashboard (ringkasan + tombol Main Berikutnya)
  dashboard.match.tsx        → Match Spin (preview + confirm)
  dashboard.season-end.tsx   → Season-End Spin
  dashboard.transfer.tsx     → Transfer/Contract Spin
  dashboard.stats.tsx        → Statistik musim & karier
  dashboard.trophies.tsx     → Lemari trofi & penghargaan (2 tab)
  dashboard.journey.tsx      → Timeline karier
  dashboard.news.tsx         → News feed
  dashboard.social.tsx       → Simulasi sosmed
  dashboard.transfers.tsx    → Riwayat transfer
  dashboard.leaderboard.tsx  → Leaderboard antar save lokal
  dashboard.settings.tsx     → Rename/delete save, export/import JSON
```

Guard: route `dashboard/*` redirect ke `/` jika tidak ada `activeSaveId`.

## 6. Fitur UI Detail

- **Landing**: hero + list save cards (nama pemain, klub, overall, musim ke-, umur) + tombol New/Continue/Delete.
- **Character Creation**: 3 langkah — Identitas (nama, DOB → umur otomatis, negara searchable, tinggi, kaki dominan) → Posisi (grid formasi 8 posisi) → Klub awal (3 opsi acak dari tier 3–4). Preview kartu pemain gaya FUT sebelum submit.
- **Dashboard home**: kartu profil + progress bar overall & musim, statistik musim ini vs karier total, quick actions.
- **Match spin UI**: animasi roda + reveal berurutan (Selection → Team result → Personal stats → Rating). Toolbar: `Re-roll`, `Konfirmasi`, `Batal`. Modal hasil menampilkan berita otomatis + post sosmed yang akan ditambahkan.
- **Season-End**: reveal bertahap (Liga finish → Trofi → Awards → Offers).
- **Transfer**: kartu tawaran side-by-side, pilih 1.
- **Trophies**: 2 tab (Tim / Individu), grouped per musim/klub, ikon per kompetisi.
- **Journey**: vertical timeline (debut, transfer, milestone gol, trofi, award, pensiun).
- **News**: list card dengan tag warna, filter per musim.
- **Social**: feed gaya Twitter/IG, followers count naik dgn performa; reaksi otomatis.
- **Leaderboard**: tab (Top Scorers, Most Trophies, Highest Overall, Longest Career) antar save di device ini.
- **Settings**: rename save, delete, export JSON, import JSON.

## 7. Desain Visual

- Tema gelap sporty: latar `#0B1220`, panel `#111C2E`, aksen `#22C55E` (rumput) & `#F59E0B` (emas trofi), teks `#E5E7EB`.
- Font: Outfit (heading) + Inter (body) via `@fontsource`.
- Kartu pemain gradient hijau→emas dgn overall besar di pojok, mengambil inspirasi kartu FUT/PES.
- Semua warna via CSS variable di `src/styles.css` (oklch), tanpa hardcode kelas warna.

## 8. Roadmap Implementasi (urutan build)

1. Setup design tokens, fonts, layout shell, header/nav, seed data statis.
2. Zustand store + persist + tipe data + util RNG.
3. Landing + save management (create/continue/delete/export/import).
4. Character creation wizard + preview kartu.
5. Dashboard home + Match Spin (preview mode + konfirmasi) + news/social auto-generator.
6. Statistik per musim & karier, riwayat transfer.
7. Season-End Spin + Transfer Spin + kurva umur/retirement.
8. Lemari Trofi & Penghargaan, Career Journey timeline.
9. News feed page, simulasi sosmed page, Leaderboard lokal.
10. Settings + polish animasi + head metadata SEO per route.

## 9. Yang TIDAK dikerjakan sekarang

- Login/akun & sync multi-device (bisa di-upgrade ke Lovable Cloud nanti — data layer sudah dipisah supaya migrasi mudah).
- Leaderboard global antar user.
- Match engine real-time.
