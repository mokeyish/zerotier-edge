use std::path::PathBuf;

use axum::{
    extract::Path,
    routing::{delete, get, post},
    Json, Router,
};
use futures::future::join_all;
use serde::{Deserialize, Serialize};
use serde_json::{Map, Value};

use super::{assign_not_none_to, ctx::Ctx, Result, SharedState};

#[inline]
pub fn routes() -> Router<SharedState> {
    Router::new()
        .route("/network/:network_id/member", get(get_members))
        .route("/network/:network_id/member/:member_id", get(get_member))
        .route(
            "/network/:network_id/member/:member_id",
            delete(delete_member),
        )
        .route(
            "/network/:network_id/member/:member_id",
            post(update_member),
        )
}

async fn get_members(ctx: Ctx, Path(network_id): Path<String>) -> Result<Json<Vec<MemberPayload>>> {
    let member_ids = ctx
        .get_member_ids(network_id.as_str())
        .await?
        .keys()
        .cloned()
        .collect::<Vec<_>>();

    let tasks = member_ids
        .iter()
        .map(|member_id| ctx.get_member(network_id.as_str(), member_id));

    let member_configs = join_all(tasks)
        .await
        .into_iter()
        .collect::<Result<Vec<_>>>()?;

    let members = join_all(member_configs.into_iter().map(|config| async {
        let mut member = MemberPayload::combine_from_file(config, &network_id, ctx.work_dir());
        member.update(&ctx).await?;
        Ok(member)
    }))
    .await
    .into_iter()
    .collect::<Result<Vec<_>>>()?;

    Ok(Json(members))
}

async fn get_member(
    ctx: Ctx,
    Path((network_id, member_id)): Path<(String, String)>,
) -> Result<Json<MemberPayload>> {
    let member_config = ctx
        .get_member(network_id.as_str(), member_id.as_str())
        .await?;
    let mut member = MemberPayload::combine_from_file(member_config, &network_id, ctx.work_dir());

    member.update(&ctx).await?;

    Ok(Json(member))
}

async fn update_member(
    ctx: Ctx,
    Path((network_id, member_id)): Path<(String, String)>,
    Json(mut member): Json<MemberPayload>,
) -> Result<Json<MemberPayload>> {
    let mut config = member.config.take();
    if let Some(member_config) = config {
        config = Some(
            ctx.update_member(network_id.as_str(), member_id.as_str(), &member_config)
                .await?,
        );
    }

    let file_path = member_file_path(ctx.work_dir(), &network_id, &member_id);

    member = assign_not_none_to(
        &member,
        MemberPayload::read_from_file(&file_path).unwrap_or_default(),
    )
    .unwrap_or(member);

    member.write_to_file(&file_path)?;

    if config.is_none() {
        config = Some(ctx.get_member(&network_id, &member_id).await?);
    }

    member.config = config;
    member.update(&ctx).await?;

    Ok(Json(member))
}

async fn delete_member(
    ctx: Ctx,
    Path((network_id, member_id)): Path<(String, String)>,
) -> Result<Json<MemberPayload>> {
    let member_config = ctx
        .delete_member(network_id.as_str(), member_id.as_str())
        .await?;
    let member = MemberPayload::combine_from_file(member_config, &network_id, ctx.work_dir());

    std::fs::remove_file(member_file_path(ctx.work_dir(), &network_id, &member_id))?;

    Ok(Json(member))
}

#[derive(Debug, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
struct MemberPayload {
    // id: Option<String>, // deprecated
    clock: Option<i64>,
    network_id: Option<String>,
    node_id: Option<String>,
    // controller_id: Option<String>, // deprecated
    hidden: Option<bool>,
    name: Option<String>,
    description: Option<String>,
    config: Option<Map<String, Value>>,
    // last_online: Option<i64>, // deprecated
    last_seen: Option<i64>,
    physical_address: Option<String>,
    client_version: Option<String>,
    protocol_version: Option<i32>,
    supports_rule_engine: Option<bool>,
}

impl MemberPayload {
    fn combine_from_file(
        config: Map<String, Value>,
        network_id: &str,
        work_dir: &std::path::Path,
    ) -> Self {
        let mut member = if let Some(member_id) = config.get("id").and_then(|e| e.as_str()) {
            let file_path = member_file_path(work_dir, network_id, member_id);

            if file_path.exists() {
                Self::read_from_file(&file_path).unwrap_or_default()
            } else {
                Default::default()
            }
        } else {
            Default::default()
        };

        member.config = Some(config);
        member
    }

    async fn update(&mut self, ctx: &Ctx) -> Result<()> {
        let config = self.config.take();
        self.clock = Some(
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap_or_default()
                .as_millis() as i64,
        );

        if let Some(config) = config.as_ref() {
            self.network_id = config
                .get("nwid")
                .and_then(|x| x.as_str())
                .map(|s| s.to_string());

            self.node_id = config
                .get("id")
                .and_then(|x| x.as_str())
                .map(|s| s.to_string());

            self.client_version = {
                let v_major = config
                    .get("vMajor")
                    .and_then(|x| x.as_i64())
                    .unwrap_or_default()
                    .max(0);

                let v_minor = config
                    .get("vMinor")
                    .and_then(|x| x.as_i64())
                    .unwrap_or_default()
                    .max(0);

                let v_rev = config
                    .get("vRev")
                    .and_then(|x| x.as_i64())
                    .unwrap_or_default()
                    .max(0);
                Some(format!("{v_major}.{v_minor}.{v_rev}"))
            };

            self.protocol_version = config
                .get("vProto")
                .and_then(|x| x.as_i64())
                .map(|s| s as i32);
        }

        // fetch from api
        if let Some(address) = self.node_id.as_deref() {
            if let Ok(peer) = ctx.get_peer(address).await {
                if let Some(preferred_path) = peer
                    .get("paths")
                    .and_then(|x| x.as_array())
                    .and_then(|paths| {
                        paths
                            .iter()
                            .find(|p| matches!(p.get("preferred"), Some(Value::Bool(true))))
                    })
                    .and_then(|x| x.as_object())
                {
                    self.physical_address = preferred_path
                        .get("address")
                        .and_then(|x| x.as_str())
                        .map(|s| s.split('/').next().unwrap_or(s).to_string());

                    self.last_seen = preferred_path.get("lastReceive").and_then(|x| x.as_i64());
                }
            }
        }

        // save to disk
        if let (Some(network_id), Some(member_id)) =
            (self.network_id.as_deref(), self.node_id.as_deref())
        {
            self.write_to_file(&member_file_path(ctx.work_dir(), network_id, member_id))?;
        }

        self.config = config;
        Ok(())
    }

    fn read_from_file(file_path: &std::path::Path) -> Result<Self> {
        let file = std::fs::File::open(file_path)?;
        let network = serde_json::from_reader(file)?;
        Ok(network)
    }

    fn write_to_file(&self, file_path: &std::path::Path) -> Result<()> {
        if let Some(dir) = file_path.parent() {
            std::fs::create_dir_all(dir)?;
        }
        let file = std::fs::File::options()
            .write(true)
            .truncate(true)
            .create(true)
            .open(file_path)?;
        serde_json::to_writer(file, &self)?;
        Ok(())
    }
}

fn member_file_path(work_dir: &std::path::Path, network_id: &str, member_id: &str) -> PathBuf {
    work_dir
        .join("controller.d")
        .join("network")
        .join(network_id)
        .join("member")
        .join(format!("{}.ext.json", member_id))
}
