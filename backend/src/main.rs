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

#[derive(Debug, Clone, Serialize, Deserialize)]
struct GameState {
    ball_x: f32,
    ball_y: f32,
    ball_vx: f32,
    ball_vy: f32,
    paddle_left: f32,
    paddle_right: f32,
    score_left: u32,
    score_right: u32,
}

impl Default for GameState {
    fn default() -> Self {
        Self {
            ball_x: 0.5,
            ball_y: 0.5,
            ball_vx: 0.01,
            ball_vy: 0.01,
            paddle_left: 0.5,
            paddle_right: 0.5,
            score_left: 0,
            score_right: 0,
        }
    }
}

#[tokio::main]
async fn main() {
    let game_state = Arc::new(Mutex::new(GameState::default()));
    let (tx, _rx) = broadcast::channel::<String>(16);
    let app = Router::new()
        .route("/ws", get(ws_handler))
        .with_state((game_state, tx));
    let addr = SocketAddr::from(([127, 0, 0, 1], 3000));
    println!("Listening on {}", addr);
    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app.into_make_service())
        .await
        .unwrap();
}

async fn ws_handler(
    ws: WebSocketUpgrade,
    State((game_state, tx)): State<(Arc<Mutex<GameState>>, broadcast::Sender<String>)>,
) -> impl IntoResponse {
    ws.on_upgrade(move |socket| handle_socket(socket, game_state, tx))
}

async fn handle_socket(
    mut socket: WebSocket,
    game_state: Arc<Mutex<GameState>>,
    tx: broadcast::Sender<String>,
) {
    let mut rx = tx.subscribe();
    loop {
        tokio::select! {
            msg = socket.recv() => {
                if let Some(Ok(Message::Text(text))) = msg {
                    // Expect JSON: {"paddle_left": 0.5, "paddle_right": 0.5}
                    if let Ok(update) = serde_json::from_str::<HashMap<String, f32>>(&text) {
                        let mut state = game_state.lock().unwrap();
                        if let Some(pl) = update.get("paddle_left") {
                            state.paddle_left = *pl;
                        }
                        if let Some(pr) = update.get("paddle_right") {
                            state.paddle_right = *pr;
                        }
                        // Update ball position (simple physics)
                        state.ball_x += state.ball_vx;
                        state.ball_y += state.ball_vy;
                        // Bounce logic
                        if state.ball_y <= 0.0 || state.ball_y >= 1.0 {
                            state.ball_vy = -state.ball_vy;
                        }
                        if state.ball_x <= 0.0 {
                            // Left wall: check paddle
                            if (state.ball_y - state.paddle_left).abs() < 0.1 {
                                state.ball_vx = -state.ball_vx;
                            } else {
                                state.score_right += 1;
                                state.ball_x = 0.5;
                                state.ball_y = 0.5;
                            }
                        }
                        if state.ball_x >= 1.0 {
                            // Right wall: check paddle
                            if (state.ball_y - state.paddle_right).abs() < 0.1 {
                                state.ball_vx = -state.ball_vx;
                            } else {
                                state.score_left += 1;
                                state.ball_x = 0.5;
                                state.ball_y = 0.5;
                            }
                        }
                        let state_json = serde_json::to_string(&*state).unwrap();
                        let _ = tx.send(state_json);
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
}
