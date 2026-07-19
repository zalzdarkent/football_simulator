export type LeagueId =
  | "epl" | "laliga" | "seriea" | "bundesliga" | "ligue1"
  | "eredivisie" | "liga-pt" | "super-lig" | "mls" | "saudi";

export type League = {
  id: LeagueId;
  name: string;
  country: string;
  short: string;
  countryCode: string;
};

export const LEAGUES: League[] = [
  { id: "epl", name: "Premier League", country: "England", short: "EPL", countryCode: "EN" },
  { id: "laliga", name: "La Liga", country: "Spain", short: "LAL", countryCode: "ES" },
  { id: "seriea", name: "Serie A", country: "Italy", short: "SA", countryCode: "IT" },
  { id: "bundesliga", name: "Bundesliga", country: "Germany", short: "BUN", countryCode: "DE" },
  { id: "ligue1", name: "Ligue 1", country: "France", short: "L1", countryCode: "FR" },
  { id: "eredivisie", name: "Eredivisie", country: "Netherlands", short: "ERE", countryCode: "NL" },
  { id: "liga-pt", name: "Liga Portugal", country: "Portugal", short: "PRI", countryCode: "PT" },
  { id: "super-lig", name: "Süper Lig", country: "Turkey", short: "SL", countryCode: "TR" },
  { id: "mls", name: "MLS", country: "United States", short: "MLS", countryCode: "US" },
  { id: "saudi", name: "Saudi Pro League", country: "Saudi Arabia", short: "SPL", countryCode: "SA" },
];

export type Club = {
  id: string;
  name: string;
  short: string;
  league: LeagueId;
  city: string;
  tier: 1 | 2 | 3 | 4; // 1 = elite
  reputation: number; // 1-100
  colors: [string, string]; // primary, secondary hex
};

const c = (
  id: string, name: string, short: string, league: LeagueId,
  city: string, tier: 1 | 2 | 3 | 4, reputation: number,
  colors: [string, string]
): Club => ({ id, name, short, league, city, tier, reputation, colors });

