import { useCallback, useEffect, useState } from "react";
import "./App.css";
import {
  parse_game_state as parseGameState,
  send_uuid,
} from "./util/communication";
import { v4 as uuidv4 } from "uuid";
import { useKeyInterval } from "./hooks/useKeyInterval";

function App() {
  const [paddlePos, setPaddlePos] = useState(0);
  const [playerId] = useState(uuidv4());

  // Connect to backend WebSocket (placeholder URL)
  useEffect(() => {
    const socket = new WebSocket("ws://localhost:3000/ws");
    socket.onopen = () => {
      console.log("Connected to backend");
      socket.send(send_uuid(playerId));
    };
    socket.onmessage = (event) => {
      const newState = parseGameState(event.data);
      if (newState !== null) {
        setPaddlePos(newState.players[playerId].paddle_position);
      }
    };

    return () => socket.close();
  }, [playerId]);

  const updateInterval = 100;
  useKeyInterval(
    useCallback((keys) => {
      let paddleDelta = 0;

      if (keys.has("w")) {
        paddleDelta += 10;
      }

      if (keys.has("s")) {
        paddleDelta -= 10;
      }

      const deltaTime = updateInterval / 1000;
      setPaddlePos((pos) => pos + paddleDelta * deltaTime);
    }, []),
    updateInterval
  );

  return <div>{Math.round(paddlePos)}</div>;
}

export default App;
