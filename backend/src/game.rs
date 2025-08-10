use std::{collections::HashMap, sync::Arc, time::Duration};

use serde::{Deserialize, Serialize};
use tokio::{
  sync::{Mutex, broadcast},
  time::interval,
};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Player {
  paddle_y: f32,
}

impl Player {
  fn new() -> Self {
    Self { paddle_y: 0.0 }
  }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Ball {
  x: f32,
  y: f32,
  vx: f32,
  vy: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GameState {
  ball: Ball,
  players: HashMap<Uuid, Player>,
}

impl GameState {
  pub fn new() -> Self {
    Self {
      ball: Ball {
        x: 0.5,
        y: 0.5,
        vx: 0.01,
        vy: 0.01,
      },
      players: HashMap::new(),
    }
  }
}

pub struct Game {
  state: Arc<Mutex<GameState>>,
  tx: broadcast::Sender<GameState>,
  rx: broadcast::Receiver<GameState>,
}

impl Game {
  pub fn new() -> Self {
    let (tx, rx) = broadcast::channel(20);
    Self {
      state: Arc::new(Mutex::new(GameState::new())),
      tx,
      rx,
    }
  }

  pub async fn send_state_update(&self) {
    let _ = self.tx.send(self.state.lock().await.clone());
  }

  pub async fn add_player(&self, player_id: Uuid) {
    self
      .state
      .lock()
      .await
      .players
      .insert(player_id, Player::new());
  }

  pub async fn remove_player(&self, player_id: &Uuid) {
    self.state.lock().await.players.remove(player_id);
  }

  pub fn get_state_reciever(&self) -> broadcast::Receiver<GameState> {
    self.rx.resubscribe()
  }

  pub async fn run(&self) {
    let mut game_tick = interval(Duration::from_millis(20));

    loop {
      game_tick.tick().await;
      self.send_state_update().await;
    }
  }
}
