use std::path::Path;

use super::{ApiError, Result, SharedState};
use async_trait::async_trait;
use axum::{extract::FromRequestParts, http::request::Parts};
use reqwest::Client;

const ZT1_AUTH_TOKEN: &str = "X-ZT1-AUTH";

#[derive(Debug, Clone)]
pub struct Ctx {
    zt1_token: Option<String>,
    state: SharedState,
}

impl Ctx {
    pub fn base_url(&self) -> &str {
        self.state.api.as_str()
    }

    pub fn zt1_token(&self) -> Option<&str> {
        self.zt1_token.as_deref()
    }

    pub fn work_dir(&self) -> &Path {
        &self.state.work_dir
    }

    pub fn http_client(&self) -> &Client {
        &self.state.client
    }
}

#[async_trait]
impl FromRequestParts<SharedState> for Ctx {
    type Rejection = ApiError;

    async fn from_request_parts(parts: &mut Parts, state: &SharedState) -> Result<Self> {
        let zt1_token = parts
            .headers
            .get(ZT1_AUTH_TOKEN)
            .and_then(|x| x.to_str().ok())
            .map(|s| s.to_string());
        Ok(Ctx {
            zt1_token,
            state: state.clone(),
        })
    }
}
