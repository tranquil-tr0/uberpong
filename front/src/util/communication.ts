export function send_uuid(uuid: string): string {
  return JSON.stringify({
    Join: {
      uuid: uuid,
    },
  });
}

interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

interface Player {
  paddle_position: number;
}

interface GameState {
  ball: Ball;
  players: {
    [key: string]: Player;
  };
}

export function parse_game_state(json: string): GameState | null {
  try {
    const data = JSON.parse(json);
    return data;
  } catch (e) {
    console.error("Invalid game state from backend", e);
    return null;
  }
}
