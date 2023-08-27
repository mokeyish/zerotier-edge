use std::path::PathBuf;

use axum::{
    extract::Path,
    routing::{delete, get, post},
    Json, Router,
};

use serde::{Deserialize, Serialize};
use serde_json::{Map, Value};

use futures::future::join_all;

use super::{assign_not_none_to, ctx::Ctx, Result, SharedState};

#[inline]
pub fn routes() -> Router<SharedState> {
    Router::new()
        .route("/network", get(get_networks))
        .route("/network", post(create_network))
        .route("/network/:network_id", post(update_network))
        .route("/network/:network_id", get(get_network))
        .route("/network/:network_id", delete(delete_network))
}

async fn get_networks(ctx: Ctx) -> Result<Json<Vec<NetworkPalyload>>> {
    let network_ids = ctx.get_network_ids().await?;

    let tasks = network_ids
        .iter()
        .map(|network_id| ctx.get_network(network_id));

    let network_configs = join_all(tasks)
        .await
        .into_iter()
        .collect::<Result<Vec<_>>>()?;

    let networks = network_configs
        .into_iter()
        .map(|config| NetworkPalyload::combine_from_file(config, ctx.work_dir()))
        .collect::<Vec<_>>();

    let networks = join_all(networks.into_iter().map(|mut network| async {
        network.update(&ctx).await?;
        Ok(network)
    }))
    .await
    .into_iter()
    .collect::<Result<Vec<_>>>()?;

    Ok(Json(networks))
}

async fn create_network(
    ctx: Ctx,
    Json(mut network): Json<NetworkPalyload>,
) -> Result<Json<NetworkPalyload>> {
    let config = network.config.take().unwrap_or_default();
    let config = ctx.create_network(&config).await?;
    network.config = Some(config);
    network.update(&ctx).await?;
    network.write_to_file(ctx.work_dir())?;
    Ok(Json(network))
}

async fn get_network(ctx: Ctx, Path(network_id): Path<String>) -> Result<Json<NetworkPalyload>> {
    let network_config = ctx.get_network(network_id.as_str()).await?;
    let mut network = NetworkPalyload::combine_from_file(network_config, ctx.work_dir());

    network.update(&ctx).await?;
    Ok(Json(network))
}

async fn update_network(
    ctx: Ctx,
    Path(network_id): Path<String>,
    Json(mut network): Json<NetworkPalyload>,
) -> Result<Json<NetworkPalyload>> {
    let mut config = network.config.take();
    if let Some(network_config) = config.as_ref() {
        config = Some(
            ctx.update_network(network_id.as_str(), network_config)
                .await?,
        );
    };

    network = assign_not_none_to(
        &network,
        NetworkPalyload::read_from_file(ctx.work_dir(), &network_id).unwrap_or_else(|_| {
            NetworkPalyload {
                id: Some(network_id.to_string()),
                ..Default::default()
            }
        }),
    )
    .unwrap_or(network);

    network.write_to_file(ctx.work_dir())?;

    if config.is_none() {
        config = Some(ctx.get_network(&network_id).await?);
    }

    network.config = config;
    network.update(&ctx).await?;

    Ok(Json(network))
}

async fn delete_network(ctx: Ctx, Path(network_id): Path<String>) -> Result<Json<NetworkPalyload>> {
    let network_config = ctx.delete_network(network_id.as_str()).await?;
    let file_path = network_file_path(ctx.work_dir(), &network_id);
    Ok(Json(if file_path.exists() {
        let network = NetworkPalyload::combine_from_file(network_config, ctx.work_dir());
        let _ = std::fs::remove_file(file_path);
        network
    } else {
        let mut network = NetworkPalyload::default();
        network.config = Some(network_config);
        network.update(&ctx).await?;
        network
    }))
}

#[derive(Debug, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
struct NetworkPalyload {
    id: Option<String>,
    clock: Option<i64>,
    config: Option<Map<String, Value>>,
    description: Option<String>,
    rules_source: Option<String>,
    permissions: Option<Map<String, Value>>,
    owner_id: Option<String>,
    online_member_count: Option<usize>,
    authorized_member_count: Option<usize>,
    total_member_count: Option<usize>,
    capabilities_by_name: Option<Map<String, Value>>,
    tags_by_name: Option<Map<String, Value>>,
    ui: Option<Map<String, Value>>,
}

impl NetworkPalyload {
    fn combine_from_file(config: Map<String, Value>, work_dir: &std::path::Path) -> Self {
        let mut network =
            if let Some(network_id) = config.get("id").map(|e| e.as_str()).flatten().map(|s| s) {
                let mut network = Self::read_from_file(work_dir, network_id).unwrap_or_default();
                network.id = Some(network_id.to_string());
                network
            } else {
                Default::default()
            };

        network.config = Some(config);
        network
    }

    async fn update(&mut self, ctx: &Ctx) -> Result<()> {
        self.clock = Some(
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap_or_default()
                .as_millis() as i64,
        );

        if let Some(config) = self.config.as_ref() {
            self.id = config
                .get("id")
                .map(|x| x.as_str())
                .flatten()
                .map(|s| s.to_string());
        }

        // fetch from api
        if let Some(network_id) = self.id.as_deref() {
            // fetch total_member_count and authorized_member_count
            let member_ids = ctx.get_member_ids(&network_id).await?;

            let members = join_all(
                member_ids
                    .iter()
                    .map(|(member_id, _)| ctx.get_member(&network_id, member_id)),
            )
            .await
            .into_iter()
            .collect::<Result<Vec<_>>>()?;

            let total_member_count = members.len();
            let authorized_member_count = members
                .iter()
                .flat_map(|m| m.get("authorized").map(|a| a.as_bool()).flatten())
                .filter(|a| *a)
                .count();

            self.total_member_count = Some(total_member_count);
            self.authorized_member_count = Some(authorized_member_count);
        }

        Ok(())
    }

    fn read_from_file(work_dir: &std::path::Path, network_id: &str) -> Result<Self> {
        let file_path = network_file_path(work_dir, network_id);
        let file = std::fs::File::open(file_path)?;
        let network = serde_json::from_reader(file)?;
        Ok(network)
    }

    fn write_to_file(&mut self, work_dir: &std::path::Path) -> Result<()> {
        if let Some(network_id) = self.id.as_deref() {
            let config = self.config.take();
            let file_path = network_file_path(work_dir, network_id);

            if let Some(dir) = file_path.parent() {
                std::fs::create_dir_all(dir)?;
            }
            let file = std::fs::File::options()
                .write(true)
                .truncate(true)
                .create(true)
                .open(&file_path)?;

            serde_json::to_writer(file, &self)?;
            self.config = config;
        }
        Ok(())
    }
}

fn network_file_path(work_dir: &std::path::Path, network_id: &str) -> PathBuf {
    work_dir
        .join("controller.d")
        .join("network")
        .join(format!("{}.ext.json", network_id))
}

#[cfg(test)]
mod tests {
    use serde_json::json;

    use crate::api::assign_not_none_to;

    use super::NetworkPalyload;

    #[test]
    fn test_network_value_applying() {
        let a = json!({
            "id": "123",
            "description": "abc"
        });

        let b = json!({
            "description": "xyz"
        });

        let a = serde_json::from_value::<NetworkPalyload>(a).unwrap();
        let b = serde_json::from_value::<NetworkPalyload>(b).unwrap();
        let a = assign_not_none_to(&b, a).unwrap();

        assert_eq!(a.id, Some("123".to_string()));
        assert_eq!(a.description, Some("xyz".to_string()));
    }
}