export const CLUBS: Club[] = [
  // EPL
  c("man-city", "Manchester City", "MCI", "epl", "Manchester", 1, 95, ["#6CABDD", "#1C2C5B"]),
  c("arsenal", "Arsenal", "ARS", "epl", "London", 1, 92, ["#EF0107", "#FFFFFF"]),
  c("liverpool", "Liverpool", "LIV", "epl", "Liverpool", 1, 93, ["#C8102E", "#00B2A9"]),
  c("man-utd", "Manchester United", "MUN", "epl", "Manchester", 1, 90, ["#DA291C", "#FBE122"]),
  c("chelsea", "Chelsea", "CHE", "epl", "London", 1, 88, ["#034694", "#FFFFFF"]),
  c("tottenham", "Tottenham Hotspur", "TOT", "epl", "London", 2, 85, ["#132257", "#FFFFFF"]),
  c("newcastle", "Newcastle United", "NEW", "epl", "Newcastle", 2, 82, ["#241F20", "#FFFFFF"]),
  c("aston-villa", "Aston Villa", "AVL", "epl", "Birmingham", 2, 80, ["#95BFE5", "#7A003C"]),
  c("brighton", "Brighton", "BHA", "epl", "Brighton", 3, 74, ["#0057B8", "#FFCD00"]),
  c("west-ham", "West Ham", "WHU", "epl", "London", 3, 75, ["#7A263A", "#1BB1E7"]),
  c("everton", "Everton", "EVE", "epl", "Liverpool", 3, 72, ["#003399", "#FFFFFF"]),
  c("crystal-palace", "Crystal Palace", "CRY", "epl", "London", 3, 70, ["#1B458F", "#C4122E"]),
  c("fulham", "Fulham", "FUL", "epl", "London", 4, 68, ["#FFFFFF", "#000000"]),
  c("wolves", "Wolverhampton", "WOL", "epl", "Wolverhampton", 4, 68, ["#FDB913", "#231F20"]),
  c("brentford", "Brentford", "BRE", "epl", "London", 4, 66, ["#E30613", "#FFFFFF"]),
  c("nottm-forest", "Nottingham Forest", "NFO", "epl", "Nottingham", 4, 66, ["#DD0000", "#FFFFFF"]),

  // La Liga
  c("real-madrid", "Real Madrid", "RMA", "laliga", "Madrid", 1, 97, ["#FFFFFF", "#FEBE10"]),
  c("barcelona", "FC Barcelona", "BAR", "laliga", "Barcelona", 1, 94, ["#A50044", "#004D98"]),
  c("atletico", "Atlético Madrid", "ATM", "laliga", "Madrid", 1, 88, ["#CB3524", "#FFFFFF"]),
  c("athletic", "Athletic Club", "ATH", "laliga", "Bilbao", 2, 80, ["#EE2523", "#FFFFFF"]),
  c("real-sociedad", "Real Sociedad", "RSO", "laliga", "San Sebastián", 2, 78, ["#0067B1", "#FFFFFF"]),
  c("villarreal", "Villarreal", "VIL", "laliga", "Villarreal", 2, 76, ["#FFE667", "#005187"]),
  c("betis", "Real Betis", "BET", "laliga", "Sevilla", 3, 74, ["#0BB363", "#FFFFFF"]),
  c("sevilla", "Sevilla FC", "SEV", "laliga", "Sevilla", 3, 76, ["#D50000", "#FFFFFF"]),
  c("valencia", "Valencia CF", "VAL", "laliga", "Valencia", 3, 74, ["#EE3524", "#000000"]),
  c("girona", "Girona", "GIR", "laliga", "Girona", 3, 72, ["#CC1E32", "#FFFFFF"]),
  c("celta", "Celta Vigo", "CEL", "laliga", "Vigo", 4, 68, ["#8AC8E4", "#FFFFFF"]),
  c("mallorca", "RCD Mallorca", "MLL", "laliga", "Palma", 4, 66, ["#CC0000", "#FFCC00"]),
  c("osasuna", "Osasuna", "OSA", "laliga", "Pamplona", 4, 66, ["#DA291C", "#0032A0"]),
  c("rayo", "Rayo Vallecano", "RAY", "laliga", "Madrid", 4, 65, ["#0033A0", "#FF0000"]),
  c("getafe", "Getafe CF", "GET", "laliga", "Getafe", 4, 64, ["#005CA9", "#FFFFFF"]),
  c("almeria", "UD Almería", "ALM", "laliga", "Almería", 4, 63, ["#CC0000", "#FFFFFF"]),
  c("cadiz", "Cádiz CF", "CAD", "laliga", "Cádiz", 4, 62, ["#FDE607", "#000000"]),

  // Serie A
  c("inter", "Inter Milan", "INT", "seriea", "Milan", 1, 92, ["#010E80", "#000000"]),
  c("juventus", "Juventus", "JUV", "seriea", "Turin", 1, 90, ["#000000", "#FFFFFF"]),
  c("milan", "AC Milan", "MIL", "seriea", "Milan", 1, 89, ["#FB090B", "#000000"]),
  c("napoli", "Napoli", "NAP", "seriea", "Naples", 1, 88, ["#12A0D7", "#FFFFFF"]),
  c("roma", "AS Roma", "ROM", "seriea", "Rome", 2, 82, ["#8E1F2F", "#F0BC42"]),
  c("lazio", "Lazio", "LAZ", "seriea", "Rome", 2, 80, ["#87CEEB", "#FFFFFF"]),
  c("atalanta", "Atalanta", "ATA", "seriea", "Bergamo", 2, 82, ["#1C1C1C", "#0057B7"]),
  c("fiorentina", "Fiorentina", "FIO", "seriea", "Florence", 3, 76, ["#6F2C91", "#FFFFFF"]),
  c("bologna", "Bologna", "BOL", "seriea", "Bologna", 3, 74, ["#A50044", "#0033A0"]),
  c("torino", "Torino", "TOR", "seriea", "Turin", 4, 70, ["#8B1A1A", "#FFFFFF"]),
  c("genoa", "Genoa", "GEN", "seriea", "Genoa", 4, 68, ["#A6192E", "#001489"]),
  c("udinese", "Udinese", "UDI", "seriea", "Udine", 4, 66, ["#000000", "#FFFFFF"]),
  c("sassuolo", "Sassuolo", "SAS", "seriea", "Sassuolo", 4, 65, ["#0067B1", "#000000"]),
  c("monza", "Monza", "MON", "seriea", "Monza", 4, 64, ["#DA291C", "#FFFFFF"]),
  c("empoli", "Empoli", "EMP", "seriea", "Empoli", 4, 62, ["#005CA9", "#FFFFFF"]),
  c("lecce", "US Lecce", "LEC", "seriea", "Lecce", 4, 61, ["#FFCD00", "#000000"]),
  c("verona", "Hellas Verona", "VER", "seriea", "Verona", 4, 60, ["#FFED00", "#000000"]),

  // Bundesliga
  c("bayern", "Bayern Munich", "BAY", "bundesliga", "Munich", 1, 94, ["#DC052D", "#FFFFFF"]),
  c("dortmund", "Borussia Dortmund", "BVB", "bundesliga", "Dortmund", 1, 88, ["#FDE100", "#000000"]),
  c("leverkusen", "Bayer Leverkusen", "B04", "bundesliga", "Leverkusen", 1, 88, ["#E32221", "#000000"]),
  c("rb-leipzig", "RB Leipzig", "RBL", "bundesliga", "Leipzig", 2, 84, ["#DD0741", "#FFFFFF"]),
  c("frankfurt", "Eintracht Frankfurt", "SGE", "bundesliga", "Frankfurt", 2, 78, ["#000000", "#E1000F"]),
  c("stuttgart", "VfB Stuttgart", "VFB", "bundesliga", "Stuttgart", 2, 78, ["#E32219", "#FFFFFF"]),
  c("wolfsburg", "VfL Wolfsburg", "WOB", "bundesliga", "Wolfsburg", 3, 74, ["#65B32E", "#FFFFFF"]),
  c("gladbach", "Borussia M'gladbach", "BMG", "bundesliga", "Mönchengladbach", 3, 72, ["#FFFFFF", "#000000"]),
  c("hoffenheim", "TSG Hoffenheim", "TSG", "bundesliga", "Sinsheim", 4, 68, ["#1961B5", "#FFFFFF"]),
  c("mainz", "Mainz 05", "M05", "bundesliga", "Mainz", 4, 66, ["#C3141E", "#FFFFFF"]),
  c("werder", "Werder Bremen", "SVW", "bundesliga", "Bremen", 4, 66, ["#1D9053", "#FFFFFF"]),
  c("freiburg", "SC Freiburg", "SCF", "bundesliga", "Freiburg", 4, 68, ["#000000", "#FFFFFF"]),
  c("koln", "FC Köln", "KOL", "bundesliga", "Cologne", 4, 65, ["#FFFFFF", "#E1000F"]),
  c("augsburg", "FC Augsburg", "FCA", "bundesliga", "Augsburg", 4, 64, ["#E32219", "#FFFFFF"]),
  c("bochum", "VfL Bochum", "BOC", "bundesliga", "Bochum", 4, 62, ["#005CA9", "#FFFFFF"]),
  c("darmstadt", "Darmstadt 98", "D98", "bundesliga", "Darmstadt", 4, 60, ["#005CA9", "#FFFFFF"]),

  // Ligue 1
  c("psg", "Paris Saint-Germain", "PSG", "ligue1", "Paris", 1, 93, ["#004170", "#DA291C"]),
  c("marseille", "Olympique Marseille", "OM", "ligue1", "Marseille", 2, 82, ["#2FAEE0", "#FFFFFF"]),
  c("monaco", "AS Monaco", "MON", "ligue1", "Monaco", 2, 80, ["#CE1126", "#FFFFFF"]),
  c("lyon", "Olympique Lyonnais", "OL", "ligue1", "Lyon", 2, 80, ["#FFFFFF", "#DA291C"]),
  c("lille", "Lille OSC", "LIL", "ligue1", "Lille", 3, 76, ["#DA291C", "#FFFFFF"]),
  c("nice", "OGC Nice", "OGC", "ligue1", "Nice", 3, 72, ["#E4032E", "#000000"]),
  c("rennes", "Stade Rennais", "REN", "ligue1", "Rennes", 3, 72, ["#DA291C", "#000000"]),
  c("lens", "RC Lens", "RCL", "ligue1", "Lens", 4, 70, ["#FDDA24", "#DA291C"]),
  c("nantes", "FC Nantes", "NAN", "ligue1", "Nantes", 4, 66, ["#FDDA24", "#0F5A28"]),
  c("montpellier", "Montpellier", "MON", "ligue1", "Montpellier", 4, 68, ["#005CA9", "#FFFFFF"]),
  c("strasbourg", "Strasbourg", "STR", "ligue1", "Strasbourg", 4, 65, ["#005CA9", "#E1000F"]),
  c("toulouse", "Toulouse FC", "TOU", "ligue1", "Toulouse", 4, 64, ["#E1000F", "#FFFFFF"]),
  c("brest", "Stade Brestois", "BRE", "ligue1", "Brest", 4, 62, ["#E1000F", "#FFFFFF"]),
  c("reims", "Stade Reims", "REI", "ligue1", "Reims", 4, 60, ["#E1000F", "#FFFFFF"]),

  // Eredivisie
  c("ajax", "Ajax", "AJA", "eredivisie", "Amsterdam", 2, 82, ["#D2122E", "#FFFFFF"]),
  c("psv", "PSV Eindhoven", "PSV", "eredivisie", "Eindhoven", 2, 80, ["#ED1C24", "#FFFFFF"]),
  c("feyenoord", "Feyenoord", "FEY", "eredivisie", "Rotterdam", 2, 80, ["#CC0000", "#FFFFFF"]),
  c("az", "AZ Alkmaar", "AZ", "eredivisie", "Alkmaar", 4, 68, ["#DA291C", "#FFFFFF"]),
  c("twente", "FC Twente", "TWE", "eredivisie", "Enschede", 4, 66, ["#DA291C", "#FFFFFF"]),
  c("utrecht", "FC Utrecht", "UTR", "eredivisie", "Utrecht", 4, 65, ["#DA291C", "#FFFFFF"]),
  c("heerenveen", "sc Heerenveen", "HEE", "eredivisie", "Heerenveen", 4, 64, ["#005CA9", "#FFFFFF"]),
  c("sparta", "Sparta Rotterdam", "SPA", "eredivisie", "Rotterdam", 4, 64, ["#DA291C", "#FFFFFF"]),
  c("nec", "NEC Nijmegen", "NEC", "eredivisie", "Nijmegen", 4, 62, ["#000000", "#DA291C"]),
  c("gae", "Go Ahead Eagles", "GAE", "eredivisie", "Deventer", 4, 61, ["#DA291C", "#FFD700"]),
  c("fortuna", "Fortuna Sittard", "FOR", "eredivisie", "Sittard", 4, 61, ["#FFD700", "#008000"]),
  c("rkc", "RKC Waalwijk", "RKC", "eredivisie", "Waalwijk", 4, 60, ["#FFD700", "#000000"]),
  c("volendam", "FC Volendam", "VOL", "eredivisie", "Volendam", 4, 59, ["#FF7F00", "#000000"]),
  c("almere", "Almere City", "ALM", "eredivisie", "Almere", 4, 58, ["#DA291C", "#FFFFFF"]),
  c("pec", "PEC Zwolle", "PEC", "eredivisie", "Zwolle", 4, 60, ["#005CA9", "#FFFFFF"]),
  c("heracles", "Heracles", "HER", "eredivisie", "Almelo", 4, 60, ["#000000", "#FFFFFF"]),
  c("excelsior", "Excelsior", "EXC", "eredivisie", "Rotterdam", 4, 58, ["#000000", "#DA291C"]),

  // Liga PT
  c("benfica", "Benfica", "SLB", "liga-pt", "Lisbon", 2, 84, ["#E30613", "#FFFFFF"]),
  c("porto", "FC Porto", "POR", "liga-pt", "Porto", 2, 84, ["#00428C", "#FFFFFF"]),
  c("sporting", "Sporting CP", "SCP", "liga-pt", "Lisbon", 2, 82, ["#008057", "#FFFFFF"]),
  c("braga", "SC Braga", "SCB", "liga-pt", "Braga", 4, 70, ["#B21030", "#FFFFFF"]),

  // Süper Lig
  c("galatasaray", "Galatasaray", "GS", "super-lig", "Istanbul", 3, 78, ["#FDB913", "#A32638"]),
  c("fenerbahce", "Fenerbahçe", "FB", "super-lig", "Istanbul", 3, 78, ["#FFED00", "#00234B"]),
  c("besiktas", "Beşiktaş", "BJK", "super-lig", "Istanbul", 3, 76, ["#000000", "#FFFFFF"]),

  // MLS
  c("inter-miami", "Inter Miami", "MIA", "mls", "Miami", 3, 76, ["#F7B5CD", "#231F20"]),
  c("lafc", "Los Angeles FC", "LAFC", "mls", "Los Angeles", 3, 74, ["#000000", "#C39E6D"]),
  c("la-galaxy", "LA Galaxy", "LAG", "mls", "Los Angeles", 4, 70, ["#00245D", "#FDB913"]),
  c("nycfc", "New York City FC", "NYC", "mls", "New York", 4, 68, ["#6CACE4", "#FFFFFF"]),

  // Saudi
  c("al-hilal", "Al Hilal", "HIL", "saudi", "Riyadh", 2, 84, ["#005CB9", "#FFFFFF"]),
  c("al-nassr", "Al Nassr", "NAS", "saudi", "Riyadh", 2, 82, ["#FEC901", "#003DA5"]),
  c("al-ittihad", "Al Ittihad", "ITT", "saudi", "Jeddah", 3, 78, ["#000000", "#FFCD11"]),
  c("al-ahli", "Al Ahli", "AHL", "saudi", "Jeddah", 3, 76, ["#00A44A", "#FFFFFF"]),
];

export const clubById = (id: string) => CLUBS.find((c) => c.id === id);
export const clubsByLeague = (l: LeagueId) => CLUBS.filter((c) => c.league === l);
export const clubsByTier = (tier: number) => CLUBS.filter((c) => c.tier === tier);
export const leagueById = (id: LeagueId) => LEAGUES.find((l) => l.id === id)!;
