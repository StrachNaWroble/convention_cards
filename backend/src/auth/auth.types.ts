import type { Player } from "../players/player.types.js";
import type { Result } from "../shared/result.js";

export type AuthSession = {
  accessToken: string;
  refreshToken: string;
  expiresAt?: number;
};

export type RegisteredAuthUser = {
  id: string;
  email: string;
};

export type CurrentAuthUser = {
  id: string;
  email?: string;
};

export type AuthProvider = {
  registerWithEmailPassword(email: string, password: string): Promise<Result<RegisteredAuthUser, AuthProviderError>>;
  signInWithEmailPassword(email: string, password: string): Promise<Result<AuthSession, AuthProviderError>>;
  refreshSession(refreshToken: string): Promise<Result<AuthSession, AuthProviderError>>;
  sendPasswordResetEmail(email: string, redirectTo?: string): Promise<Result<void, AuthProviderError>>;
  updatePassword(authUserId: string, newPassword: string): Promise<Result<void, AuthProviderError>>;
  getUserByAccessToken(accessToken: string): Promise<Result<CurrentAuthUser, AuthProviderError>>;
  signOut(accessToken?: string): Promise<Result<void, AuthProviderError>>;
};

export type AuthProviderError =
  | "AUTH_EMAIL_ALREADY_EXISTS"
  | "AUTH_INVALID_CREDENTIALS"
  | "AUTH_PASSWORD_RESET_FAILED"
  | "AUTH_PASSWORD_UPDATE_FAILED"
  | "AUTH_REFRESH_FAILED"
  | "AUTH_REGISTRATION_FAILED"
  | "AUTH_SIGN_IN_FAILED"
  | "AUTH_SESSION_INVALID"
  | "AUTH_SIGN_OUT_FAILED";

export type RegisterPlayerInput = {
  wbfNumber: string;
  email: string;
  password: string;
  displayName?: string;
  countryOrNbo?: string;
};

export type LoginWithWbfNumberInput = {
  wbfNumber: string;
  password: string;
};

export type RequestPasswordResetInput = {
  wbfNumber: string;
};

export type ChangePasswordInput = {
  playerId: string;
  authUserId: string;
  email: string;
  currentPassword: string;
  newPassword: string;
};

export type RegisterPlayerResult = {
  player: Player;
  authUser: RegisteredAuthUser;
};

export type LoginWithWbfNumberResult = {
  player: Player;
  session: AuthSession;
};

export type RequestPasswordResetResult = {
  resetEmailQueued: true;
};

export type ChangePasswordResult = {
  passwordChanged: true;
};
