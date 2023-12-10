use serde_json::{Map, Value};

use super::{ApiError, Ctx, Result};

impl Ctx {
    pub(super) async fn get_status(&self) -> Result<Value> {
        let client = self.http_client().clone();
        let base_url = self.base_url();
        let token = self.zt1_token().unwrap_or_default();
        let status = client
            .get(format!("{}/status", base_url.trim_end_matches('/')))
            .header("X-ZT1-AUTH", token)
            .send()
            .await?
            .error_for_status()?
            .json()
            .await?;
        Ok(status)
    }

    pub(super) async fn get_network_ids(&self) -> Result<Vec<String>> {
        let client = self.http_client().clone();
        let base_url = self.base_url();
        let token = self.zt1_token().unwrap_or_default();
        let networks = client
            .get(format!(
                "{}/controller/network",
                base_url.trim_end_matches('/')
            ))
            .header("X-ZT1-AUTH", token)
            .send()
            .await?
            .error_for_status()?
            .json()
            .await?;

        Ok(networks)
    }

    pub(super) async fn get_network(&self, network_id: &str) -> Result<Map<String, Value>> {
        let client = self.http_client().clone();
        let base_url = self.base_url();
        let token = self.zt1_token().unwrap_or_default();

        let network = client
            .get(format!(
                "{}/controller/network/{network_id}",
                base_url.trim_end_matches('/')
            ))
            .header("X-ZT1-AUTH", token)
            .send()
            .await?
            .error_for_status()
            .map_err(|err| {
                map_not_found(err, || ApiError::NetworkNotFound(network_id.to_string()))
            })?
            .json()
            .await?;

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

        let network = client
            .post(format!(
                "{}/controller/network/{network_id}",
                base_url.trim_end_matches('/')
            ))
            .header("X-ZT1-AUTH", token)
            .header("Content-Type", "application/json")
            .json(network)
            .send()
            .await?
            .error_for_status()
            .map_err(|err| {
                map_not_found(err, || ApiError::NetworkNotFound(network_id.to_string()))
            })?
            .json()
            .await?;
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
            let network = client
                .post(format!(
                    "{}/controller/network/{}______",
                    base_url.trim_end_matches('/'),
                    node_id
                ))
                .header("X-ZT1-AUTH", token)
                .header("Content-Type", "application/json")
                .json(network)
                .send()
                .await?
                .error_for_status()?
                .json()
                .await?;

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

        let network = client
            .delete(format!(
                "{}/controller/network/{network_id}",
                base_url.trim_end_matches('/')
            ))
            .header("X-ZT1-AUTH", token)
            .send()
            .await?
            .error_for_status()
            .map_err(|err| {
                map_not_found(err, || ApiError::NetworkNotFound(network_id.to_string()))
            })?
            .json()
            .await?;

        Ok(network)
    }

    pub(super) async fn get_member_ids(&self, network_id: &str) -> Result<Map<String, Value>> {
        let client = self.http_client().clone();
        let base_url = self.base_url();
        let token = self.zt1_token().unwrap_or_default();

        let bytes = client
            .get(format!(
                "{}/controller/network/{}/member",
                base_url.trim_end_matches('/'),
                network_id
            ))
            .header("X-ZT1-AUTH", token)
            .send()
            .await?
            .error_for_status()?
            .bytes()
            .await?;

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

        let network = client
            .get(format!(
                "{}/controller/network/{}/member/{}",
                base_url.trim_end_matches('/'),
                network_id,
                member_id
            ))
            .header("X-ZT1-AUTH", token)
            .send()
            .await?
            .error_for_status()
            .map_err(|err| map_not_found(err, || ApiError::MemberNotFound(member_id.to_string())))?
            .json()
            .await?;

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

        let network = client
            .post(format!(
                "{}/controller/network/{}/member/{}",
                base_url.trim_end_matches('/'),
                network_id,
                member_id
            ))
            .header("X-ZT1-AUTH", token)
            .header("Content-Type", "application/json")
            .json(member)
            .send()
            .await?
            .error_for_status()
            .map_err(|err| map_not_found(err, || ApiError::MemberNotFound(member_id.to_string())))?
            .json()
            .await?;

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

        let network = client
            .delete(format!(
                "{}/controller/network/{}/member/{}",
                base_url.trim_end_matches('/'),
                network_id,
                member_id
            ))
            .header("X-ZT1-AUTH", token)
            .send()
            .await?
            .error_for_status()
            .map_err(|err| map_not_found(err, || ApiError::MemberNotFound(member_id.to_string())))?
            .json()
            .await?;

        Ok(network)
    }

    pub(super) async fn get_peers(&self) -> Result<Vec<Map<String, Value>>> {
        let client = self.http_client().clone();
        let base_url = self.base_url();
        let token = self.zt1_token().unwrap_or_default();

        let network = client
            .get(format!("{}/peer", base_url.trim_end_matches('/')))
            .header("X-ZT1-AUTH", token)
            .send()
            .await?
            .error_for_status()?
            .json()
            .await?;
        Ok(network)
    }

    pub(super) async fn get_peer(&self, address: &str) -> Result<Map<String, Value>> {
        let client = self.http_client().clone();
        let base_url = self.base_url();
        let token = self.zt1_token().unwrap_or_default();

        let network = client
            .get(format!(
                "{}/peer/{}",
                base_url.trim_end_matches('/'),
                address
            ))
            .header("X-ZT1-AUTH", token)
            .send()
            .await?
            .error_for_status()
            .map_err(|err| map_not_found(err, || ApiError::PeerNotFound(address.to_string())))?
            .json()
            .await?;

        Ok(network)
    }
}

fn map_not_found(err: reqwest::Error, map: impl Fn() -> super::ApiError) -> super::ApiError {
    use reqwest::StatusCode;
    match err.status() {
        Some(StatusCode::NOT_FOUND) => map(),
        _ => err.into(),
    }
}
