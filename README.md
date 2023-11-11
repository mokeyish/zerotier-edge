# Zerotier-Edge

A ZeroTier Controller Web UI for a self-hosted ZeroTier network controller that deployed at your edge.

<a href="https://github.com/mokeyish/zerotier-edge/tree/main/screenshots"><strong>Explore the screenshots »</strong></a>

## Features

- Convenient, launched with a single command.
- Lightweight, less than 5 MB.
- No docker, just a single binary.
- No database, storing all configurations in zerotier working directory(`*.ext.json`).

## Quick start

1. Install Zerotier-Edge.

   Download `Zerotier-Edge` from [here](https://github.com/mokeyish/zerotier-edge/releases) then unzip it.

2. Launch service

   ```shell
   ./zerotier-edge
   ```
   Note: `./zerotier-edge --help` will show the help of command.

3. Access Web UI to manage your controller.

   1. Open [http://127.0.0.1:9394/](http://127.0.0.1:9394/) on your browser.
   2. Login with token ([How to get your token?](https://docs.zerotier.com/self-hosting/network-controllers/#authtoken))
   3. Manage your controller.

4. Configure remote access (optional)

   It is recommended to enable https in Nginx and then proxy our service.
   
   ```nginx
   location /zerotier-edge/ {
        proxy_pass http://127.0.0.1:9394/;
   }
   ```
## Building

To build `Zerotier-Edge` from source, ensure that you have [Rust](https://www.rust-lang.org/learn/get-started) installed. Then, follow these steps in your terminal:

1. Clone the repository:

   ```shell
   git clone https://github.com/mokeyish/zerotier-edge.git
   cd zerotier-edge
   ```

2. Build:

   ```shell
   pnpm install
   pnpm run build
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

Note：I don't want to use heavyweight deployment based on Docker/Nodejs. So I created this project.

## License

This project  is licensed under GPL-3.0 license (LICENSE-GPL-3.0 or [https://opensource.org/licenses/GPL-3.0](https://opensource.org/licenses/GPL-3.0))

## Contribution

Unless you explicitly state otherwise, any contribution intentionally submitted for inclusion in the work by you, as defined in the GPL-3.0 license, shall be licensed as above, without any additional terms or conditions.
