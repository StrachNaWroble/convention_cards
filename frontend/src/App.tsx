import React, { useState, useEffect } from 'react';
import { LoginView } from './app/LoginView';
import { RegisterView } from './app/RegisterView';
import { DashboardView } from './app/DashboardView';
import { authApi } from './features/auth/services/auth.api';
import { ApiError } from './services/api';

export const App: React.FC = () => {
  const [view, setView] = useState<'login' | 'register' | 'dashboard'>('login');
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const token = sessionStorage.getItem('token') || localStorage.getItem('token');
      if (token) {
        try {
          await authApi.getMe();
          setView('dashboard');
        } catch (error) {
          console.error("Session validation failed", error);
          if (error instanceof ApiError && error.status === 401) {
            // Try to refresh the token if rememberMe is enabled
            const refreshToken = localStorage.getItem('refreshToken');
            if (refreshToken) {
              try {
                const refreshResult = await authApi.refresh(refreshToken);
                if (refreshResult.session?.accessToken) {
                  localStorage.setItem('token', refreshResult.session.accessToken);
                  localStorage.setItem('refreshToken', refreshResult.session.refreshToken);
                  setView('dashboard');
                  setIsInitializing(false);
                  return;
                }
              } catch (refreshError) {
                console.error("Token refresh failed", refreshError);
              }
            }
            localStorage.removeItem('token');
            localStorage.removeItem('refreshToken');
            sessionStorage.removeItem('token');
          }
        }
      }
      setIsInitializing(false);
    };
    checkAuth();
  }, []);

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <>
      {view === 'login' && <LoginView onNavigateToRegister={() => setView('register')} onLoginSuccess={() => setView('dashboard')} />}
      {view === 'register' && <RegisterView onNavigateToLogin={() => setView('login')} onRegisterSuccess={() => setView('dashboard')} />}
      {view === 'dashboard' && <DashboardView onLogout={() => setView('login')} />}
    </>
  );
};
