# Zerotier-Edge

A ZeroTier Controller Web UI for a self-hosted ZeroTier network controller that deployed at your edge.

## Features

- Convenient, launched with a single command.
- Lightweight, less than 5 MB.
- No docker, just a single binary.
- No database,  storing all configurations in a directory.

## Quick start

1. Download `Zerotier-Edge` from [here](https://github.com/mokeyish/zerotier-edge/releases).
2. Start service

   ```shell
   ./zerotier-edge
   ```

3. Login with token and manage your controller.([How to get your token?](https://docs.zerotier.com/self-hosting/network-controllers/#authtoken))

## Building

To build `Zerotier-Edge` from source, ensure that you have [Rust](https://www.rust-lang.org/learn/get-started) installed. Then, follow these steps in your terminal:

1. Clone the repository:

   ```shell
   git clone https://github.com/mokeyish/zerotier-edge.git
   cd zerotier-edge
   ```

2. Build web UI:

   ```shell
   pnpm install
   pnpm run build
   ```

3. Compile the binary:

   ```shell
   cargo build --release
   ```

4. Display available options:

   ```shell
   ./target/release/zerotier-edge --help
   ```

5. Launch the application:

   ```shell
   ./target/release/zerotier-edge
   ```

## Similar projects

- [ZeroUI](https://github.com/dec0dOS/zero-ui)
- [ztncui](https://github.com/key-networks/ztncui)

## License

This project  is licensed under GPL-3.0 license (LICENSE-GPL-3.0 or [https://opensource.org/licenses/GPL-3.0](https://opensource.org/licenses/GPL-3.0))

## Contribution

Unless you explicitly state otherwise, any contribution intentionally submitted for inclusion in the work by you, as defined in the GPL-3.0 license, shall be licensed as above, without any additional terms or conditions.
