import { z } from "zod";

import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  hasSpecialCharacter,
} from "@/lib/auth/password-policy";

export const loginSchema = z.object({
  email: z.email("Informe um e-mail valido."),
  password: z
    .string()
    .trim()
    .min(1, "Informe a senha para continuar."),
  next: z.string().optional(),
});

export const forgotPasswordSchema = z.object({
  email: z.email("Informe um e-mail valido."),
});

export const changePasswordSchema = z
  .object({
    newPassword: z
      .string()
      .min(PASSWORD_MIN_LENGTH, `A senha deve ter no minimo ${PASSWORD_MIN_LENGTH} caracteres.`)
      .max(PASSWORD_MAX_LENGTH, `A senha deve ter no maximo ${PASSWORD_MAX_LENGTH} caracteres.`),
    confirmPassword: z.string().min(1, "Confirme a nova senha."),
    acceptTerms: z.boolean(),
  })
  .superRefine((value, context) => {
    if (!hasSpecialCharacter(value.newPassword)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "A senha deve conter pelo menos um caractere especial.",
        path: ["newPassword"],
      });
    }

    if (value.newPassword !== value.confirmPassword) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Os campos de senha devem ser identicos.",
        path: ["confirmPassword"],
      });
    }

    if (!value.acceptTerms) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Voce precisa aceitar os termos de uso do sistema.",
        path: ["acceptTerms"],
      });
    }
  });

export function getFieldErrors(error: z.ZodError) {
  return error.flatten().fieldErrors;
}
