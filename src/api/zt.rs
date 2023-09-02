use hyper::{body, Body, Request, Response, StatusCode};
use serde_json::{Map, Value};

use super::{ApiError, Ctx, Result};

impl Ctx {
    pub(super) async fn get_status(&self) -> Result<Value> {
        let client = self.http_client().clone();
        let base_url = self.base_url();
        let token = self.zt1_token().unwrap_or_default();

        let req = Request::builder()
            .method("GET")
            .uri(format!("{}/status", base_url.trim_end_matches('/')))
            .header("X-ZT1-AUTH", token)
            .body(Default::default())?;

        let res = client.request(req).await?;
        let res = map_res_err(res)?;

        if !res.status().is_success() {
            let bytes = body::to_bytes(res.into_body()).await?;
            return Err(match String::from_utf8(bytes.to_vec()) {
                Ok(s) => ApiError::Zerotier(s),
                Err(err) => ApiError::Zerotier(format!("read {}", err)),
            });
        }
        let bytes = body::to_bytes(res.into_body()).await?;
        let status = serde_json::from_slice(&bytes)?;
        Ok(status)
    }

    pub(super) async fn get_network_ids(&self) -> Result<Vec<String>> {
        let client = self.http_client().clone();
        let base_url = self.base_url();
        let token = self.zt1_token().unwrap_or_default();

        let req = Request::builder()
            .method("GET")
            .uri(format!(
                "{}/controller/network",
                base_url.trim_end_matches('/')
            ))
            .header("X-ZT1-AUTH", token)
            .body(Default::default())?;

        let res = client.request(req).await?;
        let mut res = map_res_err(res)?;

        if !res.status().is_success() {
            let bytes = body::to_bytes(res.body_mut()).await?;
            return Err(match String::from_utf8(bytes.to_vec()) {
                Ok(s) => ApiError::Zerotier(if s.is_empty() {
                    res.status().to_string()
                } else {
                    s
                }),
                Err(err) => ApiError::Zerotier(format!("read {}", err)),
            });
        }

        let bytes = body::to_bytes(res.body_mut()).await?;

        let networks = serde_json::from_slice(&bytes)?;

        Ok(networks)
    }

    pub(super) async fn get_network(&self, network_id: &str) -> Result<Map<String, Value>> {
        let client = self.http_client().clone();
        let base_url = self.base_url();
        let token = self.zt1_token().unwrap_or_default();

        let req = Request::builder()
            .method("GET")
            .uri(format!(
                "{}/controller/network/{network_id}",
                base_url.trim_end_matches('/')
            ))
            .header("X-ZT1-AUTH", token)
            .body(Default::default())?;

        let res = client.request(req).await?;
        let res = map_res_err(res)?;

        if !res.status().is_success() {
            if res.status() == StatusCode::NOT_FOUND {
                return Err(ApiError::NetworkNotFound(network_id.to_string()));
            }

            let bytes = body::to_bytes(res.into_body()).await?;
            return Err(match String::from_utf8(bytes.to_vec()) {
                Ok(s) => ApiError::Zerotier(s),
                Err(err) => ApiError::Zerotier(format!("read {}", err)),
            });
        }

        let bytes = body::to_bytes(res.into_body()).await?;

        let network = serde_json::from_slice(&bytes)?;
        Ok(network)
    }

    pub(super) async fn update_network(
        &self,
        network_id: &str,
        network: &Map<String, Value>,
    ) -> Result<Map<String, Value>> {
        let client = self.http_client().clone();
        let base_url = self.base_url();
        let token = self.zt1_token().unwrap_or_default();

        let bytes = serde_json::to_vec(network)?;

        let req = Request::builder()
            .method("POST")
            .uri(format!(
                "{}/controller/network/{network_id}/",
                base_url.trim_end_matches('/')
            ))
            .header("X-ZT1-AUTH", token)
            .header("Content-Type", "application/json")
            .body(bytes.into())?;

        let res = client.request(req).await?;
        let res = map_res_err(res)?;

        if !res.status().is_success() {
            if res.status() == StatusCode::NOT_FOUND {
                return Err(ApiError::NetworkNotFound(network_id.to_string()));
            }

            let bytes = body::to_bytes(res.into_body()).await?;
            return Err(match String::from_utf8(bytes.to_vec()) {
                Ok(s) => ApiError::Zerotier(s),
                Err(err) => ApiError::Zerotier(format!("read {}", err)),
            });
        }

        let bytes = body::to_bytes(res.into_body()).await?;

        let network = serde_json::from_slice(&bytes)?;
        Ok(network)
    }

