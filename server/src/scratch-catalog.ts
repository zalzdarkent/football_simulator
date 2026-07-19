import { footballApi } from "./football-api.js";

async function main() {
  try {
    console.log("Loading catalog...");
    const catalog = await footballApi.getLeagues();
    
    // Find all leagues for Indonesia
    const indonesiaLeagues = catalog.filter(item => 
      item.country.name.toLowerCase() === "indonesia" || 
      item.country.code.toLowerCase() === "id"
    );
    
    console.log("Indonesia Leagues in Catalog:");
    console.log(JSON.stringify(indonesiaLeagues, null, 2));

  } catch (error) {
    console.error(error);
  }
}

main();
