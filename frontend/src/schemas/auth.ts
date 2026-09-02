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
