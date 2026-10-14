import { homedir } from "node:os";
import { join } from "node:path";

export const CONFIG_DIR = join(homedir(), ".config", "cssh");
export const CONFIG_FILE = join(CONFIG_DIR, "config.yaml");
export const SECRETS_FILE = join(CONFIG_DIR, "secrets.enc");
export const SECRETS_META_FILE = join(CONFIG_DIR, "secrets.meta.json");
export const VAULT_KEY_FILE = join(CONFIG_DIR, ".vault-key");
export const PASSWORD_FILE = join(CONFIG_DIR, ".password");
