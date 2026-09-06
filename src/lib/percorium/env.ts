/**
 * Read server env at request time.
 *
 * Vite/Nitro will statically replace `process.env.ZERO_EX_API_KEY` with
 * whatever existed at *build* time (often empty on Vercel if the key was
 * added later). Indexing `process.env[name]` keeps the lookup dynamic so
 * Production/Preview runtime secrets actually reach the quote handler.
 */
export function runtimeEnv(name: string): string | undefined {
  try {
    const proc = (
      globalThis as { process?: { env?: Record<string, string | undefined> } }
    ).process;
    const raw = proc?.env?.[name];
    if (typeof raw !== "string") return undefined;
    const trimmed = raw.trim();
    return trimmed.length ? trimmed : undefined;
  } catch {
    return undefined;
  }
}

export function firstRuntimeEnv(...names: string[]): string | undefined {
  for (const name of names) {
    const value = runtimeEnv(name);
    if (value) return value;
  }
  return undefined;
}

export function zeroExApiKey(): string | undefined {
  return firstRuntimeEnv(
    "ZERO_EX_API_KEY",
    "ZEROEX_API_KEY",
    "OX_API_KEY",
  );
}

export function hasZeroExKey(): boolean {
  return Boolean(zeroExApiKey());
}
