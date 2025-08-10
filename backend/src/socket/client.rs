use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ClientMessage {
  Join { uuid: Uuid },
  MovePaddle { paddle_position: f32 },
}
