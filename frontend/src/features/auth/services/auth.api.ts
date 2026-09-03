import { api } from '../../../services/api';
import type { LoginFormData, RegisterFormData } from '../../../schemas/auth';

export interface Player {
  id: string;
  authUserId: string;
  wbfNumber: string;
  email: string;
  displayName: string | null;
  countryOrNbo: string | null;
  verificationStatus: string;
}

export interface RegisterResponse {
  player: Player;
  authUser: {
    id: string;
    email: string;
  };
}

export interface LoginResponse {
  player: Player;
  session: {
    accessToken: string;
    refreshToken: string;
    expiresAt?: number;
  };
}

export const authApi = {
  /**
   * Rejestruje nowego użytkownika w systemie (Supabase + Drizzle)
   */
  register: async (data: RegisterFormData): Promise<RegisterResponse> => {
    // API oczekuje email, wbfNumber, password. Odrzucamy confirmPassword ze schematu
    const payload = {
      email: data.email,
      wbfNumber: data.wbfNumber,
      password: data.password,
    };
    return api.post<RegisterResponse>('/auth/register', payload);
  },

  /**
   * Loguje użytkownika po WBF Number i haśle
   */
  login: async (data: LoginFormData): Promise<LoginResponse> => {
    return api.post<LoginResponse>('/auth/login', data);
  },

  /**
   * Wylogowuje użytkownika
   */
  logout: async (): Promise<{ signedOut: boolean }> => {
    localStorage.removeItem('token');
    sessionStorage.removeItem('token');
    return api.post<{ signedOut: boolean }>('/auth/logout', {});
  },

  /**
   * Pobiera aktualnie zalogowanego gracza (wymaga tokena)
   */
  getMe: async (): Promise<{ player: Player }> => {
    return api.get<{ player: Player }>('/auth/me');
  },
};
