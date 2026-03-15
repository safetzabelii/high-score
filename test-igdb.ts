import { getGamesByGenre, getFeaturedGames, getTopRatedGames } from "./src/lib/igdb/fetch";

async function run() {
  console.log("Fetching genres...");
  try {
    const rpgs = await getGamesByGenre(12, 5);
    console.log("RPGs:", rpgs.length);

    const featured = await getFeaturedGames(5);
    console.log("Featured:", featured.length);

    const topRated = await getTopRatedGames(5);
    console.log("Top Rated:", topRated.length);
  } catch(e) {
    console.error(e);
  }
}

run();
