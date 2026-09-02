import React, { useState } from 'react';
import { registerSchema, RegisterFormData } from '../../../schemas/auth';
import { z } from 'zod';

interface RegisterFormProps {
  onSubmit?: (data: RegisterFormData) => void;
  isLoading?: boolean;
  onNavigateToLogin?: () => void;
}

export const RegisterForm: React.FC<RegisterFormProps> = ({ onSubmit, isLoading = false, onNavigateToLogin }) => {
  const [formData, setFormData] = useState<RegisterFormData>({
    email: '',
    wbfNumber: '',
    password: '',
    confirmPassword: '',
  });

  const [errors, setErrors] = useState<Partial<Record<keyof RegisterFormData, string>>>({});
  const [authError, setAuthError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name as keyof RegisterFormData]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
    setAuthError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const validData = registerSchema.parse(formData);
      setErrors({});
      if (onSubmit) {
        onSubmit(validData);
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Partial<Record<keyof RegisterFormData, string>> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            newErrors[err.path[0] as keyof RegisterFormData] = err.message;
          }
        });
        setErrors(newErrors);
      }
    }
  };

  return (
    <div className="w-full max-w-md p-8 space-y-6 bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl rounded-3xl relative overflow-hidden">
      {/* Decorative gradient glowing orb */}
      <div className="absolute -top-24 -right-24 w-48 h-48 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
      <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>

      <div className="relative z-10 text-center">
        <div className="mx-auto w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg mb-6 transform transition-transform hover:scale-105">
          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"></path>
          </svg>
        </div>
        <h2 className="text-3xl font-extrabold text-white tracking-tight">Create Account</h2>
        <p className="mt-2 text-sm text-gray-300 font-medium">Join WBF Convention Cards</p>
      </div>

      <form className="relative z-10 mt-8 space-y-5" onSubmit={handleSubmit} noValidate>
        {authError && (
          <div className="p-4 rounded-xl bg-red-500/20 border border-red-500/50 flex items-center">
             <span className="text-red-200 text-sm font-semibold">{authError}</span>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-200 ml-1 mb-1">
              Email Address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={formData.email}
              onChange={handleChange}
              className={`appearance-none relative block w-full px-4 py-3 bg-white/5 border ${errors.email ? 'border-red-400 focus:ring-red-500' : 'border-white/10 focus:ring-indigo-500 focus:border-indigo-500'} placeholder-gray-400 text-white rounded-xl focus:outline-none focus:ring-2 sm:text-sm transition-all duration-200 shadow-inner`}
              placeholder="you@example.com"
            />
            {errors.email && (
              <p className="mt-2 text-xs text-red-400 ml-1">{errors.email}</p>
            )}
          </div>

          <div>
            <label htmlFor="wbfNumber" className="block text-sm font-medium text-gray-200 ml-1 mb-1">
              WBF Number
            </label>
            <input
              id="wbfNumber"
              name="wbfNumber"
              type="text"
              required
              value={formData.wbfNumber}
              onChange={handleChange}
              className={`appearance-none relative block w-full px-4 py-3 bg-white/5 border ${errors.wbfNumber ? 'border-red-400 focus:ring-red-500' : 'border-white/10 focus:ring-indigo-500 focus:border-indigo-500'} placeholder-gray-400 text-white rounded-xl focus:outline-none focus:ring-2 sm:text-sm transition-all duration-200 shadow-inner`}
              placeholder="e.g. 123456"
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
              autoComplete="new-password"
              required
              value={formData.password}
              onChange={handleChange}
              className={`appearance-none relative block w-full px-4 py-3 bg-white/5 border ${errors.password ? 'border-red-400 focus:ring-red-500' : 'border-white/10 focus:ring-indigo-500 focus:border-indigo-500'} placeholder-gray-400 text-white rounded-xl focus:outline-none focus:ring-2 sm:text-sm transition-all duration-200 shadow-inner`}
              placeholder="••••••••"
            />
            {errors.password && (
              <p className="mt-2 text-xs text-red-400 ml-1">{errors.password}</p>
            )}
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-200 ml-1 mb-1">
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              required
              value={formData.confirmPassword}
              onChange={handleChange}
              className={`appearance-none relative block w-full px-4 py-3 bg-white/5 border ${errors.confirmPassword ? 'border-red-400 focus:ring-red-500' : 'border-white/10 focus:ring-indigo-500 focus:border-indigo-500'} placeholder-gray-400 text-white rounded-xl focus:outline-none focus:ring-2 sm:text-sm transition-all duration-200 shadow-inner`}
              placeholder="••••••••"
            />
            {errors.confirmPassword && (
              <p className="mt-2 text-xs text-red-400 ml-1">{errors.confirmPassword}</p>
            )}
          </div>
        </div>

        <div className="pt-2">
          <button
            type="submit"
            disabled={isLoading}
            className="group relative w-full flex justify-center py-3.5 px-4 border border-transparent text-sm font-bold rounded-xl text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 focus:ring-offset-gray-900 shadow-lg transform transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-70 disabled:cursor-not-allowed overflow-hidden"
          >
            {isLoading ? (
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <span className="absolute left-0 inset-y-0 flex items-center pl-3">
                <svg className="h-5 w-5 text-indigo-300 group-hover:text-indigo-200 transition-colors" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
              </span>
            )}
            {isLoading ? 'Creating account...' : 'Create Account'}
          </button>
        </div>
        
        <div className="text-center mt-4">
          <p className="text-sm text-gray-400">
            Already have an account?{' '}
            <button 
              type="button"
              onClick={(e) => { e.preventDefault(); onNavigateToLogin?.(); }} 
              className="font-semibold text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              Sign in
            </button>
          </p>
        </div>
      </form>
    </div>
  );
};
