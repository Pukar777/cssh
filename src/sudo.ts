import { spawn } from "node:child_process";
import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { promisify } from "node:util";
import * as p from "@clack/prompts";
import { CONFIG_DIR, PASSWORD_FILE } from "./paths.js";

const scryptAsync = promisify(scrypt) as (
  password: string,
  salt: Buffer,
  keylen: number
) => Promise<Buffer>;

const MAX_ATTEMPTS = 3;
const HASH_LENGTH = 64;
const MIN_PASSWORD_LENGTH = 4;

interface StoredPassword {
  salt: string;
  hash: string;
}

function run(command: string, args: string[]): Promise<number> {
  return new Promise<number>((resolve, reject) => {
    const child = spawn(command, args, { stdio: "inherit" });
    child.on("error", reject);
    child.on("close", (exitCode) => resolve(exitCode ?? 1));
  });
}

async function askPassword(message: string): Promise<string> {
  const value = await p.password({ message, mask: "*" });
  if (p.isCancel(value)) {
    p.cancel("Operation cancelled.");
    process.exit(0);
  }
  return value;
}

async function loadStoredPassword(): Promise<StoredPassword | null> {
  try {
    return JSON.parse(await readFile(PASSWORD_FILE, "utf8")) as StoredPassword;
  } catch {
    return null;
  }
}

async function createPassword(): Promise<void> {
  p.log.info("No cssh password set yet. Create one to protect access.");

  for (;;) {
    const password = await askPassword("New cssh password");
    if (password.length < MIN_PASSWORD_LENGTH) {
      p.log.warn(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      continue;
    }

    const confirm = await askPassword("Confirm cssh password");
    if (password !== confirm) {
      p.log.warn("Passwords do not match, try again.");
      continue;
    }

    const salt = randomBytes(16);
    const hash = await scryptAsync(password, salt, HASH_LENGTH);
    const stored: StoredPassword = {
      salt: salt.toString("hex"),
      hash: hash.toString("hex"),
    };

    await mkdir(CONFIG_DIR, { recursive: true });
    await writeFile(PASSWORD_FILE, JSON.stringify(stored), { mode: 0o600 });
    p.log.success("cssh password saved.");
    return;
  }
}

async function verifyPassword(stored: StoredPassword): Promise<void> {
  const salt = Buffer.from(stored.salt, "hex");
  const expected = Buffer.from(stored.hash, "hex");

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const password = await askPassword(`[cssh] password for ${process.env.USERNAME ?? "user"}`);
    const actual = await scryptAsync(password, salt, expected.length);
    if (timingSafeEqual(actual, expected)) return;
    p.log.warn("Sorry, try again.");
  }

  throw new Error("cssh password authentication failed");
}

async function ensureWindowsPasswordAuthenticated(): Promise<void> {
  const stored = await loadStoredPassword();
  if (!stored) {
    await createPassword();
    return;
  }
  await verifyPassword(stored);
}

export async function ensureSudoAuthenticated(): Promise<void> {
  if (process.platform === "win32") {
    await ensureWindowsPasswordAuthenticated();
    return;
  }

  const code = await run("sudo", ["-k", "-v"]);

  if (code !== 0) {
    throw new Error("sudo authentication failed");
  }
}
