# 🔄 Sync Scripts Guide

The sync scripts now use RapidAPI football data and preserve resume behavior where it matters.

## 📋 Available Commands

### Countries Sync
```bash
pnpm run sync:countries        # Skip existing countries
pnpm run sync:countries:force  # Re-sync all countries
```

### Leagues Sync
```bash
pnpm run sync:leagues          # Skip existing leagues/competitions
pnpm run sync:leagues:force    # Re-sync all leagues/competitions
```

### Clubs Sync  
```bash
pnpm run sync:clubs            # Skip existing clubs
pnpm run sync:clubs:force      # Re-sync all clubs
```

### Awards Sync
```bash
pnpm run sync:awards           # Skip existing awards
pnpm run sync:awards:force     # Re-sync all awards
```

### Fixtures Cache
```bash
# Example server endpoint usage
GET /api/fixtures?date=2026-07-19
GET /api/fixtures?date=2026-07-19&league=47
```

## 🎯 Resume Logic

### Countries, Leagues, Awards
- **Default**: Skip items already in database
- **--force**: Re-sync everything

### Clubs  
- **Default**: Skip leagues with 15+ clubs, skip individual existing clubs
- **--force**: Re-sync all clubs in all leagues

### Fixtures
- **Default**: Read from the local `fixtures` cache table
- **Refresh**: Re-fetch the selected date from RapidAPI when the cache is empty or when you request a refresh

## 🚀 Recommended Workflow

1. **First time setup:**
   ```bash
   pnpm run sync:countries
   pnpm run sync:leagues  
   pnpm run sync:clubs
   pnpm run sync:awards
   ```

2. **Sync clubs:**
   ```bash
   pnpm run sync:clubs
   pnpm run sync:clubs:force
   ```

3. **Force complete re-sync:**
   ```bash
   pnpm run sync:clubs:force
   ```

## ⚠️ API Rate Limits

- **RapidAPI limits** depend on your subscription
- **Clubs sync** uses fixtures to reconstruct teams
- **Fixtures cache** avoids repeated requests for the same date

## 📊 Monitoring Progress

Each script shows:
- Total items to process
- Items already synced (skipped)
- Items that need syncing
- Real-time progress with detailed logging

Example output:
```
📋 Found 25 existing countries in DB
🔄 Need to sync: 2/27 countries  
📝 Countries to sync: Indonesia, Australia
✅ Synced 2 countries.
⏭️ Skipped 25 existing countries.
```