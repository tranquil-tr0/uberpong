use std::sync::Arc;

use axum::extract::ws::{Message, WebSocket};
use futures_concurrency::future::Race;
use tokio::sync::broadcast;
use uuid::Uuid;

use crate::game::{Game, GameState};

#[derive(Debug)]
enum SocketEvent {
  ClientMessage(Result<Message, axum::Error>),
  GameEvent(GameState),
}

async fn await_event(
  socket: &mut WebSocket,
  game_rx: &mut broadcast::Receiver<GameState>,
) -> Option<SocketEvent> {
  (
    async { socket.recv().await.map(SocketEvent::ClientMessage) },
    async { game_rx.recv().await.map(SocketEvent::GameEvent).ok() },
  )
    .race()
    .await
}

pub async fn handle_socket(mut socket: WebSocket, game: Arc<Game>) {
  let player_id = Uuid::new_v4();
  game.add_player(player_id.clone()).await;
  let mut rx = game.get_state_reciever();

  while let Some(event) = await_event(&mut socket, &mut rx).await {
    match event {
      SocketEvent::ClientMessage(message) => handle_message(message).await,
      SocketEvent::GameEvent(game_state) => {
        if let Ok(message) = serde_json::to_string(&game_state) {
          let _ = socket.send(Message::Text(message)).await;
        }
      }
    }
  }

  game.remove_player(&player_id).await;
}

async fn handle_message(message: Result<Message, axum::Error>) {
  println!("{message:?}")
}
