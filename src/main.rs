use axum::{
    http::Uri,
    response::{IntoResponse, Response},
    routing::get,
    Router,
};
use clap::Parser;
use hyper::StatusCode;
use std::{fs, net::ToSocketAddrs, path::Path};

mod api;
mod log;

use api::ApiState;

#[derive(Parser, Debug)]
struct Args {
    /// specify hostname
    #[arg(short = 'H', long)]
    host: Option<String>,

    /// specify port
    #[arg(short = 'P', long, default_value_t = 9394)]
    port: u16,

    /// zerotier controller api address, default: http://localhost:9993
    #[arg(short = 'Z', long)]
    ztapi: Option<String>,

    /// work dir, the directry to store configurations.
    #[arg(short = 'W', long)]
    work_dir: Option<std::path::PathBuf>,
}

#[tokio::main]
async fn main() {
    let args = Args::parse();

    // initialize tracing
    tracing_subscriber::fmt()
        .with_max_level(tracing::Level::INFO)
        .init();

    let addr = (args.host.as_deref().unwrap_or("localhost"), args.port)
        .to_socket_addrs()
        .expect("invalid hostname")
        .next()
        .expect("must have one sock addr.");

    let zt_api = args
        .ztapi
        .unwrap_or_else(|| "http://localhost:9993".to_string());
    let work_dir = args
        .work_dir
        .unwrap_or_else(|| Path::new("zt").to_path_buf());
    let work_dir = fs::canonicalize(&work_dir).unwrap_or(work_dir);

    log::info!("=>\tzerotier api: {}", zt_api);
    log::info!("=>\twork_dir: {:?}", &work_dir);

    // build our application with a route
    let app = Router::new()
        .merge(api::routes())
        .route("/", get(index_handler))
        .route("/*file", get(static_handler))
        .with_state(
            ApiState {
                api: zt_api,
                work_dir,
                client: Default::default(),
            }
            .into(),
        );

    log::info!("=>\tlistening on {}", addr);
    axum::Server::bind(&addr)
        .serve(app.into_make_service())
        .await
        .unwrap();
}

// We use static route matchers ("/" and "/index.html") to serve our home
// page.
async fn index_handler() -> impl IntoResponse {
    static_handler("/index.html".parse::<Uri>().unwrap()).await
}

// We use a wildcard matcher ("/dist/*file") to match against everything
// within our defined assets directory. This is the directory on our Asset
// struct below, where folder = "examples/public/".
async fn static_handler(uri: Uri) -> impl IntoResponse {
    let mut path = uri.path().trim_start_matches('/').to_string();

    if path.starts_with("dist/") {
        path = path.replace("dist/", "");
    }

    StaticFile(path)
}

#[derive(rust_embed::RustEmbed)]
#[folder = "webui/dist/"]
struct Asset;

struct StaticFile<T>(pub T);

impl<T> IntoResponse for StaticFile<T>
where
    T: Into<String>,
{
    fn into_response(self) -> Response {
        let path = self.0.into();

        match Asset::get(path.as_str()) {
            Some(content) => {
                let mime = mime_guess::from_path(path).first_or_octet_stream();
                ([(hyper::header::CONTENT_TYPE, mime.as_ref())], content.data).into_response()
            }
            None => (StatusCode::NOT_FOUND, "404 Not Found").into_response(),
        }
    }
}
