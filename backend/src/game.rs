use core::f32;
use std::{collections::HashMap, sync::Arc, time::Duration};

use rand::Rng;
use serde::{Deserialize, Serialize};
use tokio::{
  sync::{Mutex, broadcast},
  time::interval,
};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Player {
  paddle_position: f32,
  paddle_x: f32,
  paddle_y: f32,
  paddle_rot: f32,
}

impl Player {
  fn new() -> Self {
    Self {
      paddle_position: 0.0,
      paddle_x: 0.0,
      paddle_y: 0.0,
      paddle_rot: 0.0,
    }
  }

  fn recalculate_coordinates(&mut self, arena_radius: f32) {
    self.paddle_x = f32::cos(self.paddle_position) * arena_radius;
    self.paddle_y = f32::sin(self.paddle_position) * arena_radius;
    self.paddle_rot = self.paddle_position
  }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Ball {
  x: f32,
  y: f32,
  vx: f32,
  vy: f32,
}

impl Ball {
  pub fn new() -> Self {
    let mut ball = Self {
      x: 0.0,
      y: 0.0,
      vx: 0.0,
      vy: 0.0,
    };

    ball.reset();
    ball
  }

  pub fn reset(&mut self) {
    self.x = 0.0;
    self.y = 0.0;

    let dir = rand::rng().random_range(0.0..f32::consts::TAU);
    let magnitude = 0.1;

    self.vx = magnitude * f32::cos(dir);
    self.vy = magnitude * f32::sin(dir);
  }

  pub fn update_position(&mut self) {
    self.x += self.vx;
    self.y += self.vy;
  }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GameState {
  arena_radius: f32,
  ball: Ball,
  players: HashMap<Uuid, Player>,
}

impl GameState {
  pub fn new() -> Self {
    Self {
      arena_radius: 5.0,
      ball: Ball::new(),
      players: HashMap::new(),
    }
  }
}

#[derive(Debug)]
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

  async fn send_state_update(&self, state: GameState) {
    let _ = self.tx.send(state);
  }

  pub async fn add_player(&self, player_id: Uuid) {
    let mut state = self.state.lock().await;
    let mut player = Player::new();
    player.recalculate_coordinates(state.arena_radius);
    state.players.insert(player_id, player);
  }

  pub async fn remove_player(&self, player_id: &Uuid) {
    self.state.lock().await.players.remove(player_id);
  }

  pub async fn update_player_paddle(&self, player_id: Uuid, new_position: f32) {
    let mut state = self.state.lock().await;
    let arena_radius = state.arena_radius;
    if let Some(player) = state.players.get_mut(&player_id) {
      player.paddle_position = new_position;
      player.recalculate_coordinates(arena_radius);
    }
  }

  pub fn get_state_reciever(&self) -> broadcast::Receiver<GameState> {
    self.rx.resubscribe()
  }

  pub async fn run(&self) {
    let mut game_tick = interval(Duration::from_millis(20));

    loop {
      game_tick.tick().await;
      let mut state = self.state.lock().await;

      state.ball.update_position();
      let ball_distance = state.ball.x.hypot(state.ball.y);
      if ball_distance > state.arena_radius + 1.0 {
        state.ball.reset();
      }

      self.send_state_update(state.clone()).await;
    }
  }
}
