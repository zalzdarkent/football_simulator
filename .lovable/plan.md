# Rencana: Full Backend + Multi-Kompetisi + Awards Lengkap

Semua logika pindah ke Express (`server/`). Frontend jadi *thin client*: fetch API + render + animasi. Save disimpan per user di Postgres (auth login sudah ada).

## 1. Skema Database Baru (`server/src/migrate.ts`)

Tabel referensi (di-seed sekali, sumber kebenaran):

```text
countries, leagues, clubs         → sudah ada, tinggal perluas
competitions                       → tambah kolom: format (league|knockout|group_knockout),
                                     rounds JSONB, teams_count
awards                             → perluas jadi ~15 award (lihat §4)
first_names, last_names, avatars   → untuk generator opponent & shortlist
```

Tabel state simulasi per save (relational, bukan blob JSON lagi):

```text
saves(id, user_id, seed, player JSONB, attributes JSONB,
      current_club_id, season_index, age, status, created_at)
season_competitions(save_id, season_idx, competition_id, format, stage,
                    club_qualified BOOL, position INT, eliminated_at TEXT)
matches(id, save_id, season_idx, competition_id, matchday INT|null,
        stage TEXT|null,  -- 'group','R16','QF','SF','F' untuk KO
        opponent_club_id, home BOOL, played BOOL,
        team_goals INT, opp_goals INT,
        player_goals, player_assists, player_saves, rating REAL,
        yellow, red, motm BOOL, played_at TIMESTAMPTZ)
trophies(id, save_id, season_idx, competition_id, club_id)
awards_won(id, save_id, season_idx, award_id, detail, is_world_scope)
award_nominees(save_id, season_idx, award_id, rank, player_name, club_id, is_you)
transfers(id, save_id, season_idx, from_club, to_club, fee, wage, years, type)
news(id, save_id, season_idx, kind, headline, body, created_at)
social_posts(id, save_id, season_idx, platform, body, likes, comments)
```

Semua `save_id` → `saves(id) ON DELETE CASCADE`. Index di `(save_id, season_idx)`.

## 2. Struktur Express (MVC)

```text
server/src/
├── db.ts                          (sudah ada)
├── index.ts                       (sudah ada — mount routes)
├── models/
│   ├── save.ts                    CRUD saves
│   ├── match.ts                   CRUD matches + query per-season
│   ├── competition.ts             query kompetisi & bracket state
│   ├── award.ts, trophy.ts, transfer.ts, news.ts
│   └── reference.ts               leagues/clubs/awards (cached)
├── services/  (LOGIKA SIMULASI, dulu di src/lib/sim/*)
│   ├── rng.ts                     seeded PRNG (mulberry32) — deterministik per save
│   ├── season-setup.ts            generate fixtures liga + bracket piala + UCL group
│   ├── match-sim.ts               simulasi 1 match: skor tim, statline pemain, rating, MOTM
│   ├── knockout.ts                advance stage KO, buat lawan berikutnya
│   ├── progression.ts             perkembangan attribute + retirement
│   ├── awards-engine.ts           hitung shortlist & winner untuk 15 award
│   └── transfer-market.ts         generate offer musim panas
├── controllers/
│   ├── saves.controller.ts        POST /saves, GET /saves/:id, DELETE
│   ├── season.controller.ts       POST /saves/:id/season/start  → seed fixtures
│   ├── match.controller.ts        GET  /saves/:id/matches/next  → preview (unlimited re-roll)
│   │                              POST /saves/:id/matches/:mid/commit
│   ├── awards.controller.ts       GET  /saves/:id/season/:n/awards/preview
│   │                              POST /saves/:id/season/:n/awards/commit
│   ├── transfer.controller.ts     GET  offers preview, POST accept
│   └── reference.controller.ts    GET /reference/{leagues,clubs,competitions,awards}
└── routes/*.ts                     tipis: bind ke controller
```

Spin **Preview Mode**: endpoint `?seed=<preview_seed>` mengembalikan hasil deterministik tanpa menulis DB. `commit` menulis dengan seed yang dipilih user → hasil final permanen.

## 3. Multi-Kompetisi Per Musim

Setiap musim, saat `POST /season/start`, backend generate:

| Kompetisi | Format | Jadwal untuk pemain |
|---|---|---|
| Liga domestik | 38 matchday (round-robin ringkas: 20–34 match tampil) | matchday reguler |
| Piala domestik | KO: R32 → R16 → QF → SF → Final | disisipkan tiap ±4 matchday |
| Piala Liga (EFL/dsb) | KO ringkas 4 stage | 2–3 match/musim |
| UCL / UEL / UECL | Grup 6 match + R16 → Final (jika klub lolos berdasar tier & posisi musim lalu) | disisipkan midweek |

