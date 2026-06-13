import { createElysia } from "@/libs/elysia";
import { t } from "elysia";

/**
 * Code execution proxy (server-side — the Piston/Paiza URL is never exposed to the
 * browser; visitors only ever call this backend endpoint).
 *
 * Default provider: self-hosted Piston at compiler.natee.my.id. Override with
 * PISTON_API_URL (e.g. an internal `http://piston:2000/api/v2/execute`).
 * If PISTON_API_URL is explicitly emptied, it falls back to Paiza.IO.
 */
const PISTON_API_URL = process.env.PISTON_API_URL ?? "https://compiler.natee.my.id/api/v2/execute";
const PISTON_API_KEY = process.env.PISTON_API_KEY;
const PAIZA_API = "https://api.paiza.io";
// Use `||` so an empty PAIZA_API_KEY env value falls back to the shared guest key.
const PAIZA_KEY = process.env.PAIZA_API_KEY || "guest";

const PAIZA_LANGUAGE: Record<string, string> = {
  javascript: "javascript",
  typescript: "typescript",
  python: "python3",
  python3: "python3",
  java: "java",
  cpp: "cpp",
  c: "c",
  csharp: "csharp",
  go: "go",
  rust: "rust",
  ruby: "ruby",
  php: "php",
  kotlin: "kotlin",
  swift: "swift",
};

interface NormalizedResult {
  stdout: string;
  stderr: string;
  output: string;
  exitCode: number;
  time: string | null;
  language: string;
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function runOnPaiza(
  language: string,
  code: string,
  stdin: string,
): Promise<NormalizedResult> {
  const paizaLang = PAIZA_LANGUAGE[language] ?? language;

  const createRes = await fetch(`${PAIZA_API}/runners/create`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      source_code: code,
      language: paizaLang,
      input: stdin,
      api_key: PAIZA_KEY,
    }).toString(),
  });

  const created = await createRes.json();
  if (!createRes.ok || created.error || !created.id) {
    throw new Error(created.error || `Failed to start execution (HTTP ${createRes.status})`);
  }

  const id: string = created.id;
  let status: string = created.status;

  for (let i = 0; i < 40 && status !== "completed"; i++) {
    await delay(400);
    const statusRes = await fetch(
      `${PAIZA_API}/runners/get_status?id=${encodeURIComponent(id)}&api_key=${PAIZA_KEY}`,
    );
    const statusJson = await statusRes.json();
    if (statusJson.error) throw new Error(statusJson.error);
    status = statusJson.status;
  }

  if (status !== "completed") {
    throw new Error("Execution timed out. Please try again.");
  }

  const detailsRes = await fetch(
    `${PAIZA_API}/runners/get_details?id=${encodeURIComponent(id)}&api_key=${PAIZA_KEY}`,
  );
  const d = await detailsRes.json();
  if (!detailsRes.ok || d.error) {
    throw new Error(d.error || `Failed to fetch execution result (HTTP ${detailsRes.status})`);
  }

  const stdout: string = d.stdout ?? "";
  const stderr = [d.build_stderr ?? "", d.stderr ?? ""].filter(Boolean).join("");
  // Use ?? semantics, not ||: a legitimate exit code of 0 must not fall through to the stderr branch
  // (a program can exit 0 while still writing warnings to stderr).
  const parsedExit = Number.parseInt(d.exit_code ?? d.build_exit_code ?? "", 10);
  const exitCode = Number.isNaN(parsedExit) ? (stderr ? 1 : 0) : parsedExit;

  return {
    stdout,
    stderr,
    output: [stdout, stderr].filter(Boolean).join(stdout && stderr ? "\n" : ""),
    exitCode,
    time: d.time ?? null,
    language,
  };
}

async function runOnPiston(
  language: string,
  version: string,
  code: string,
  stdin: string,
): Promise<NormalizedResult> {
  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
  };
  if (PISTON_API_KEY) headers.Authorization = PISTON_API_KEY;

  // Always use "*" (latest installed) so a self-hosted Piston runs whatever
  // version of the language is installed, instead of failing on an exact match.
  const res = await fetch(PISTON_API_URL as string, {
    method: "POST",
    headers,
    body: JSON.stringify({ language, version: "*", files: [{ content: code }], stdin }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Piston error (HTTP ${res.status}). ${detail}`.trim());
  }

  const data = await res.json();
  const stdout: string = data.run?.stdout ?? "";
  const stderr = [data.compile?.stderr ?? "", data.run?.stderr ?? ""].filter(Boolean).join("");

  return {
    stdout,
    stderr,
    output: data.run?.output ?? [stdout, stderr].filter(Boolean).join("\n"),
    exitCode: data.run?.code ?? 0,
    time: null,
    language,
  };
}

export default createElysia().post(
  "/compiler/execute",
  async ({
    body,
    set,
  }: {
    body: { language: string; version?: string; code: string; stdin?: string };
    set: { status?: number };
  }) => {
    const { language, version = "*", code, stdin = "" } = body;

    if (!code.trim()) {
      set.status = 400;
      return { status: 400, message: "No code provided.", data: null };
    }

    try {
      const result = PISTON_API_URL
        ? await runOnPiston(language, version, code, stdin)
        : await runOnPaiza(language, code, stdin);
      return { status: 200, message: "Success", data: result };
    } catch (err) {
      set.status = 502;
      return {
        status: 502,
        message: err instanceof Error ? err.message : "Code execution failed.",
        data: null,
      };
    }
  },
  {
    body: t.Object({
      language: t.String(),
      version: t.Optional(t.String()),
      code: t.String(),
      stdin: t.Optional(t.String()),
    }),
    detail: {
      tags: ["Tools"],
      summary: "Execute Code",
      description:
        "Run code via Paiza.IO (default, keyless) or a configured Piston instance (PISTON_API_URL).",
    },
  },
);
