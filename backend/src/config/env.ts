export type AppEnv = {
  databaseUrl: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
  supabaseServiceRoleKey?: string;
};

type EnvSource = Record<string, string | undefined>;

function requireEnv(source: EnvSource, name: string): string {
  const value = source[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export function loadAppEnv(source: EnvSource = process.env): AppEnv {
  return {
    databaseUrl: requireEnv(source, "DATABASE_URL"),
    supabaseUrl: requireEnv(source, "SUPABASE_URL"),
    supabaseAnonKey: requireEnv(source, "SUPABASE_ANON_KEY"),
    supabaseServiceRoleKey: source.SUPABASE_SERVICE_ROLE_KEY,
  };
}
