const canvas = document.getElementById("pong");
const ctx = canvas.getContext("2d");
const scoreDiv = document.getElementById("score");

let paddleLeft = 0.5;
let paddleRight = 0.5;
let isLeftPlayer = true; // Default: left player. Could be set by server in future.

const ws = new WebSocket("ws://localhost:3000/ws");
let gameState = {
  ball_x: 0.5,
  ball_y: 0.5,
  paddle_left: 0.5,
  paddle_right: 0.5,
  score_left: 0,
  score_right: 0,
};

ws.onmessage = (event) => {
  const state = JSON.parse(event.data);
  gameState = state;
  scoreDiv.textContent = `${state.score_left} : ${state.score_right}`;
};

function sendPaddle() {
  const update = isLeftPlayer
    ? { paddle_left: paddleLeft }
    : { paddle_right: paddleRight };
  ws.send(JSON.stringify(update));
}

canvas.addEventListener("mousemove", (e) => {
  const rect = canvas.getBoundingClientRect();
  const y = (e.clientY - rect.top) / rect.height;
  if (isLeftPlayer) {
    paddleLeft = Math.max(0, Math.min(1, y));
  } else {
    paddleRight = Math.max(0, Math.min(1, y));
  }
  sendPaddle();
});

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  // Draw paddles
  ctx.fillStyle = "#fff";
  ctx.fillRect(20, gameState.paddle_left * canvas.height - 50, 10, 100);
  ctx.fillRect(
    canvas.width - 30,
    gameState.paddle_right * canvas.height - 50,
    10,
    100
  );
  // Draw ball
  ctx.beginPath();
  ctx.arc(
    gameState.ball_x * canvas.width,
    gameState.ball_y * canvas.height,
    10,
    0,
    2 * Math.PI
  );
  ctx.fill();
}

function loop() {
  draw();
  requestAnimationFrame(loop);
}

loop();
