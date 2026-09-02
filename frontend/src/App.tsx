import React, { useState } from 'react';
import { LoginView } from './app/LoginView';
import { RegisterView } from './app/RegisterView';
import { DashboardView } from './app/DashboardView';

export const App: React.FC = () => {
  const [view, setView] = useState<'login' | 'register' | 'dashboard'>('login');

  return (
    <>
      {view === 'login' && <LoginView onNavigateToRegister={() => setView('register')} onLoginSuccess={() => setView('dashboard')} />}
      {view === 'register' && <RegisterView onNavigateToLogin={() => setView('login')} onRegisterSuccess={() => setView('dashboard')} />}
      {view === 'dashboard' && <DashboardView onLogout={() => setView('login')} />}
    </>
  );
};
