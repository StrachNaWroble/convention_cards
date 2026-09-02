import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import WebSocket from 'ws';

if (typeof globalThis.WebSocket === 'undefined') {
  globalThis.WebSocket = WebSocket as any;
}

import { err, ok } from "../shared/result.js";
import type { AuthProvider } from "./auth.types.js";

type SupabaseConfig = {
  supabaseUrl: string;
  supabaseAnonKey: string;
  supabaseServiceRoleKey?: string;
};

export function createSupabaseClient(supabaseUrl: string, key: string): SupabaseClient {
  return createClient(supabaseUrl, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export function createSupabaseAuthProvider(config: SupabaseConfig): AuthProvider {
  const publicClient = createSupabaseClient(config.supabaseUrl, config.supabaseAnonKey);
  const adminClient = config.supabaseServiceRoleKey
    ? createSupabaseClient(config.supabaseUrl, config.supabaseServiceRoleKey)
    : null;

  return {
    async registerWithEmailPassword(email, password) {
      if (adminClient) {
        const { data, error } = await adminClient.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
        });

        if (error) {
          return err("AUTH_REGISTRATION_FAILED", error.message);
        }

        if (!data.user?.id || !data.user.email) {
          return err("AUTH_REGISTRATION_FAILED", "Supabase did not return a created user.");
        }

        return ok({ id: data.user.id, email: data.user.email });
      }

      const { data, error } = await publicClient.auth.signUp({ email, password });

      if (error) {
        return err("AUTH_REGISTRATION_FAILED", error.message);
      }

      if (!data.user?.id || !data.user.email) {
        return err("AUTH_REGISTRATION_FAILED", "Supabase did not return a created user.");
      }

      return ok({ id: data.user.id, email: data.user.email });
    },

    async signInWithEmailPassword(email, password) {
      const { data, error } = await publicClient.auth.signInWithPassword({ email, password });

      if (error) {
        return err("AUTH_INVALID_CREDENTIALS", error.message);
      }

      if (!data.session?.access_token || !data.session.refresh_token) {
        return err("AUTH_SIGN_IN_FAILED", "Supabase did not return a session.");
      }

      return ok({
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token,
        expiresAt: data.session.expires_at,
      });
    },

    async getUserByAccessToken(accessToken) {
      const { data, error } = await publicClient.auth.getUser(accessToken);

      if (error || !data.user?.id) {
        return err("AUTH_SESSION_INVALID", error?.message);
      }

      return ok({
        id: data.user.id,
        email: data.user.email,
      });
    },

    async signOut(accessToken) {
      if (accessToken && adminClient) {
        const { error } = await adminClient.auth.admin.signOut(accessToken);

        if (error) {
          return err("AUTH_SIGN_OUT_FAILED", error.message);
        }

        return ok(undefined);
      }

      const { error } = await publicClient.auth.signOut();

      if (error) {
        return err("AUTH_SIGN_OUT_FAILED", error.message);
      }

      return ok(undefined);
    },
  };
}
