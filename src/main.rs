use axum::{
    http::Uri,
    response::{IntoResponse, Response},
    routing::get,
    Router,
};
use clap::Parser;
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

    let work_dir = args.work_dir.unwrap_or_else(|| {
        use cfg_if::cfg_if;
        use faccess::PathExt;
        // try to reuse ZeroTier working directory

        // # System https://docs.zerotier.com/zerotier/zerotier.conf#configuration-files
        cfg_if! {
            if #[cfg(target_os = "windows")] {
                let working_directory = Some("C:\\ProgramData\\ZeroTier\\One");
            } else if #[cfg(target_os = "macos")] {
                let working_directory = Some("/Library/Application Support/ZeroTier/One");
            } else if #[cfg(target_os = "linux")] {
                let working_directory = Some("/var/lib/zerotier-one");
            } else if #[cfg(any(target_os = "freebsd", target_os = "openbsd"))] {
                let working_directory = Some("/var/db/zerotier-one");
            } else {
                let working_directory: Option<&'static str> = None;
            }
        };

        if let Some(working_directory) = working_directory.map(Path::new) {
            if working_directory.exists()
                && working_directory.is_dir()
                && working_directory
                    .writable()
            {
               return working_directory.to_path_buf();
            } else {
                log::warn!("{:?} is not writable, will try other directory as working_directory to store extra configuration.", working_directory);
            }
        }

        // # User https://docs.zerotier.com/zerotier/zerotier.conf#user

        cfg_if! {
            if #[cfg(target_os = "windows")] {
                let working_directory = Some("AppData\\Local\\ZeroTier");
            } else if #[cfg(target_os = "macos")] {
                let working_directory = Some("Library/Application Support/ZeroTier");
            } else {
                let working_directory: Option<&'static str> = None;
            }
        }
        if let (Some(home), Some(working_directory)) =
            (dirs::home_dir(), working_directory.map(Path::new))
        {
            home.join(working_directory)
        } else {
            Path::new("zt").to_path_buf()
        }
    });
    let work_dir = fs::canonicalize(&work_dir).unwrap_or(work_dir);

    log::info!("=>\tzerotier api: {}", zt_api);
    log::info!("=>\tworking_directory: {:?}", &work_dir);

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

    if !addr.ip().is_loopback() {
        log::warn!("For security reasons, it is recommended to use the loopback address and use nginx's https proxy for this service.");
    }

    let listener = tokio::net::TcpListener::bind(&addr).await.unwrap();

    log::info!("=>\tlistening on http://{}", addr);

    axum::serve(listener, app).await.unwrap();
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
        use axum::http::{header::CONTENT_TYPE, StatusCode};
        let path = self.0.into();

        match Asset::get(path.as_str()) {
            Some(content) => {
                let mime = mime_guess::from_path(path).first_or_octet_stream();
                ([(CONTENT_TYPE, mime.as_ref())], content.data).into_response()
            }
            None => (StatusCode::NOT_FOUND, "404 Not Found").into_response(),
        }
    }
}
