# cssh

Configurable SSH client with encrypted secrets and project-based server selection.

## Features

- **Project / server picker** — run `cssh` and choose where to connect
- **Direct connect** — `cssh myproject web`
- **Encrypted vault** — PEM files and private keys stored with AES-256-GCM
- **Auth gate** — real `sudo` prompt on Linux/macOS, a `cssh` password on Windows
- **PEM and key auth** — EC2 PEM pairs or ed25519/RSA private keys
- **No secrets in repo** — config and vault live in `~/.config/cssh/`

## Install

```bash
git clone https://github.com/Pukar777/cssh.git
cd cssh
npm install
npm run build
npm link
```

## Quick start

```bash
# 1. Initialize config
cssh config init

# 2. Create encrypted secrets vault
cssh secrets init

# 3. Add a project and servers
cssh config add-project
cssh config add-server

# 4. Store secrets
cssh secrets set my-pem --file /path/to/key.pem
cssh secrets set my-key --file ~/.ssh/id_ed25519

# 5. Connect
cssh                  # interactive
cssh myproject web         # direct
cssh config list      # show all servers
```

## Config location

| File | Purpose |
|------|---------|
| `~/.config/cssh/config.yaml` | Projects, servers, auth references |
| `~/.config/cssh/secrets.enc` | Encrypted vault (all PEM/key material) |
| `~/.config/cssh/.vault-key` | Local encryption key (mode 600) |
| `~/.config/cssh/.password` | Windows only: salted scrypt hash of the `cssh` password |

## Config schema

```yaml
version: 1
security:
  require_sudo: true
projects:
  - id: myproject
    name: My Project
    servers:
      - id: web
        name: Production Web
        host: ec2-xxx.compute.amazonaws.com
        user: ubuntu
        group: production
        region: ap-southeast-1
        auth:
          type: pem        # pem | key | agent
          secret: my-pem   # id in secrets vault
```

## Authentication

**Windows:** Windows 11's built-in `sudo` doesn't support `-k`, and many accounts sign in with a PIN or have no password at all, so `cssh` uses its own password instead. On first run it asks you to create one; after that it asks for it each time (3 attempts). Only a salted scrypt hash is stored, in `~/.config/cssh/.password`. To reset it, delete that file. Requires OpenSSH Client (`ssh.exe`) on PATH.

**Linux/macOS:**

`cssh` uses **real sudo** (`sudo -k -v`) — the same `[sudo] password for user:` prompt as `sudo apt`. No separate master password.

PEM/key files are encrypted in `~/.config/cssh/secrets.enc` using a machine-local vault key (`~/.config/cssh/.vault-key`), created after sudo auth during `cssh secrets init`.

## Non-interactive mode (agents / scripts)

Skip sudo prompts and menus — **requires project + server**:

```bash
cssh -n myproject web                    # SSH connect
cssh -n myproject web -- uptime          # run remote command
CSSH_NON_INTERACTIVE=1 cssh myproject web   # env var works too

cssh config list -n                 # tab-separated server list
cssh secrets list -n                # secret ids only
cssh secrets verify -n              # prints: ok 5 my-pem,...
```

Disable for security in `config.yaml`:

```yaml
security:
  allow_non_interactive: false
```

## Shell aliases

Add to `~/.bashrc`:

```bash
alias web='cssh myproject web'         # interactive (sudo + menus if no args)
alias web-n='cssh -n myproject web'    # agent/script friendly
```

## Security

- Interactive mode gates access with real `sudo`
- PEM/key material encrypted with AES-256-GCM in `secrets.enc`
- Vault key at `~/.config/cssh/.vault-key` (mode 600)
- Non-interactive mode skips sudo — disable with `allow_non_interactive: false`
- Temp key files written to `/tmp/cssh-*` with mode 0600, deleted on exit
- **Never commit** `config.yaml`, `secrets.enc`, `.vault-key`, `.password`, or PEM files

## Commands

| Command | Description |
|---------|-------------|
| `cssh` | Interactive project + server picker |
| `cssh -n <project> <server>` | Non-interactive connect (no sudo, no menus) |
| `cssh config list -n` | Machine-readable server list |
| `cssh config init` | Create config directory |
| `cssh config add-project` | Add project wizard |
| `cssh config add-server` | Add server wizard |
| `cssh config list` | List projects and servers |
| `cssh secrets init` | Create encrypted vault |
| `cssh secrets set <id> --file <path>` | Store encrypted secret |
| `cssh secrets set <id> --stdin` | Store from stdin |
| `cssh secrets list` | List secret ids |
| `cssh secrets delete <id>` | Remove a secret |

## License

Unlicense (public domain) — free to use for any purpose.
