const DEFAULT_UNIX_SOCKET_DIR = "/var/run/postgresql"

/** postgres.js treats a missing host as TCP localhost. Map hostless URLs to a unix socket (peer auth). */
export function postgresClientOptions(
  databaseUrl: string,
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
) {
  const { hostname } = new URL(databaseUrl)
  if (hostname) return { max: 10 as const }
  return { max: 10 as const, host: env.PGHOST || DEFAULT_UNIX_SOCKET_DIR }
}
