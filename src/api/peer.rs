use super::{ctx::Ctx, Result, SharedState};
use axum::{extract::Path, routing::get, Json, Router};
use serde_json::{Map, Value};

#[inline]
pub fn routes() -> Router<SharedState> {
    Router::new()
        .route("/peer", get(get_peers))
        .route("/peer/:address", get(get_peer))
}

async fn get_peers(ctx: Ctx) -> Result<Json<Vec<Peer>>> {
    let peers = ctx.get_peers().await?;
    Ok(Json(peers))
}

async fn get_peer(ctx: Ctx, Path(address): Path<String>) -> Result<Json<Peer>> {
    let peer = ctx.get_peer(&address).await?;
    Ok(Json(peer))
}

type Peer = Map<String, Value>;
