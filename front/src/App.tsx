import { useEffect, useRef, useState } from "react";
import "./App.css";
import {
  parse_game_state as parseGameState,
  send_paddle_update as sendPaddleUpdate,
  send_uuid,
  type BallState,
  type PlayerState,
} from "./util/communication";
import { v4 as uuidv4 } from "uuid";
import { useKeyInterval } from "./hooks/useKeyInterval";
import useEvent from "react-use-event-hook";
import { GameUi } from "./GameUi";

function App() {
  const webSocket = useRef<WebSocket | null>(null);
  const [playerId] = useState(uuidv4());

  const [player, setPlayer] = useState<PlayerState | null>(null);
  const [arenaRadius, setArenaRadius] = useState<number>(5);
  const [ball, setBall] = useState<BallState | null>(null);

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
        setBall(newState.ball);
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
      const baseSpeed = 6;
      let paddleDelta = 0;

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

  return <GameUi player={player} ball={ball} arenaRadius={arenaRadius} />;
}

export default App;
