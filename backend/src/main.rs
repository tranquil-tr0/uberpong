use axum::extract::State;
use axum::{Router, extract::ws::WebSocketUpgrade, response::IntoResponse, routing::get};
use game::Game;
use std::net::SocketAddr;
use std::sync::Arc;
use tokio::try_join;

mod game;
mod socket;

#[tokio::main]
async fn main() {
  let game_state = Arc::new(Game::new());

  let app = Router::new()
    .route("/ws", get(ws_handler))
    .with_state(game_state.clone());

  let addr = SocketAddr::from(([127, 0, 0, 1], 3000));
  println!("Listening on {}", addr);

  let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
  try_join!(
    async { Ok(game_state.run().await) },
    axum::serve(listener, app.into_make_service())
  )
  .unwrap();
}

async fn ws_handler(ws: WebSocketUpgrade, State(game): State<Arc<Game>>) -> impl IntoResponse {
  ws.on_upgrade(move |socket| socket::handle_socket(socket, game))
}
