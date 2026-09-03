import type { ActivityWriter } from "../activity/index.js";
import type { PlayerRepository } from "../players/player.repository.js";
import { normalizeEmail, normalizeWbfNumber } from "../players/player.types.js";
import { err, ok, type Result } from "../shared/result.js";
import type { WbfVerificationService } from "../wbf-verification/index.js";
import type {
  AuthProvider,
  ChangePasswordInput,
  ChangePasswordResult,
  LoginWithWbfNumberInput,
  LoginWithWbfNumberResult,
  RegisterPlayerInput,
  RegisterPlayerResult,
  RequestPasswordResetInput,
  RequestPasswordResetResult,
} from "./auth.types.js";

export type AuthServiceError =
  | "WBF_NUMBER_ALREADY_REGISTERED"
  | "EMAIL_ALREADY_REGISTERED"
  | "INVALID_CREDENTIALS"
  | "AUTH_PROVIDER_ERROR"
  | "WBF_NUMBER_NOT_FOUND"
  | "WBF_VERIFICATION_UNAVAILABLE"
  | "PLAYER_CREATE_FAILED";

export type AuthService = {
  registerPlayerAccount(input: RegisterPlayerInput): Promise<Result<RegisterPlayerResult, AuthServiceError>>;
  loginWithWbfNumber(input: LoginWithWbfNumberInput): Promise<Result<LoginWithWbfNumberResult, AuthServiceError>>;
  requestPasswordReset(input: RequestPasswordResetInput): Promise<Result<RequestPasswordResetResult, AuthServiceError>>;
  changePassword(input: ChangePasswordInput): Promise<Result<ChangePasswordResult, AuthServiceError>>;
  getCurrentPlayer(authUserId: string): Promise<Result<LoginWithWbfNumberResult["player"], "PLAYER_NOT_FOUND">>;
};

type AuthServiceDeps = {
  players: PlayerRepository;
  authProvider: AuthProvider;
  wbfVerification?: WbfVerificationService;
  requireWbfVerification?: boolean;
  passwordResetRedirectTo?: string;
  activity?: ActivityWriter;
  now?: () => Date;
};

export function createAuthService({
  players,
  authProvider,
  wbfVerification,
  requireWbfVerification = false,
  passwordResetRedirectTo,
  activity,
  now = () => new Date(),
}: AuthServiceDeps): AuthService {
  return {
    async registerPlayerAccount(input) {
      const wbfNumber = normalizeWbfNumber(input.wbfNumber);
      const email = normalizeEmail(input.email);

      const existingWbfNumber = await players.findByWbfNumber(wbfNumber);
      if (existingWbfNumber) {
        return err("WBF_NUMBER_ALREADY_REGISTERED");
      }

      const existingEmail = await players.findByEmail(email);
      if (existingEmail) {
        return err("EMAIL_ALREADY_REGISTERED");
      }

      const verification = await wbfVerification?.verifyWbfNumber(wbfNumber);

      if (verification?.status === "not_found") {
        return err("WBF_NUMBER_NOT_FOUND");
      }

      if (requireWbfVerification && verification?.status !== "found") {
        return err("WBF_VERIFICATION_UNAVAILABLE");
      }

      const authUser = await authProvider.registerWithEmailPassword(email, input.password);
      if (!authUser.ok) {
        return err("AUTH_PROVIDER_ERROR", authUser.message);
      }

      try {
        const player = await players.create({
          authUserId: authUser.data.id,
          wbfNumber,
          email,
          displayName: input.displayName ?? verification?.playerName ?? null,
          countryOrNbo: input.countryOrNbo ?? verification?.countryOrNbo ?? null,
          verificationStatus: verification?.status === "found" ? "verified" : "pending",
          verificationSource: verification?.sourceUrl,
          verificationCheckedAt: verification?.checkedAt,
        });

        await activity?.recordEvent({
          eventType: "player.registered",
          actorPlayerId: player.id,
          entityType: "player",
          entityId: player.id,
          metadata: {
            wbfNumber: player.wbfNumber,
            verificationStatus: player.verificationStatus,
          },
        });

        return ok({ player, authUser: authUser.data });
      } catch (error) {
        return err("PLAYER_CREATE_FAILED", error instanceof Error ? error.message : "Could not create player.");
      }
    },

    async loginWithWbfNumber(input) {
      const wbfNumber = normalizeWbfNumber(input.wbfNumber);
      const player = await players.findByWbfNumber(wbfNumber);

      if (!player) {
        return err("INVALID_CREDENTIALS");
      }

      const session = await authProvider.signInWithEmailPassword(player.email, input.password);
      if (!session.ok) {
        return err("INVALID_CREDENTIALS");
      }

      await players.markLogin(player.authUserId, now());
      await activity?.recordEvent({
        eventType: "player.logged_in",
        actorPlayerId: player.id,
        entityType: "player",
        entityId: player.id,
      });

      return ok({ player, session: session.data });
    },

    async requestPasswordReset(input) {
      const wbfNumber = normalizeWbfNumber(input.wbfNumber);
      const player = await players.findByWbfNumber(wbfNumber);

      if (!player) {
        return ok({ resetEmailQueued: true });
      }

      const reset = await authProvider.sendPasswordResetEmail(player.email, passwordResetRedirectTo);

      if (!reset.ok) {
        return err("AUTH_PROVIDER_ERROR", reset.message);
      }

      await activity?.recordEvent({
        eventType: "player.password_reset_requested",
        actorPlayerId: player.id,
        entityType: "player",
        entityId: player.id,
      });

      return ok({ resetEmailQueued: true });
    },

    async changePassword(input) {
      const currentPassword = await authProvider.signInWithEmailPassword(input.email, input.currentPassword);

      if (!currentPassword.ok) {
        return err("INVALID_CREDENTIALS");
      }

      const updatedPassword = await authProvider.updatePassword(input.authUserId, input.newPassword);

      if (!updatedPassword.ok) {
        return err("AUTH_PROVIDER_ERROR", updatedPassword.message);
      }

      await activity?.recordEvent({
        eventType: "player.password_changed",
        actorPlayerId: input.playerId,
        entityType: "player",
        entityId: input.playerId,
        metadata: {
          authUserId: input.authUserId,
        },
      });

      return ok({ passwordChanged: true });
    },

    async getCurrentPlayer(authUserId) {
      const player = await players.findByAuthUserId(authUserId);

      if (!player) {
        return err("PLAYER_NOT_FOUND");
      }

      return ok(player);
    },
  };
}
