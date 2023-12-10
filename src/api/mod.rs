use std::{io, path::PathBuf, sync::Arc};

use axum::{
    http::{Error as HttpError, StatusCode},
    response::{IntoResponse, Response},
    routing::get,
    Json, Router,
};

use serde::{de::DeserializeOwned, ser::Serialize};
use serde_json::{json, Value};
use thiserror::Error;

use reqwest::Client;

mod ctx;
mod member;
mod network;
mod peer;
mod zt;

use ctx::Ctx;

type SharedState = Arc<ApiState>;

type Result<T> = std::result::Result<T, ApiError>;

#[derive(Debug)]
pub struct ApiState {
    pub api: String,
    pub work_dir: PathBuf,
    pub client: Client,
}

pub fn routes() -> Router<SharedState> {
    Router::new().nest(
        "/api/v1",
        Router::new()
            .route("/status", get(status))
            .merge(network::routes())
            .merge(member::routes())
            .merge(peer::routes()),
    )
}

async fn status(ctx: Ctx) -> Result<Json<Value>> {
    Ok(Json(ctx.get_status().await?))
}

#[derive(Error, Debug)]
pub enum ApiError {
    #[error("io error {0}")]
    Io(#[from] io::Error),
    #[error("http error {0}")]
    Http(#[from] HttpError),
    #[error("serde json error {0}")]
    SerdeJson(#[from] serde_json::Error),
    #[error("http client error {0}")]
    HttpClient(reqwest::Error),
    #[error("zerotier error {0}")]
    Zerotier(String),
    #[error("peer {0} not found error.")]
    PeerNotFound(String),
    #[error("member {0} not found error.")]
    MemberNotFound(String),
    #[error("network {0} not found error.")]
    NetworkNotFound(String),
    #[error("Unauthorized")]
    Unauthorized,
}

impl From<reqwest::Error> for ApiError {
    fn from(err: reqwest::Error) -> Self {
        if let Some(status) = err.status() {
            use reqwest::StatusCode;
            if status == StatusCode::UNAUTHORIZED {
                return ApiError::Unauthorized;
            }
        }

        ApiError::HttpClient(err)
    }
}

impl IntoResponse for ApiError {
    fn into_response(self) -> Response {
        // let (status, error_message) = match self {
        //     AppError::UserRepo(UserRepoError::NotFound) => {
        //         (StatusCode::NOT_FOUND, "User not found")
        //     }
        //     AppError::UserRepo(UserRepoError::InvalidUsername) => {
        //         (StatusCode::UNPROCESSABLE_ENTITY, "Invalid username")
        //     }
        // };

        let (status, error_message) = match self {
            ApiError::PeerNotFound(_)
            | ApiError::MemberNotFound(_)
            | ApiError::NetworkNotFound(_) => (StatusCode::NOT_FOUND, self.to_string()),
            ApiError::Unauthorized => (StatusCode::UNAUTHORIZED, self.to_string()),
            _ => (StatusCode::INTERNAL_SERVER_ERROR, self.to_string()),
        };

        let body = Json(json!({
            "error": error_message,
        }));

        (status, body).into_response()
    }
}

fn assign_not_none_to<T: Serialize + DeserializeOwned>(b: &T, a: T) -> Result<T> {
    let mut a = serde_json::to_value(&a)?;
    let b = serde_json::to_value(b)?;

    if let (Some(a), Some(b)) = (a.as_object_mut(), b.as_object()) {
        for (k, v) in b {
            if matches!(v, Value::Null) {
                continue;
            }
            a[k] = v.to_owned();
        }
    }
    Ok(serde_json::from_value(a)?)
}
