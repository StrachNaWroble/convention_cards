import React, { useState } from 'react';
import { RegisterForm } from '../features/auth/components/RegisterForm';
import { RegisterFormData } from '../schemas/auth';
import { authApi } from '../features/auth/services/auth.api';
import { ApiError } from '../services/api';

export const RegisterView: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);

  const handleRegisterSubmit = async (data: RegisterFormData) => {
    setIsLoading(true);
    setGlobalError(null);
    
    try {
      const result = await authApi.register(data);
      alert('Account created successfully! Welcome ' + (result.player.displayName || result.player.wbfNumber));
      // Tutaj w przyszłości można przekierować do dashboardu, np. używając react-router'a: navigate('/dashboard')
    } catch (error) {
      if (error instanceof ApiError) {
        setGlobalError(error.message);
      } else {
        setGlobalError('Wystąpił niespodziewany błąd podczas rejestracji.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-900 flex flex-col justify-center items-center relative overflow-hidden font-sans py-12">
      {/* Dynamic Background Elements */}
      <div className="absolute inset-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
      
      {/* Background glowing gradients (slightly different colors than login for variation) */}
      <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-purple-900 blur-[120px] mix-blend-screen opacity-50"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-900 blur-[120px] mix-blend-screen opacity-50"></div>
      
      {/* Brand Header */}
      <div className="z-10 mb-8 text-center flex flex-col items-center">
        <div className="w-16 h-16 mb-4 bg-white/5 rounded-full border border-white/10 flex items-center justify-center backdrop-blur-sm shadow-xl">
          <span className="text-3xl">♠️</span>
        </div>
        <h1 className="text-3xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-300 tracking-tight drop-shadow-sm">
          WBF Convention Cards
        </h1>
      </div>

      {/* Form Container */}
      <div className="w-full max-w-md px-4 sm:px-0 z-10 animate-fade-in-up flex flex-col gap-4">
        {globalError && (
          <div className="bg-red-500/20 border border-red-500/50 text-red-200 px-4 py-3 rounded-xl shadow-lg backdrop-blur-md">
            <p className="text-sm font-semibold">{globalError}</p>
          </div>
        )}
        <RegisterForm onSubmit={handleRegisterSubmit} isLoading={isLoading} />
      </div>
      
      {/* Footer */}
      <div className="relative mt-8 z-10">
        <p className="text-xs text-slate-500 font-medium">
          &copy; {new Date().getFullYear()} WBF Convention Cards. All rights reserved.
        </p>
      </div>
    </div>
  );
};

export default RegisterView;
