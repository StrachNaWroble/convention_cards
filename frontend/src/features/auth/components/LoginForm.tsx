import React, { useState } from 'react';
import { loginSchema, LoginFormData } from '../../../schemas/auth';
import { z } from 'zod';

interface LoginFormProps {
  onSubmit?: (data: LoginFormData) => void;
  isLoading?: boolean;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onSubmit, isLoading = false }) => {
  const [formData, setFormData] = useState<LoginFormData>({
    wbfNumber: '',
    password: '',
  });

  const [errors, setErrors] = useState<Partial<Record<keyof LoginFormData, string>>>({});
  const [authError, setAuthError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Czyszczenie błędów przy wpisywaniu
    if (errors[name as keyof LoginFormData]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
    setAuthError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Walidacja używając Zod
      const validData = loginSchema.parse(formData);
      setErrors({});
      if (onSubmit) {
        onSubmit(validData);
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Partial<Record<keyof LoginFormData, string>> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            newErrors[err.path[0] as keyof LoginFormData] = err.message;
          }
        });
        setErrors(newErrors);
      }
    }
  };

  return (
    <div className="w-full max-w-md p-8 space-y-8 bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl rounded-3xl relative overflow-hidden">
      {/* Decorative gradient glowing orb */}
      <div className="absolute -top-24 -right-24 w-48 h-48 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
      <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>

      <div className="relative z-10 text-center">
        <div className="mx-auto w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg mb-6 transform transition-transform hover:scale-105">
          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path>
          </svg>
        </div>
        <h2 className="text-3xl font-extrabold text-white tracking-tight">Welcome back</h2>
        <p className="mt-2 text-sm text-gray-300 font-medium">Log in to manage your convention cards</p>
      </div>

      <form className="relative z-10 mt-8 space-y-6" onSubmit={handleSubmit} noValidate>
        {authError && (
          <div className="p-4 rounded-xl bg-red-500/20 border border-red-500/50 flex items-center">
             <span className="text-red-200 text-sm font-semibold">{authError}</span>
          </div>
        )}

        <div className="space-y-5">
          <div>
            <label htmlFor="wbfNumber" className="block text-sm font-medium text-gray-200 ml-1 mb-1">
              WBF Number
            </label>
            <input
              id="wbfNumber"
              name="wbfNumber"
              type="text"
              autoComplete="username"
              required
              value={formData.wbfNumber}
              onChange={handleChange}
              className={`appearance-none relative block w-full px-4 py-3 bg-white/5 border ${errors.wbfNumber ? 'border-red-400 focus:ring-red-500' : 'border-white/10 focus:ring-blue-500 focus:border-blue-500'} placeholder-gray-400 text-white rounded-xl focus:outline-none focus:ring-2 sm:text-sm transition-all duration-200 shadow-inner`}
              placeholder="np. 123456"
            />
            {errors.wbfNumber && (
              <p className="mt-2 text-xs text-red-400 ml-1">{errors.wbfNumber}</p>
            )}
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-200 ml-1 mb-1">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={formData.password}
              onChange={handleChange}
              className={`appearance-none relative block w-full px-4 py-3 bg-white/5 border ${errors.password ? 'border-red-400 focus:ring-red-500' : 'border-white/10 focus:ring-blue-500 focus:border-blue-500'} placeholder-gray-400 text-white rounded-xl focus:outline-none focus:ring-2 sm:text-sm transition-all duration-200 shadow-inner`}
              placeholder="••••••••"
            />
            {errors.password && (
              <p className="mt-2 text-xs text-red-400 ml-1">{errors.password}</p>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <input
              id="remember-me"
              name="remember-me"
              type="checkbox"
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-600 rounded bg-white/10"
            />
            <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-300">
              Remember me
            </label>
          </div>

          <div className="text-sm">
            <a href="#" className="font-semibold text-blue-400 hover:text-blue-300 transition-colors">
              Forgot password?
            </a>
          </div>
        </div>

        <div>
          <button
            type="submit"
            disabled={isLoading}
            className="group relative w-full flex justify-center py-3.5 px-4 border border-transparent text-sm font-bold rounded-xl text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 focus:ring-offset-gray-900 shadow-lg transform transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-70 disabled:cursor-not-allowed overflow-hidden"
          >
            {isLoading ? (
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <span className="absolute left-0 inset-y-0 flex items-center pl-3">
                <svg className="h-5 w-5 text-blue-300 group-hover:text-blue-200 transition-colors" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                </svg>
              </span>
            )}
            {isLoading ? 'Signing in...' : 'Sign in'}
          </button>
        </div>
      </form>
    </div>
  );
};
