import { useEffect, useRef, useState } from "react";
import "./App.css";
import {
  parse_game_state as parseGameState,
  send_paddle_update as sendPaddleUpdate,
  send_uuid,
  type PlayerState,
} from "./util/communication";
import { v4 as uuidv4 } from "uuid";
import { useKeyInterval } from "./hooks/useKeyInterval";
import useEvent from "react-use-event-hook";

function App() {
  const webSocket = useRef<WebSocket | null>(null);
  const [playerId] = useState(uuidv4());

  const [player, setPlayer] = useState<PlayerState | null>(null);
  const [arenaRadius, setArenaRadius] = useState<number>(300);
  const [ball, setBall] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Connect to backend WebSocket (placeholder URL)
  useEffect(() => {
    // Always connect socket when component mounts
    const socket = new WebSocket("ws://localhost:3000/ws");
    webSocket.current = socket;
    socket.onopen = () => {
      console.log("Connected to backend");
      socket.send(send_uuid(playerId));
    };
    socket.onmessage = (event) => {
      const newState = parseGameState(event.data, playerId);
      if (newState !== null) {
        setPlayer(newState.player);
        setArenaRadius(newState.arena_radius);
        setBall({ ...newState.ball });
      }
    };
    return () => {
      socket.close();
      webSocket.current = null;
    };
  }, [playerId]);

  const updateInterval = 20;
  useKeyInterval(
    useEvent((keys) => {
      let paddleDelta = 0;

      // Speed is proportional to arena size
      const baseSpeed = DISPLAY_RADIUS * 0.04; // 4% of display radius per second

      if (keys.has("w")) {
        paddleDelta += baseSpeed;
      }

      if (keys.has("s")) {
        paddleDelta -= baseSpeed;
      }

      const deltaTime = updateInterval / 1000;
      setPlayer((player) => {
        if (player == null) {
          return null;
        }

        if (!player) return player;
        const newPos = player.paddle_position + paddleDelta * deltaTime;
        webSocket.current?.send(sendPaddleUpdate(newPos));
        return {
          ...player,
          paddle_position: newPos,
        };
      });
    }),
    updateInterval
  );

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
  const ballX = centerX + ball.x * SCALE - BALL_SIZE / 2;
  const ballY = centerY + ball.y * SCALE - BALL_SIZE / 2;

  try {
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
  } catch (e) {
    console.error("Error in App render:", e);
    return <div style={{ color: "red" }}>Render error: {String(e)}</div>;
  }
}

export default App;
