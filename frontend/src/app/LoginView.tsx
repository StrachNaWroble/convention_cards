import React, { useState } from 'react';
import { LoginForm } from '../features/auth/components/LoginForm';
import { LoginFormData } from '../schemas/auth';
import { authApi } from '../features/auth/services/auth.api';
import { ApiError } from '../services/api';

interface LoginViewProps {
  onNavigateToRegister?: () => void;
  onLoginSuccess?: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onNavigateToRegister, onLoginSuccess }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);

  const handleLoginSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    setGlobalError(null);
    
    try {
      const result = await authApi.login(data);
      if (onLoginSuccess) {
        onLoginSuccess();
      }
    } catch (error) {
      if (error instanceof ApiError) {
        setGlobalError(error.message);
      } else {
        setGlobalError('Wystąpił niespodziewany błąd podczas logowania.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-900 flex flex-col justify-center items-center relative overflow-hidden font-sans">
      {/* Dynamic Background Elements */}
      <div className="absolute inset-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
      
      {/* Background glowing gradients */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-blue-900 blur-[120px] mix-blend-screen opacity-50"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-900 blur-[120px] mix-blend-screen opacity-50"></div>
      
      {/* Brand Header */}
      <div className="z-10 mb-8 text-center flex flex-col items-center">
        <div className="w-20 h-20 mb-4 bg-white/5 rounded-full border border-white/10 flex items-center justify-center backdrop-blur-sm shadow-xl">
          <span className="text-4xl">♠️</span>
        </div>
        <h1 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-300 tracking-tight drop-shadow-sm">
          WBF Convention Cards
        </h1>
        <p className="mt-3 text-blue-200/70 font-medium tracking-wide max-w-md text-center">
          Official convention card management tool
        </p>
      </div>

      {/* Form Container */}
      <div className="w-full max-w-md px-4 sm:px-0 z-10 animate-fade-in-up flex flex-col gap-4">
        {globalError && (
          <div className="bg-red-500/20 border border-red-500/50 text-red-200 px-4 py-3 rounded-xl shadow-lg backdrop-blur-md">
            <p className="text-sm font-semibold">{globalError}</p>
          </div>
        )}
        <LoginForm onSubmit={handleLoginSubmit} isLoading={isLoading} onNavigateToRegister={onNavigateToRegister} />
      </div>
      
      {/* Footer */}
      <div className="absolute bottom-6 z-10">
        <p className="text-xs text-slate-500 font-medium">
          &copy; {new Date().getFullYear()} WBF Convention Cards. All rights reserved.
        </p>
      </div>
    </div>
  );
};

export default LoginView;
