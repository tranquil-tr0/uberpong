import type { BallState, PlayerState } from "./util/communication";

export interface GameUiProps {
  player: PlayerState | null;
  ball: BallState | null;
  arenaRadius: number;
}

export function GameUi({ player, ball, arenaRadius }: GameUiProps) {
  // Arena is a circle, diameter = 2 * arenaRadius
  // Always display arena as 300px diameter
  const displayRadius = 150;

  // Scale factor from backend units to display units
  const scaleFactor = displayRadius / arenaRadius;

  return (
    <div
      style={{
        position: "relative",
        width: displayRadius * 2,
        height: displayRadius * 2,
        background: "#222",
        border: "2px solid #fff",
        margin: "40px auto",
        overflow: "hidden",
        borderRadius: "50%",
        boxSizing: "border-box",
      }}
    >
      {player ? <Player player={player} scaleFactor={scaleFactor} /> : null}
      {ball ? <Ball ball={ball} scaleFactor={scaleFactor} /> : null}
    </div>
  );
}

function Player({
  player,
  scaleFactor,
}: {
  player: PlayerState;
  scaleFactor: number;
}) {
  const paddleX = player.paddle_x * scaleFactor;
  const paddleY = player.paddle_y * scaleFactor;
  const paddleWidth = player.paddle_width * scaleFactor;
  const paddleThickness = 20;

  return (
    <div
      style={{
        position: "absolute",
        top: "50%",
        left: "50%",
        width: paddleThickness,
        height: paddleWidth,
        background: "#fff",
        borderRadius: 8,
        transform: `translate(-50%, -50%) translate(${paddleX}px, ${paddleY}px) rotate(${player.paddle_rot}rad)`,
      }}
    />
  );
}

function Ball({ ball, scaleFactor }: { ball: BallState; scaleFactor: number }) {
  const ballX = ball.x * scaleFactor;
  const ballY = ball.y * scaleFactor;
  const ballDiameter = ball.radius * 2 * scaleFactor;

  return (
    <div
      style={{
        position: "absolute",
        top: "50%",
        left: "50%",
        width: ballDiameter,
        height: ballDiameter,
        background: "#fff",
        borderRadius: "50%",
        transform: `translate(-50%, -50%) translate(${ballX}px, ${ballY}px)`,
      }}
    />
  );
}
