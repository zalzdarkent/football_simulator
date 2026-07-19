export interface FallbackClub {
  name: string;
  short: string;
  city: string;
}

export const FALLBACK_CLUBS: Record<string, FallbackClub[]> = {
  // Padding for sparse simulator leagues (to ensure they have at least 12 clubs if API fails)
  "liga-pt": [
    { name: "Vitória de Guimarães", short: "VIT", city: "Guimarães" },
    { name: "Boavista", short: "BOA", city: "Porto" },
    { name: "Famalicão", short: "FAM", city: "Vila Nova de Famalicão" },
    { name: "Gil Vicente", short: "GIL", city: "Barcelos" },
    { name: "Estoril Praia", short: "EST", city: "Estoril" },
    { name: "Rio Ave", short: "RIO", city: "Vila do Conde" },
    { name: "Vizela", short: "VIZ", city: "Vizela" },
    { name: "Farense", short: "FAR", city: "Faro" }
  ],
  "super-lig": [
    { name: "Trabzonspor", short: "TRA", city: "Trabzon" },
    { name: "İstanbul Başakşehir", short: "IBK", city: "Istanbul" },
    { name: "Adana Demirspor", short: "ADS", city: "Adana" },
    { name: "Konyaspor", short: "KON", city: "Konya" },
    { name: "Antalyaspor", short: "ANT", city: "Antalya" },
    { name: "Alanyaspor", short: "ALA", city: "Alanya" },
    { name: "Sivasspor", short: "SIV", city: "Sivas" },
    { name: "Ankaragücü", short: "ANK", city: "Ankara" },
    { name: "Fatih Karagümrük", short: "FKG", city: "Istanbul" }
  ],
  "mls": [
    { name: "Seattle Sounders", short: "SEA", city: "Seattle" },
    { name: "Atlanta United", short: "ATL", city: "Atlanta" },
    { name: "Toronto FC", short: "TOR", city: "Toronto" },
    { name: "New York Red Bulls", short: "NYR", city: "Harrison" },
    { name: "Portland Timbers", short: "POR", city: "Portland" },
    { name: "Sporting Kansas City", short: "SKC", city: "Kansas City" },
    { name: "Columbus Crew", short: "CLB", city: "Columbus" },
    { name: "FC Cincinnati", short: "CIN", city: "Cincinnati" }
  ],
  "saudi": [
    { name: "Al Shabab", short: "SHB", city: "Riyadh" },
    { name: "Al Ettifaq", short: "ETF", city: "Dammam" },
    { name: "Al Fateh", short: "FAT", city: "Al-Hasa" },
    { name: "Al Taawoun", short: "TAW", city: "Buraidah" },
    { name: "Al Fayha", short: "FAY", city: "Al Majma'ah" },
    { name: "Al Khaleej", short: "KHL", city: "Saihat" },
    { name: "Al Raed", short: "RAE", city: "Buraidah" },
    { name: "Damac", short: "DAM", city: "Khamis Mushait" }
  ],

  // 13 API-only leagues (10-12 clubs each)
  "112": [ // Argentina - Liga Profesional
    { name: "River Plate", short: "RIV", city: "Buenos Aires" },
    { name: "Boca Juniors", short: "BOC", city: "Buenos Aires" },
    { name: "Racing Club", short: "RAC", city: "Avellaneda" },
    { name: "Independiente", short: "IND", city: "Avellaneda" },
    { name: "San Lorenzo", short: "SLO", city: "Buenos Aires" },
    { name: "Estudiantes LP", short: "EST", city: "La Plata" },
    { name: "Vélez Sarsfield", short: "VEL", city: "Buenos Aires" },
    { name: "Newell's Old Boys", short: "NOB", city: "Rosario" },
    { name: "Rosario Central", short: "ROS", city: "Rosario" },
    { name: "Lanús", short: "LAN", city: "Lanús" },
    { name: "Huracán", short: "HUR", city: "Buenos Aires" },
    { name: "Talleres Córdoba", short: "TAL", city: "Córdoba" }
  ],
  "113": [ // Australia - A-League
    { name: "Sydney FC", short: "SYD", city: "Sydney" },
    { name: "Melbourne City", short: "MCY", city: "Melbourne" },
    { name: "Melbourne Victory", short: "MVC", city: "Melbourne" },
    { name: "Brisbane Roar", short: "BRI", city: "Brisbane" },
    { name: "Adelaide United", short: "ADE", city: "Adelaide" },
    { name: "Western Sydney Wanderers", short: "WSW", city: "Sydney" },
    { name: "Perth Glory", short: "PER", city: "Perth" },
    { name: "Central Coast Mariners", short: "CCM", city: "Gosford" },
    { name: "Wellington Phoenix", short: "WEL", city: "Wellington" },
    { name: "Newcastle Jets", short: "NEW", city: "Newcastle" },
    { name: "Macarthur FC", short: "MAC", city: "Campbelltown" },
    { name: "Western United", short: "WUT", city: "Wyndham" }
  ],
  "40": [ // Belgium - First Division A
    { name: "Club Brugge", short: "CLB", city: "Bruges" },
    { name: "Anderlecht", short: "AND", city: "Brussels" },
    { name: "Genk", short: "GNK", city: "Genk" },
    { name: "Gent", short: "GNT", city: "Ghent" },
    { name: "Standard Liège", short: "STA", city: "Liège" },
    { name: "Royal Antwerp", short: "ANT", city: "Antwerp" },
    { name: "Union Saint-Gilloise", short: "USG", city: "Brussels" },
    { name: "KV Mechelen", short: "KVM", city: "Mechelen" },
    { name: "Charleroi", short: "CHA", city: "Charleroi" },
    { name: "Kortrijk", short: "KOR", city: "Kortrijk" },
    { name: "Cercle Brugge", short: "CER", city: "Bruges" },
    { name: "Westerlo", short: "WES", city: "Westerlo" }
  ],
  "268": [ // Brazil - Serie A
    { name: "Flamengo", short: "FLA", city: "Rio de Janeiro" },
    { name: "Palmeiras", short: "PAL", city: "São Paulo" },
    { name: "São Paulo", short: "SAO", city: "São Paulo" },
    { name: "Corinthians", short: "COR", city: "São Paulo" },
    { name: "Santos", short: "SAN", city: "Santos" },
    { name: "Grêmio", short: "GRE", city: "Porto Alegre" },
    { name: "Internacional", short: "INT", city: "Porto Alegre" },
    { name: "Fluminense", short: "FLU", city: "Rio de Janeiro" },
    { name: "Botafogo", short: "BOT", city: "Rio de Janeiro" },
    { name: "Atlético Mineiro", short: "CAM", city: "Belo Horizonte" },
    { name: "Cruzeiro", short: "CRU", city: "Belo Horizonte" },
    { name: "Vasco da Gama", short: "VAS", city: "Rio de Janeiro" }
  ],
  "9490": [ // Colombia - Copa Colombia (Categoría Primera A)
    { name: "Atlético Nacional", short: "NAC", city: "Medellín" },
    { name: "Millonarios", short: "MIL", city: "Bogotá" },
    { name: "Santa Fe", short: "SFE", city: "Bogotá" },
    { name: "Junior Barranquilla", short: "JUN", city: "Barranquilla" },
    { name: "América de Cali", short: "AME", city: "Cali" },
    { name: "Deportivo Cali", short: "CAL", city: "Cali" },
    { name: "Independiente Medellín", short: "DIM", city: "Medellín" },
    { name: "Once Caldas", short: "ONC", city: "Manizales" },
    { name: "Deportes Tolima", short: "TOL", city: "Ibagué" },
    { name: "La Equidad", short: "EQU", city: "Bogotá" },
    { name: "Águilas Doradas", short: "AGU", city: "Rionegro" },
    { name: "Envigado", short: "ENV", city: "Envigado" }
  ],
  "519": [ // Egypt - Premier League
    { name: "Al Ahly", short: "AHL", city: "Cairo" },
    { name: "Zamalek", short: "ZAM", city: "Giza" },
    { name: "Pyramids FC", short: "PYR", city: "Cairo" },
    { name: "Al Masry", short: "MAS", city: "Port Said" },
    { name: "Al Ittihad", short: "ITH", city: "Alexandria" },
    { name: "Smouha", short: "SMO", city: "Alexandria" },
    { name: "Ceramica Cleopatra", short: "CER", city: "Giza" },
    { name: "ZED FC", short: "ZED", city: "Giza" },
    { name: "Modern Future", short: "FUT", city: "Cairo" },
    { name: "Ismaily", short: "ISM", city: "Ismailia" },
    { name: "El Gouna", short: "GOU", city: "El Gouna" },
    { name: "Pharco FC", short: "PHA", city: "Alexandria" }
  ],
  "10059": [ // Indonesia - Liga 1
    { name: "Persib Bandung", short: "PSB", city: "Bandung" },
    { name: "Persija Jakarta", short: "PSJ", city: "Jakarta" },
    { name: "Bali United", short: "BLI", city: "Gianyar" },
    { name: "Persebaya Surabaya", short: "PBY", city: "Surabaya" },
    { name: "Arema FC", short: "ARE", city: "Malang" },
    { name: "PSM Makassar", short: "PSM", city: "Makassar" },
    { name: "Borneo FC Samarinda", short: "BOR", city: "Samarinda" },
    { name: "PSS Sleman", short: "PSS", city: "Sleman" },
    { name: "PSIS Semarang", short: "PSI", city: "Semarang" },
    { name: "Persis Solo", short: "SOL", city: "Surakarta" },
    { name: "Madura United", short: "MAD", city: "Pamekasan" },
    { name: "Dewa United", short: "DEW", city: "Tangerang Selatan" }
  ],
  "223": [ // Japan - J. League
    { name: "Kawasaki Frontale", short: "KAF", city: "Kawasaki" },
    { name: "Yokohama F. Marinos", short: "YFM", city: "Yokohama" },
    { name: "Urawa Red Diamonds", short: "RED", city: "Saitama" },
    { name: "Vissel Kobe", short: "VIS", city: "Kobe" },
    { name: "Kashima Antlers", short: "ANT", city: "Kashima" },
    { name: "Nagoya Grampus", short: "GRA", city: "Nagoya" },
    { name: "Sanfrecce Hiroshima", short: "SAN", city: "Hiroshima" },
    { name: "Gamba Osaka", short: "GAM", city: "Suita" },
    { name: "Cerezo Osaka", short: "CER", city: "Osaka" },
    { name: "FC Tokyo", short: "TOK", city: "Tokyo" },
    { name: "Consadole Sapporo", short: "SAP", city: "Sapporo" },
    { name: "Avispa Fukuoka", short: "AVI", city: "Fukuoka" }
  ],
  "230": [ // Mexico - Liga MX
    { name: "Club América", short: "AME", city: "Mexico City" },
    { name: "Chivas Guadalajara", short: "GDL", city: "Guadalajara" },
    { name: "Cruz Azul", short: "CAZ", city: "Mexico City" },
    { name: "Pumas UNAM", short: "PUM", city: "Mexico City" },
    { name: "Tigres UANL", short: "TIG", city: "San Nicolás de los Garza" },
    { name: "Monterrey", short: "MTY", city: "Monterrey" },
    { name: "Toluca", short: "TOL", city: "Toluca" },
    { name: "Pachuca", short: "PAC", city: "Pachuca" },
    { name: "León", short: "LEO", city: "León" },
    { name: "Santos Laguna", short: "SAN", city: "Torreón" },
    { name: "Atlas FC", short: "ATL", city: "Guadalajara" },
    { name: "Club Tijuana", short: "TIJ", city: "Tijuana" }
  ],
  "530": [ // Morocco - Botola Pro
    { name: "Wydad AC", short: "WAC", city: "Casablanca" },
    { name: "Raja Club Athletic", short: "RCA", city: "Casablanca" },
    { name: "AS FAR Rabat", short: "FAR", city: "Rabat" },
    { name: "RS Berkane", short: "RSB", city: "Berkane" },
    { name: "FUS Rabat", short: "FUS", city: "Rabat" },
    { name: "MAS Fès", short: "MAS", city: "Fez" },
    { name: "Ittihad Tanger", short: "IRT", city: "Tangier" },
    { name: "Moghreb Tétouan", short: "MAT", city: "Tétouan" },
    { name: "Hassania Agadir", short: "HUSA", city: "Agadir" },
    { name: "Olympic Safi", short: "OCS", city: "Safi" },
    { name: "Union de Touarga", short: "UTS", city: "Rabat" },
    { name: "JS Soualem", short: "JSS", city: "Soualem" }
  ],
  "64": [ // Scotland - Premiership
    { name: "Celtic", short: "CEL", city: "Glasgow" },
    { name: "Rangers", short: "RAN", city: "Glasgow" },
    { name: "Heart of Midlothian", short: "HEA", city: "Edinburgh" },
    { name: "Hibernian", short: "HIB", city: "Edinburgh" },
    { name: "Aberdeen", short: "ABE", city: "Aberdeen" },
    { name: "St Mirren", short: "STM", city: "Paisley" },
    { name: "Motherwell", short: "MTH", city: "Motherwell" },
    { name: "Kilmarnock", short: "KIL", city: "Kilmarnock" },
    { name: "Dundee United", short: "DUT", city: "Dundee" },
    { name: "Dundee FC", short: "DUN", city: "Dundee" },
    { name: "Ross County", short: "ROS", city: "Dingwall" },
    { name: "St Johnstone", short: "STJ", city: "Perth" }
  ],
  "9080": [ // South-Korea - K League 1
    { name: "Jeonbuk Hyundai Motors", short: "JHM", city: "Jeonju" },
    { name: "Ulsan HD", short: "ULS", city: "Ulsan" },
    { name: "FC Seoul", short: "SEO", city: "Seoul" },
    { name: "Pohang Steelers", short: "POH", city: "Pohang" },
    { name: "Incheon United", short: "INC", city: "Incheon" },
    { name: "Jeju United", short: "JEJ", city: "Seogwipo" },
    { name: "Daegu FC", short: "DAE", city: "Daegu" },
    { name: "Gangwon FC", short: "GAN", city: "Chuncheon" },
    { name: "Daejeon Hana Citizen", short: "DHJ", city: "Daejeon" },
    { name: "Gwangju FC", short: "GWA", city: "Gwangju" },
    { name: "Suwon FC", short: "SUW", city: "Suwon" },
    { name: "Gimcheon Sangmu", short: "GIM", city: "Gimcheon" }
  ],
  "10708": [ // South Africa - Premiership (Betway Premiership)
    { name: "Mamelodi Sundowns", short: "MSD", city: "Pretoria" },
    { name: "Orlando Pirates", short: "ORL", city: "Johannesburg" },
    { name: "Kaizer Chiefs", short: "KZC", city: "Johannesburg" },
    { name: "SuperSport United", short: "SSU", city: "Pretoria" },
    { name: "Cape Town City", short: "CTC", city: "Cape Town" },
    { name: "Stellenbosch FC", short: "STB", city: "Stellenbosch" },
    { name: "Sekhukhune United", short: "SKU", city: "Polokwane" },
    { name: "AmaZulu FC", short: "AMA", city: "Durban" },
    { name: "Golden Arrows", short: "GDA", city: "Durban" },
    { name: "TS Galaxy", short: "TSG", city: "Mbombela" },
    { name: "Richards Bay", short: "RBY", city: "Richards Bay" },
    { name: "Polokwane City", short: "PLK", city: "Polokwane" }
  ]
};