    pub(super) async fn create_network(
        &self,
        network: &Map<String, Value>,
    ) -> Result<Map<String, Value>> {
        let client = self.http_client().clone();
        let base_url = self.base_url();
        let token = self.zt1_token().unwrap_or_default();

        if let Some(node_id) = self
            .get_status()
            .await?
            .as_object()
            .and_then(|s| s.get("address"))
            .and_then(|s| s.as_str())
        {
            let bytes = serde_json::to_vec(network)?;

            let req = Request::builder()
                .method("POST")
                .uri(format!(
                    "{}/controller/network/{}______",
                    base_url.trim_end_matches('/'),
                    node_id
                ))
                .header("X-ZT1-AUTH", token)
                .header("Content-Type", "application/json")
                .body(bytes.into())?;

            let res = client.request(req).await?;
            let res = map_res_err(res)?;

            if !res.status().is_success() {
                let bytes = body::to_bytes(res.into_body()).await?;
                return Err(match String::from_utf8(bytes.to_vec()) {
                    Ok(s) => ApiError::Zerotier(s),
                    Err(err) => ApiError::Zerotier(format!("read {}", err)),
                });
            }

            let bytes = body::to_bytes(res.into_body()).await?;

            let network = serde_json::from_slice(&bytes)?;
            Ok(network)
        } else {
            Err(ApiError::Zerotier(
                "cannot get node_id from api: /status".to_string(),
            ))
        }
    }

    pub(super) async fn delete_network(&self, network_id: &str) -> Result<Map<String, Value>> {
        let client = self.http_client().clone();
        let base_url = self.base_url();
        let token = self.zt1_token().unwrap_or_default();

        let req = Request::builder()
            .method("DELETE")
            .uri(format!(
                "{}/controller/network/{network_id}/",
                base_url.trim_end_matches('/')
            ))
            .header("X-ZT1-AUTH", token)
            .body(Default::default())?;

        let res = client.request(req).await?;
        let res = map_res_err(res)?;

        if !res.status().is_success() {
            if res.status() == StatusCode::NOT_FOUND {
                return Err(ApiError::NetworkNotFound(network_id.to_string()));
            }

            let bytes = body::to_bytes(res.into_body()).await?;
            return Err(match String::from_utf8(bytes.to_vec()) {
                Ok(s) => ApiError::Zerotier(s),
                Err(err) => ApiError::Zerotier(format!("read {}", err)),
            });
        }

        let bytes = body::to_bytes(res.into_body()).await?;

        let network = serde_json::from_slice(&bytes)?;
        Ok(network)
    }

    pub(super) async fn get_member_ids(&self, network_id: &str) -> Result<Map<String, Value>> {
        let client = self.http_client().clone();
        let base_url = self.base_url();
        let token = self.zt1_token().unwrap_or_default();

        let req = Request::builder()
            .method("GET")
            .uri(format!(
                "{}/controller/network/{}/member",
                base_url.trim_end_matches('/'),
                network_id
            ))
            .header("X-ZT1-AUTH", token)
            .body(Default::default())?;

        let res = client.request(req).await?;
        let res = map_res_err(res)?;

        if !res.status().is_success() {
            let bytes = body::to_bytes(res.into_body()).await?;
            return Err(match String::from_utf8(bytes.to_vec()) {
                Ok(s) => ApiError::Zerotier(s),
                Err(err) => ApiError::Zerotier(format!("read {}", err)),
            });
        }

        let bytes = body::to_bytes(res.into_body()).await?;

        let member_ids = if let Ok(arr) = serde_json::from_slice::<Vec<Map<String, Value>>>(&bytes)
        {
            let mut member_ids = Map::new();
            for a in arr {
                member_ids.extend(a);
            }
            member_ids
        } else {
            serde_json::from_slice(&bytes)?
        };

        Ok(member_ids)
    }

    pub(super) async fn get_member(
        &self,
        network_id: &str,
        member_id: &str,
    ) -> Result<Map<String, Value>> {
        let client = self.http_client().clone();
        let base_url = self.base_url();
        let token = self.zt1_token().unwrap_or_default();

        let req = Request::builder()
            .method("GET")
            .uri(format!(
                "{}/controller/network/{}/member/{}",
                base_url.trim_end_matches('/'),
                network_id,
                member_id
            ))
            .header("X-ZT1-AUTH", token)
            .body(Default::default())?;

        let res = client.request(req).await?;
        let res = map_res_err(res)?;

        if !res.status().is_success() {
            if res.status() == StatusCode::NOT_FOUND {
                return Err(ApiError::MemberNotFound(network_id.to_string()));
            }
            let bytes = body::to_bytes(res.into_body()).await?;
            return Err(match String::from_utf8(bytes.to_vec()) {
                Ok(s) => ApiError::Zerotier(s),
                Err(err) => ApiError::Zerotier(format!("read {}", err)),
            });
        }

        let bytes = body::to_bytes(res.into_body()).await?;

        let network = serde_json::from_slice(&bytes)?;
        Ok(network)
    }

