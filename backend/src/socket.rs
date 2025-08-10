use std::sync::Arc;

use axum::extract::ws::{Message, WebSocket};
use client::ClientMessage;
use futures_concurrency::future::Race;
use tokio::sync::broadcast;
use uuid::Uuid;

use crate::game::{Game, GameState};

mod client;

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
  let Some(player_id) = (if let Some(Ok(Message::Text(json))) = socket.recv().await {
    if let Ok(ClientMessage::Join { uuid }) = serde_json::from_str(&json) {
      Some(uuid)
    } else {
      None
    }
  } else {
    None
  }) else {
    let _ = socket.close().await;
    println!("Failed to connect to player");
    return;
  };

  game.add_player(player_id.clone()).await;
  let mut rx = game.get_state_reciever();
  println!("Added player {player_id}");

  while let Some(event) = await_event(&mut socket, &mut rx).await {
    match event {
      SocketEvent::ClientMessage(message) => handle_message(message, player_id, &game).await,
      SocketEvent::GameEvent(game_state) => {
        if let Ok(message) = serde_json::to_string(&game_state) {
          let _ = socket.send(Message::Text(message)).await;
        }
      }
    }
  }

  game.remove_player(&player_id).await;
}

async fn handle_message(message: Result<Message, axum::Error>, player_id: Uuid, game: &Arc<Game>) {
  let Message::Text(message) = message.unwrap() else {
    return;
  };

  match serde_json::from_str(&message).unwrap() {
    ClientMessage::Join { .. } => {
      println!("Client sent join message while already connected");
    }
    ClientMessage::MovePaddle { paddle_position } => {
      game.update_player_paddle(player_id, paddle_position).await
    }
  }
}
