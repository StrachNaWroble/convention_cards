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
   * Registers a new user
   */
  register: async (data: RegisterFormData): Promise<RegisterResponse> => {
    // Schema validation allows confirmPassword, but backend only expects email, wbfNumber, password
    const payload = {
      email: data.email,
      wbfNumber: data.wbfNumber,
      password: data.password,
    };
    return api.post<RegisterResponse>('/auth/register', payload);
  },

  /**
   * Authenticates user using WBF Number and password
   */
  login: async (data: LoginFormData): Promise<LoginResponse> => {
    return api.post<LoginResponse>('/auth/login', data);
  },

  /**
   * Refreshes the authentication session using a refresh token
   */
  refresh: async (refreshToken: string): Promise<LoginResponse> => {
    return api.post<LoginResponse>('/auth/refresh', { refreshToken });
  },

  /**
   * Signs out the current user and clears local tokens
   */
  logout: async (): Promise<{ signedOut: boolean }> => {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    sessionStorage.removeItem('token');
    return api.post<{ signedOut: boolean }>('/auth/logout', {});
  },

  /**
   * Fetches the currently authenticated player profile
   */
  getMe: async (): Promise<{ player: Player }> => {
    return api.get<{ player: Player }>('/auth/me');
  },
};
