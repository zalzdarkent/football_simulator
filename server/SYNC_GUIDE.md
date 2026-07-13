# 🔄 Sync Scripts Guide

All sync scripts now support **resume functionality** to avoid starting from scratch each time and save API requests.

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

### Players Sync
```bash
# Basic usage
pnpm run sync:players                                    # Sync all leagues (careful - many API requests!)
pnpm run sync:players -- --league=epl                   # Sync only EPL

# Resume functionality 
pnpm run sync:players -- --league=epl --threshold=15    # Skip clubs with 15+ players
pnpm run sync:players -- --league=epl --threshold=20    # Skip clubs with 20+ players  
pnpm run sync:players -- --league=epl --force           # Sync all clubs (ignore existing)
```

## 🎯 Resume Logic

### Countries, Leagues, Awards
- **Default**: Skip items already in database
- **--force**: Re-sync everything

### Clubs  
- **Default**: Skip leagues with 15+ clubs, skip individual existing clubs
- **--force**: Re-sync all clubs in all leagues

### Players
- **Default**: Skip clubs with 15+ players (configurable with --threshold)
- **--force**: Sync all clubs regardless of player count
- **--threshold=N**: Set minimum player count to consider club "synced"

## 🚀 Recommended Workflow

1. **First time setup:**
   ```bash
   pnpm run sync:countries
   pnpm run sync:leagues  
   pnpm run sync:clubs
   pnpm run sync:awards
   ```

2. **Sync players (API intensive):**
   ```bash
   # Sync one league at a time to manage API limits
   pnpm run sync:players -- --league=epl
   pnpm run sync:players -- --league=laliga
   # ... etc
   ```

3. **Resume interrupted sync:**
   ```bash
   # If players sync was interrupted, just run again - it will skip completed clubs
   pnpm run sync:players -- --league=epl
   ```

4. **Force complete re-sync:**
   ```bash
   pnpm run sync:clubs:force
   pnpm run sync:players -- --league=epl --force
   ```

## ⚠️ API Rate Limits

- **Free Tier**: 100 requests/day  
- **Players sync**: ~3-4 requests per club (depends on squad size)
- **Clubs sync**: ~1 request per league
- **Resume functionality** helps you continue where you left off when hitting limits

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