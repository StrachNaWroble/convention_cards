import { z } from 'zod';

export const loginSchema = z.object({
  wbfNumber: z
    .string()
    .min(1, 'WBF Number is required')
    .regex(/^[0-9]+$/, 'WBF Number must contain only digits'),
  password: z
    .string()
    .min(6, 'Password must be at least 6 characters long'),
});

export type LoginFormData = z.infer<typeof loginSchema>;

export const registerSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Invalid email address'),
  wbfNumber: z
    .string()
    .min(1, 'WBF Number is required')
    .regex(/^[0-9]+$/, 'WBF Number must contain only digits'),
  password: z
    .string()
    .min(6, 'Password must be at least 6 characters long'),
  confirmPassword: z
    .string()
    .min(1, 'Please confirm your password'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"], // path of error
});

export type RegisterFormData = z.infer<typeof registerSchema>;
