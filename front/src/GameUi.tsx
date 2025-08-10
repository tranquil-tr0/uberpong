import type { BallState, PlayerState } from "./util/communication";

export interface GameUiProps {
  player: PlayerState | null;
  ball: BallState | null;
  arenaRadius: number;
}

export function GameUi({ player, ball, arenaRadius }: GameUiProps) {
  // Arena is a circle, diameter = 2 * arenaRadius
  // Always display arena as 300px diameter
  const DISPLAY_RADIUS = 150; // 300px diameter
  const ARENA_DIAMETER = DISPLAY_RADIUS * 2;

  // Scale factor from backend units to display units
  const SCALE = DISPLAY_RADIUS / arenaRadius;
  const PADDLE_WIDTH = 20;
  const PADDLE_HEIGHT = 100;
  const BALL_SIZE = 20;

  // Center of the arena
  const centerX = DISPLAY_RADIUS;
  const centerY = DISPLAY_RADIUS;

  // Map paddle_position (-5 to +5) to angle on the circle (left edge = 180deg)
  // Paddle moves along the circumference
  const paddlePos = player?.paddle_position ?? 0;
  const minPos = -5,
    maxPos = 5;
  // Angle range: 135deg to 225deg (arc on left side)
  const minAngle = (3 * Math.PI) / 4; // 135deg
  const maxAngle = (5 * Math.PI) / 4; // 225deg
  const angle =
    ((paddlePos - minPos) / (maxPos - minPos)) * (maxAngle - minAngle) +
    minAngle;
  // Place paddle on circumference
  const paddleCenterX = centerX + DISPLAY_RADIUS * Math.cos(angle);
  const paddleCenterY = centerY + DISPLAY_RADIUS * Math.sin(angle);
  const paddleX = paddleCenterX - PADDLE_WIDTH / 2;
  const paddleY = paddleCenterY - PADDLE_HEIGHT / 2;

  // Ball position from server, scaled to display units
  // Ball position from game state, scaled to display units
  const ballX = centerX + (ball?.x ?? 0) * SCALE - BALL_SIZE / 2;
  const ballY = centerY + (ball?.y ?? 0) * SCALE - BALL_SIZE / 2;

  return (
    <div
      style={{
        position: "relative",
        width: ARENA_DIAMETER,
        height: ARENA_DIAMETER,
        background: "#222",
        border: "2px solid #fff",
        margin: "40px auto",
        overflow: "hidden",
        borderRadius: "50%",
        boxSizing: "border-box",
      }}
    >
      {/* Player Paddle (always show, even if player is null) */}
      <div
        style={{
          position: "absolute",
          left: paddleX,
          top: paddleY,
          width: PADDLE_WIDTH,
          height: PADDLE_HEIGHT,
          background: "#fff",
          borderRadius: 8,
          transform: `rotate(${angle}rad)`,
        }}
      />
      {/* Ball (placeholder) */}
      <div
        style={{
          position: "absolute",
          left: ballX,
          top: ballY,
          width: BALL_SIZE,
          height: BALL_SIZE,
          background: "#fff",
          borderRadius: "50%",
        }}
      />
    </div>
  );
}