Frontend punya route `/dashboard/match` yang menampilkan **jadwal musim** (list `matches` yang belum `played`). Klik pertandingan → preview → commit. UI menampilkan badge kompetisi (EPL / FA Cup / UCL R16 / dst).

Auto-advance bracket: setelah user commit match KO, service `knockout.advance()` menentukan apakah klub lolos (probabilitas berdasar rating pemain + tier klub) dan generate lawan babak berikutnya.

## 4. Sistem Awards Lengkap

Award di-seed ke tabel `awards`:

**Bulanan (per liga):** POTM, Save of the Month (GK), Goal of the Month
**Musiman (per liga):** Top Scorer, Top Assist, Golden Glove, Best Young (U-21), POTY Liga, TOTS (11 pemain)
**Kontinental:** UCL Top Scorer, UCL POTY, UEL POTY
**Dunia (tahunan):** Ballon d'Or, FIFA The Best, UEFA Men's POTY, Golden Boy (U-21), TOTY (FIFPRO XI)

`awards-engine.ts` menghasilkan **shortlist 5–10 nominee** (pemain fiktif generated) plus posisi pemain, dengan probabilitas menang berdasar:
- rating musim, gol, assist, clean sheet
- trofi (Liga, UCL berbobot besar untuk Ballon d'Or)
- tier klub & rep pemain

Endpoint `GET /awards/preview` mengembalikan shortlist urut peringkat + kandidat lain. `POST /awards/commit` menyimpan pemenang + peringkat pemain (mis. "Ballon d'Or #3") ke `awards_won` + `award_nominees`. Halaman `/dashboard/trophies` menampilkan cabinet + halaman detail per award musim.

## 5. Perubahan Frontend

- Hapus `src/lib/sim/*` (logika pindah ke backend). Sisakan `types.ts` yang match dengan API response.
- Ganti Zustand `persist` → Zustand + React Query. Save-state di-fetch dari API, cache di React Query, mutation untuk commit.
- `src/lib/api.ts` diperluas: `saves`, `matches`, `awards`, `transfers`, `reference`.
- Auth: gunakan `/auth` yang sudah ada (login/register) → simpan token → semua request kirim `Authorization: Bearer`.
- `AppHeader` menampilkan user + list saves + tombol logout.
- Halaman baru: `/dashboard/fixtures` (jadwal musim, list all matches per kompetisi), `/dashboard/awards/:season` (detail nominee & ranking).
- `/dashboard/match` jadi flow: pilih match berikutnya dari fixtures → preview (re-roll) → commit → jump ke match berikutnya.

## 6. Rencana Implementasi (bertahap)

1. **Migrate & seed**: perluas `migrate.ts` dengan tabel state; `seed.ts` isi awards + competitions lengkap. Buat `reseed` untuk dev.
2. **Services** (port logika dari `src/lib/sim/*`): rng, match-sim, knockout, awards-engine, progression, transfer-market. Unit-friendly (pure functions).
3. **Models + Controllers + Routes** untuk saves, season, match, awards, transfer, reference.
4. **Frontend API layer**: hook `useSave`, `useNextMatches`, `useAwardsPreview`, dst dengan React Query.
5. **Refactor halaman** dashboard.match, .season-end, .trophies, .transfers → pakai API.
6. **Halaman baru**: /dashboard/fixtures, /dashboard/awards.
7. **Auth wiring**: token disimpan di localStorage; guard `/dashboard/*` redirect ke `/auth` jika belum login. StoreHydrator diganti.
8. **Migrasi save lokal → server**: tombol "Import from localStorage" di /auth setelah login (opsional; skip jika tidak diminta).

## Catatan teknis

- **Determinisme**: seed disimpan di `saves.seed`. Setiap generator jadwal, match, awards menerima `(seed, season_idx, entity_key)` → `mulberry32(hash(seed+key))` supaya preview & commit menghasilkan angka yang sama untuk seed yang sama.
- **Preview vs commit**: preview cukup panggil service in-memory tanpa `INSERT`. Commit `INSERT`. Tidak perlu tabel "draft".
- **Backend dev**: `docker-compose.yml` sudah ada untuk Postgres. User jalankan `pnpm --filter server dev` (atau `bun`) sendiri. Frontend `src/lib/api.ts` baca `VITE_API_URL` (default `http://localhost:4000`).
- **CORS**: Express sudah pakai `cors` — pastikan allow origin frontend.

## Yang di-*keep*
- Semua data konstan `src/data/*.ts` tetap dipakai sebagai **sumber seed script** — tapi runtime frontend fetch dari API, bukan import langsung.
- UI/theme, komponen shadcn, animasi Framer Motion, halaman existing (design tidak berubah).

Kalau plan ini oke, aku mulai dari langkah 1 (migrate & seed lengkap) lalu naik bertahap. Kalau ada bagian yang mau dipersempit dulu (mis. skip Piala Liga, atau Awards nominee ranking pakai versi ringkas), bilang saja sebelum aku mulai.
