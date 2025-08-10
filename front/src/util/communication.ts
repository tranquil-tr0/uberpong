export function send_uuid(uuid: string): string {
  return JSON.stringify({
    Join: {
      uuid: uuid,
    },
  });
}

export function send_paddle_update(paddlePosition: number): string {
  return JSON.stringify({
    MovePaddle: {
      paddle_position: paddlePosition,
    },
  });
}

export interface BallState {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

export interface PlayerState {
  paddle_position: number;
  paddle_x: number;
  paddle_y: number;
  paddle_rot: number;
}

interface GameStateMessage {
  ball: BallState;
  players: {
    [key: string]: PlayerState;
  };
}

export interface GameState {
  ball: BallState;
  player: PlayerState | null;
  other_players: PlayerState[];
}

export function parse_game_state(
  json: string,
  playerId: string
): GameState | null {
  try {
    const data: GameStateMessage = JSON.parse(json);
    const player = data.players[playerId] ?? null;
    const other_players: PlayerState[] = [];
    for (const otherPlayerId of Object.keys(data.players)) {
      if (otherPlayerId == playerId) {
        continue;
      }

      other_players.push(data.players[otherPlayerId]);
    }

    return {
      ball: data.ball,
      player,
      other_players,
    };
  } catch (e) {
    console.error("Invalid game state from backend", e);
    return null;
  }
}
