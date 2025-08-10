import { useRef, useEffect, useState } from "react";
import "./App.css";

const TABLE_WIDTH = 800;
const TABLE_HEIGHT = 400;
const PADDLE_WIDTH = 10;
const PADDLE_HEIGHT = 80;
const BALL_SIZE = 16;
const PADDLE_SPEED = 6;

type Paddle = {
  y: number;
};

type Ball = {
  x: number;
  y: number;
  vx: number;
  vy: number;
};

function clamp(val: number, min: number, max: number) {
  return Math.max(min, Math.min(max, val));
}

const initialBall: Ball = {
  x: TABLE_WIDTH / 2 - BALL_SIZE / 2,
  y: TABLE_HEIGHT / 2 - BALL_SIZE / 2,
  vx: 4,
  vy: 3,
};

function App() {
  const [leftPaddle, setLeftPaddle] = useState<Paddle>({
    y: TABLE_HEIGHT / 2 - PADDLE_HEIGHT / 2,
  });
  const [rightPaddle, setRightPaddle] = useState<Paddle>({
    y: TABLE_HEIGHT / 2 - PADDLE_HEIGHT / 2,
  });
  const [ball, setBall] = useState<Ball>(initialBall);
  const [scores, setScores] = useState({ left: 0, right: 0 });
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [leftConnected, setLeftConnected] = useState(false);
  const [rightConnected, setRightConnected] = useState(false);
  const keys = useRef<{ up: boolean; down: boolean }>({
    up: false,
    down: false,
  });

  // Connect to backend WebSocket (placeholder URL)
  useEffect(() => {
    const socket = new WebSocket("ws://localhost:3000/ws");
    socket.onopen = () => {
      console.log("Connected to backend");
    };
    socket.onmessage = (event) => {
      // Expect backend to send JSON: { leftPaddleY, rightPaddleY, ball, scores, left_connected, right_connected }
      try {
        const data = JSON.parse(event.data);
        if (typeof data.leftPaddleY === "number")
          setLeftPaddle({ y: data.leftPaddleY });
        if (typeof data.rightPaddleY === "number")
          setRightPaddle({ y: data.rightPaddleY });
        if (data.ball) setBall(data.ball);
        if (data.scores) setScores(data.scores);
        if (typeof data.left_connected === "boolean")
          setLeftConnected(data.left_connected);
        if (typeof data.right_connected === "boolean")
          setRightConnected(data.right_connected);
      } catch (e) {
        console.error("Invalid game state from backend", e);
      }
    };
    setWs(socket);
    return () => socket.close();
  }, []);

  // Handle keyboard input for left paddle and send to backend
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      let changed = false;
      if (e.key === "w" && !keys.current.up) {
        keys.current.up = true;
        changed = true;
      }
      if (e.key === "s" && !keys.current.down) {
        keys.current.down = true;
        changed = true;
      }
      if (changed && ws && ws.readyState === WebSocket.OPEN) {
        ws.send(
          JSON.stringify({
            type: "move",
            up: keys.current.up,
            down: keys.current.down,
          })
        );
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      let changed = false;
      if (e.key === "w" && keys.current.up) {
        keys.current.up = false;
        changed = true;
      }
      if (e.key === "s" && keys.current.down) {
        keys.current.down = false;
        changed = true;
      }
      if (changed && ws && ws.readyState === WebSocket.OPEN) {
        ws.send(
          JSON.stringify({
            type: "move",
            up: keys.current.up,
            down: keys.current.down,
          })
        );
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [ws]);

  // Remove local game loop; game state is now driven by backend

  // TODO: Sync paddle/ball state with backend via ws

  return (
    <div className="pong-container">
      <h1>UberPong Multiplayer</h1>
      <div className="scoreboard">
        <span>
          Player 1: {scores.left} {leftConnected ? "🟢" : "🔴"}
        </span>
        <span>
          Player 2: {scores.right} {rightConnected ? "🟢" : "🔴"}
        </span>
      </div>
      <div
        className="pong-table"
        style={{ width: TABLE_WIDTH, height: TABLE_HEIGHT }}
      >
        <div
          className="paddle left"
          style={{
            top: leftPaddle.y * (TABLE_HEIGHT - PADDLE_HEIGHT),
            left: 0,
            width: PADDLE_WIDTH,
            height: PADDLE_HEIGHT,
          }}
        />
        <div
          className="paddle right"
          style={{
            top: rightPaddle.y * (TABLE_HEIGHT - PADDLE_HEIGHT),
            left: TABLE_WIDTH - PADDLE_WIDTH,
            width: PADDLE_WIDTH,
            height: PADDLE_HEIGHT,
          }}
        />
        <div
          className="ball"
          style={{
            top: ball.y * (TABLE_HEIGHT - BALL_SIZE),
            left: ball.x * (TABLE_WIDTH - BALL_SIZE),
            width: BALL_SIZE,
            height: BALL_SIZE,
          }}
        />
      </div>
      <div className="controls">
        <p>Use W/S to move your paddle.</p>
      </div>
    </div>
  );
}

export default App;