    pub(super) async fn update_member(
        &self,
        network_id: &str,
        member_id: &str,
        member: &Map<String, Value>,
    ) -> Result<Map<String, Value>> {
        let client = self.http_client().clone();
        let base_url = self.base_url();
        let token = self.zt1_token().unwrap_or_default();

        let bytes = serde_json::to_vec(member)?;

        let req = Request::builder()
            .method("POST")
            .uri(format!(
                "{}/controller/network/{}/member/{}",
                base_url.trim_end_matches('/'),
                network_id,
                member_id
            ))
            .header("X-ZT1-AUTH", token)
            .header("Content-Type", "application/json")
            .body(bytes.into())?;

        let res = client.request(req).await?;
        let res = map_res_err(res)?;

        if !res.status().is_success() {
            if res.status() == StatusCode::NOT_FOUND {
                return Err(ApiError::MemberNotFound(network_id.to_string()));
            }
            let bytes = body::to_bytes(res.into_body()).await?;
            return Err(match String::from_utf8(bytes.to_vec()) {
                Ok(s) => ApiError::Zerotier(s),
                Err(err) => ApiError::Zerotier(format!("read {}", err)),
            });
        }

        let bytes = body::to_bytes(res.into_body()).await?;

        let network = serde_json::from_slice(&bytes)?;
        Ok(network)
    }

    pub(super) async fn delete_member(
        &self,
        network_id: &str,
        member_id: &str,
    ) -> Result<Map<String, Value>> {
        let client = self.http_client().clone();
        let base_url = self.base_url();
        let token = self.zt1_token().unwrap_or_default();

        let req = Request::builder()
            .method("DELETE")
            .uri(format!(
                "{}/controller/network/{}/member/{}",
                base_url.trim_end_matches('/'),
                network_id,
                member_id
            ))
            .header("X-ZT1-AUTH", token)
            .body(Default::default())?;

        let res = client.request(req).await?;
        let res = map_res_err(res)?;

        if !res.status().is_success() {
            if res.status() == StatusCode::NOT_FOUND {
                return Err(ApiError::MemberNotFound(network_id.to_string()));
            }
            let bytes = body::to_bytes(res.into_body()).await?;
            return Err(match String::from_utf8(bytes.to_vec()) {
                Ok(s) => ApiError::Zerotier(s),
                Err(err) => ApiError::Zerotier(format!("read {}", err)),
            });
        }

        let bytes = body::to_bytes(res.into_body()).await?;

        let network = serde_json::from_slice(&bytes)?;
        Ok(network)
    }

    pub(super) async fn get_peers(&self) -> Result<Vec<Map<String, Value>>> {
        let client = self.http_client().clone();
        let base_url = self.base_url();
        let token = self.zt1_token().unwrap_or_default();

        let req = Request::builder()
            .method("GET")
            .uri(format!("{}/peer", base_url.trim_end_matches('/')))
            .header("X-ZT1-AUTH", token)
            .body(Default::default())?;

        let res = client.request(req).await?;
        let res = map_res_err(res)?;

        if !res.status().is_success() {
            let bytes = body::to_bytes(res.into_body()).await?;
            return Err(match String::from_utf8(bytes.to_vec()) {
                Ok(s) => ApiError::Zerotier(s),
                Err(err) => ApiError::Zerotier(format!("read {}", err)),
            });
        }

        let bytes = body::to_bytes(res.into_body()).await?;

        let network = serde_json::from_slice(&bytes)?;
        Ok(network)
    }

    pub(super) async fn get_peer(&self, address: &str) -> Result<Map<String, Value>> {
        let client = self.http_client().clone();
        let base_url = self.base_url();
        let token = self.zt1_token().unwrap_or_default();

        let req = Request::builder()
            .method("GET")
            .uri(format!(
                "{}/peer/{}",
                base_url.trim_end_matches('/'),
                address
            ))
            .header("X-ZT1-AUTH", token)
            .body(Default::default())?;

        let res = client.request(req).await?;
        let res = map_res_err(res)?;

        if !res.status().is_success() {
            if res.status() == StatusCode::NOT_FOUND {
                return Err(ApiError::PeerNotFound(address.to_string()));
            }
            let bytes = body::to_bytes(res.into_body()).await?;
            return Err(match String::from_utf8(bytes.to_vec()) {
                Ok(s) => ApiError::Zerotier(s),
                Err(err) => ApiError::Zerotier(format!("read {}", err)),
            });
        }

        let bytes = body::to_bytes(res.into_body()).await?;

        let network = serde_json::from_slice(&bytes)?;
        Ok(network)
    }
}

fn map_res_err(res: Response<Body>) -> Result<Response<Body>> {
    if !res.status().is_success() && res.status() == StatusCode::UNAUTHORIZED {
        return Err(ApiError::Unauthorized);
    }
    Ok(res)
}
