export interface GameAward {
  award: string
  event: string
  year: number
  category?: string
}

// Map from IGDB game ID to awards
export const GAME_AWARDS: Record<number, GameAward[]> = {
  // The Witcher 3 (IGDB ID: 1942)
  1942: [
    { award: "Game of the Year", event: "The Game Awards", year: 2015 },
    { award: "Best RPG", event: "The Game Awards", year: 2015 },
    { award: "Game of the Year", event: "Golden Joystick Awards", year: 2015 },
  ],
  // Elden Ring (IGDB ID: 119133)
  119133: [
    { award: "Game of the Year", event: "The Game Awards", year: 2022 },
    { award: "Best Game Direction", event: "The Game Awards", year: 2022 },
    { award: "Best RPG", event: "The Game Awards", year: 2022 },
  ],
  // Baldur's Gate 3 (IGDB ID: 113895)
  113895: [
    { award: "Game of the Year", event: "The Game Awards", year: 2023 },
    { award: "Best RPG", event: "The Game Awards", year: 2023 },
    { award: "Best Multiplayer", event: "The Game Awards", year: 2023 },
    { award: "Game of the Year", event: "Golden Joystick Awards", year: 2023 },
  ],
  // God of War Ragnarök (IGDB ID: 119171)
  119171: [
    { award: "Best Narrative", event: "The Game Awards", year: 2022 },
    { award: "Best Score/Music", event: "The Game Awards", year: 2022 },
    { award: "Best Performance", event: "The Game Awards", year: 2022 },
  ],
  // The Last of Us Part II (IGDB ID: 26192)
  26192: [
    { award: "Game of the Year", event: "The Game Awards", year: 2020 },
    { award: "Best Game Direction", event: "The Game Awards", year: 2020 },
    { award: "Best Narrative", event: "The Game Awards", year: 2020 },
    { award: "Best Action/Adventure", event: "The Game Awards", year: 2020 },
  ],
  // Red Dead Redemption 2 (IGDB ID: 25076)
  25076: [
    { award: "Best Narrative", event: "The Game Awards", year: 2018 },
    { award: "Best Score/Music", event: "The Game Awards", year: 2018 },
    { award: "Best Performance", event: "The Game Awards", year: 2018 },
  ],
  // Sekiro (IGDB ID: 112875)
  112875: [
    { award: "Game of the Year", event: "The Game Awards", year: 2019 },
    { award: "Best Action Game", event: "The Game Awards", year: 2019 },
  ],
  // Hades (IGDB ID: 109462)
  109462: [
    { award: "Best Indie", event: "The Game Awards", year: 2020 },
    { award: "Best Action Game", event: "The Game Awards", year: 2020 },
  ],
  // It Takes Two (IGDB ID: 135400)
  135400: [
    { award: "Game of the Year", event: "The Game Awards", year: 2021 },
    { award: "Best Multiplayer", event: "The Game Awards", year: 2021 },
  ],
  // Astro Bot (IGDB ID: 265020)
  265020: [
    { award: "Game of the Year", event: "The Game Awards", year: 2024 },
    { award: "Best Game Direction", event: "The Game Awards", year: 2024 },
    { award: "Best Action/Adventure", event: "The Game Awards", year: 2024 },
  ],
  // Breath of the Wild (IGDB ID: 7346)
  7346: [
    { award: "Game of the Year", event: "The Game Awards", year: 2017 },
    { award: "Best Game Direction", event: "The Game Awards", year: 2017 },
    { award: "Best Action/Adventure", event: "The Game Awards", year: 2017 },
  ],
  // God of War 2018 (IGDB ID: 19560)
  19560: [
    { award: "Game of the Year", event: "The Game Awards", year: 2018 },
    { award: "Best Game Direction", event: "The Game Awards", year: 2018 },
    { award: "Best Action/Adventure", event: "The Game Awards", year: 2018 },
  ],
  // GTA V (IGDB ID: 1020)
  1020: [
    { award: "Game of the Year", event: "Golden Joystick Awards", year: 2013 },
    { award: "Best Game", event: "BAFTA Games Awards", year: 2014 },
  ],
  // Portal 2 (IGDB ID: 72)
  72: [
    { award: "Best PC Game", event: "Spike VGA", year: 2011 },
    { award: "Best Multiplayer", event: "Spike VGA", year: 2011 },
  ],
  // Skyrim (IGDB ID: 472)
  472: [
    { award: "Game of the Year", event: "Spike VGA", year: 2011 },
    { award: "Best RPG", event: "Spike VGA", year: 2011 },
  ],
  // Hollow Knight (IGDB ID: 26738)
  26738: [
    { award: "Best Debut Indie Game", event: "The Game Awards", year: 2017, category: "Nominee" },
  ],
  // Celeste (IGDB ID: 23838)
  23838: [
    { award: "Best Independent Game", event: "The Game Awards", year: 2018 },
    { award: "Games for Impact", event: "The Game Awards", year: 2018 },
  ],
  // Disco Elysium (IGDB ID: 23891)
  23891: [
    { award: "Best RPG", event: "The Game Awards", year: 2019 },
    { award: "Best Narrative", event: "The Game Awards", year: 2019 },
    { award: "Fresh Indie Game", event: "The Game Awards", year: 2019 },
  ],
}

export function getGameAwards(igdbId: number): GameAward[] {
  return GAME_AWARDS[igdbId] ?? []
}
