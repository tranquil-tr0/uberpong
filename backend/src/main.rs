use axum::extract::State;
use axum::{
    Router,
    extract::ws::{Message, WebSocket, WebSocketUpgrade},
    response::IntoResponse,
    routing::get,
};
use serde::{Deserialize, Serialize};
use std::{
    collections::HashMap,
    net::SocketAddr,
    sync::{Arc, Mutex},
};
use tokio::sync::broadcast;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
struct GameState {
    ball: Ball,
    left_paddle_y: f32,
    right_paddle_y: f32,
    scores: Scores,
    left_connected: bool,
    right_connected: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct Ball {
    x: f32,
    y: f32,
    vx: f32,
    vy: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct Scores {
    left: u32,
    right: u32,
}

impl Default for GameState {
    fn default() -> Self {
        Self {
            ball: Ball {
                x: 0.5,
                y: 0.5,
                vx: 0.01,
                vy: 0.01,
            },
            left_paddle_y: 0.5,
            right_paddle_y: 0.5,
            scores: Scores { left: 0, right: 0 },
            left_connected: false,
            right_connected: false,
        }
    }
}

#[derive(Debug, Clone)]
struct Room {
    state: Arc<Mutex<GameState>>,
    tx: broadcast::Sender<String>,
    players: Arc<Mutex<HashMap<Uuid, PlayerSide>>>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum PlayerSide {
    Left,
    Right,
}

#[tokio::main]
async fn main() {
    let rooms: Arc<Mutex<HashMap<String, Room>>> = Arc::new(Mutex::new(HashMap::new()));
    let app = Router::new()
        .route("/ws", get(ws_handler))
        .with_state(rooms);
    let addr = SocketAddr::from(([127, 0, 0, 1], 3000));
    println!("Listening on {}", addr);
    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app.into_make_service())
        .await
        .unwrap();
}

async fn ws_handler(
    ws: WebSocketUpgrade,
    State(rooms): State<Arc<Mutex<HashMap<String, Room>>>>,
) -> impl IntoResponse {
    ws.on_upgrade(move |socket| handle_socket(socket, rooms))
}

async fn handle_socket(mut socket: WebSocket, rooms: Arc<Mutex<HashMap<String, Room>>>) {
    // Step 1: Receive join/create room message
    let room_id = if let Some(Ok(Message::Text(text))) = socket.recv().await {
        if text.starts_with("join:") {
            text[5..].to_string()
        } else {
            // Default room
            "default".to_string()
        }
    } else {
        "default".to_string()
    };

    // Step 2: Get or create room
    let room = {
        let mut rooms_lock = rooms.lock().unwrap();
        rooms_lock
            .entry(room_id.clone())
            .or_insert_with(|| {
                let state = Arc::new(Mutex::new(GameState::default()));
                let (tx, _rx) = broadcast::channel::<String>(16);
                Room {
                    state,
                    tx,
                    players: Arc::new(Mutex::new(HashMap::new())),
                }
            })
            .clone()
    };

    // Step 3: Assign player side
    let (player_id, side) = {
        let mut players = room.players.lock().unwrap();
        let player_id = Uuid::new_v4();
        let side = if !players.values().any(|&s| s == PlayerSide::Left) {
            PlayerSide::Left
        } else {
            PlayerSide::Right
        };
        players.insert(player_id, side);
        // Mark player as connected in game state
        let mut state = room.state.lock().unwrap();
        match side {
            PlayerSide::Left => state.left_connected = true,
            PlayerSide::Right => state.right_connected = true,
        }
        // Broadcast updated state immediately
        let state_json = serde_json::to_string(&*state).unwrap();
        let _ = room.tx.send(state_json);
        (player_id, side)
    };

    let mut rx = room.tx.subscribe();

    // Step 4: Main loop
    loop {
        tokio::select! {
            msg = socket.recv() => {
                if let Some(Ok(Message::Text(text))) = msg {
                    // Expect JSON: { type: "move", up: bool, down: bool }
                    if let Ok(input) = serde_json::from_str::<HashMap<String, serde_json::Value>>(&text) {
                        if let Some(typ) = input.get("type") {
                            if typ == "move" {
                                let up = input.get("up").and_then(|v| v.as_bool()).unwrap_or(false);
                                let down = input.get("down").and_then(|v| v.as_bool()).unwrap_or(false);
                                {
                                    let mut state = room.state.lock().unwrap();
                                    let paddle_speed = 0.03;
                                    match side {
                                        PlayerSide::Left => {
                                            if up { state.left_paddle_y -= paddle_speed; }
                                            if down { state.left_paddle_y += paddle_speed; }
                                            state.left_paddle_y = state.left_paddle_y.clamp(0.0, 1.0);
                                        }
                                        PlayerSide::Right => {
                                            if up { state.right_paddle_y -= paddle_speed; }
                                            if down { state.right_paddle_y += paddle_speed; }
                                            state.right_paddle_y = state.right_paddle_y.clamp(0.0, 1.0);
                                        }
                                    }
                                    // Ball physics
                                    state.ball.x += state.ball.vx;
                                    state.ball.y += state.ball.vy;
                                    if state.ball.y <= 0.0 || state.ball.y >= 1.0 {
                                        state.ball.vy = -state.ball.vy;
                                    }
                                    if state.ball.x <= 0.0 {
                                        // Left wall: check paddle
                                        if (state.ball.y - state.left_paddle_y).abs() < 0.1 {
                                            state.ball.vx = -state.ball.vx;
                                        } else {
                                            state.scores.right += 1;
                                            state.ball.x = 0.5;
                                            state.ball.y = 0.5;
                                        }
                                    }
                                    if state.ball.x >= 1.0 {
                                        // Right wall: check paddle
                                        if (state.ball.y - state.right_paddle_y).abs() < 0.1 {
                                            state.ball.vx = -state.ball.vx;
                                        } else {
                                            state.scores.left += 1;
                                            state.ball.x = 0.5;
                                            state.ball.y = 0.5;
                                        }
                                    }
                                    let state_json = serde_json::to_string(&*state).unwrap();
                                    let _ = room.tx.send(state_json);
                                }
                            }
                        }
                    }
                } else if let Some(Ok(Message::Close(_))) = msg {
                    break;
                }
            }
            Ok(state_json) = rx.recv() => {
                let _ = socket.send(Message::Text(state_json)).await;
            }
        }
    }

    // Remove player from room on disconnect
    {
        let mut players = room.players.lock().unwrap();
        players.remove(&player_id);
        let mut state = room.state.lock().unwrap();
        match side {
            PlayerSide::Left => state.left_connected = false,
            PlayerSide::Right => state.right_connected = false,
        }
        // Broadcast updated state immediately
        let state_json = serde_json::to_string(&*state).unwrap();
        let _ = room.tx.send(state_json);
    }
}
