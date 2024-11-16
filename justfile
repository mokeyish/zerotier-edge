cargo := if env_var_or_default('USE_CROSS', 'false') == "true" { "cross" } else { "cargo" }

[private]
alias b := build

[private]
alias t := test

[private]
alias v := version

# Increment manifest version: major, minor, patch, rc, beta, alpha
bump +args: require_set-version
  @cargo set-version --bump {{args}}


# Print current version
version:
  @cargo pkgid | cut -d@ -f2

setup: require_set-version
  pnpm install

# Build
build *args:
  npm run build
  {{cargo}} build {{args}}


# Run tests
test *args:
  {{cargo}} test {{args}}


# Analyze the package and report errors, but don't build object files
check *args:
  {{cargo}} check --workspace --tests --benches --examples {{args}}


# Run clippy fix
clippy:
  {{cargo}} clippy --fix --all


# format the code
fmt:
  {{cargo}} fmt --all
  npm run lint-fix


# Check the clippy and format.
cleanliness:
  cargo clippy
  cargo fmt --all -- --check


# cleanup the workspace
clean:
  {{cargo}} clean

[private]
@require_set-version:
  cargo set-version --version >/dev/null 2>&1 || cargo install cargo-edit > /dev/null