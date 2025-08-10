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

  // Connect to backend WebSocket (placeholder URL)
  useEffect(() => {
    const socket = new WebSocket("ws://localhost:3000/ws");
    socket.onopen = () => {
      console.log("Connected to backend");
      socket.send(send_uuid(playerId));
      webSocket.current = socket;
    };
    socket.onmessage = (event) => {
      const newState = parseGameState(event.data, playerId);
      if (newState !== null) {
        setPlayer(newState.player);
      }
    };

    return () => socket.close();
  }, [playerId]);

  const updateInterval = 100;
  useKeyInterval(
    useEvent((keys) => {
      let paddleDelta = 0;

      if (keys.has("w")) {
        paddleDelta += 10;
      }

      if (keys.has("s")) {
        paddleDelta -= 10;
      }

      const deltaTime = updateInterval / 1000;
      setPlayer((player) => {
        if (player == null) {
          return null;
        }

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

  // Basic Pong UI dimensions
  const GAME_WIDTH = 800;
  const GAME_HEIGHT = 600;
  const PADDLE_WIDTH = 20;
  const PADDLE_HEIGHT = 100;
  const BALL_SIZE = 20;

  // Default paddle position if player is null
  const paddleY = player?.paddle_position ?? GAME_HEIGHT / 2 - PADDLE_HEIGHT / 2;

  // Placeholder ball position (center)
  const ballX = GAME_WIDTH / 2 - BALL_SIZE / 2;
  const ballY = GAME_HEIGHT / 2 - BALL_SIZE / 2;

  return (
    <div
      style={{
        position: "relative",
        width: GAME_WIDTH,
        height: GAME_HEIGHT,
        background: "#222",
        border: "2px solid #fff",
        margin: "40px auto",
        overflow: "hidden",
      }}
    >
      {/* Player Paddle */}
      <div
        style={{
          position: "absolute",
          left: 30,
          top: paddleY,
          width: PADDLE_WIDTH,
          height: PADDLE_HEIGHT,
          background: "#fff",
          borderRadius: 8,
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

export default App;
