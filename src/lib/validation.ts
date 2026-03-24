import { z } from 'zod';

type V = (key: string) => string;

export function createLoginSchema(v: V) {
  return z.object({
    email: z.string().email(v('emailInvalid')),
    password: z.string().min(6, v('passwordMin')),
  });
}

export function createRegisterSchema(v: V) {
  return z
    .object({
      email: z.string().email(v('emailInvalid')),
      password: z.string().min(6, v('passwordMin')),
      confirmPassword: z.string().min(6, v('passwordMin')),
      nom: z.string().min(1, v('required')),
      prenom: z.string().min(1, v('required')),
      adresse: z.string().min(1, v('required')),
      telephone: z.string(),
      societe: z.string(),
      numero_societe: z.string(),
    })
    .refine((data) => data.password === data.confirmPassword, {
      path: ['confirmPassword'],
      message: v('passwordMismatch'),
    });
}

export function createResetSchema(v: V) {
  return z.object({
    email: z.string().email(v('emailInvalid')),
  });
}

export function createProfileSchema(v: V) {
  return z.object({
    nom: z.string().min(1, v('required')),
    prenom: z.string().min(1, v('required')),
    adresse: z.string().min(1, v('required')),
    telephone: z.string(),
    societe: z.string(),
    numero_societe: z.string(),
  });
}

export function createCoproSchema(v: V) {
  return z.object({
    nom: z.string().min(2, v('nameMin')),
    adresse: z.string().min(5, v('addressMin')),
    numero_societe: z.string().min(1, v('required')),
    iban: z.string().min(5, v('ibanMin')),
    bic: z.string().optional(),
    milliemes: z.number().int().min(0, v('millièmesMinZero')),
  });
}

export function createInvitationSchema(v: V) {
  return z.object({
    alias: z.string().min(2, v('nameMin')),
    email: z.string().email(v('emailInvalid')).optional().or(z.literal('')),
    date_adhesion: z.string().min(1, v('dateRequired')),
  });
}

export function createJoinSchema(v: V) {
  return z.object({
    code: z.string().length(12, v('codeLength')),
    milliemes: z.number().int().min(1, v('millièmesMin')),
  });
}

export function createDepenseSchema(v: V) {
  return z.object({
    libelle: z.string().min(1, v('required')),
    montant_total: z.string().min(1, v('amountRequired')),
    date_depense: z.string().min(1, v('dateRequired')),
    description: z.string().optional(),
  });
}

export function createOverrideSchema(v: V) {
  return z.object({
    montant_override: z.string().min(1, v('amountRequired')),
    motif_override: z.string().optional(),
  });
}

export function createMarkPaidSchema(v: V) {
  return z.object({
    date_paiement: z.string().min(1, v('dateRequired')),
    reference: z.string().optional(),
  });
}

export function createDepositSchema(v: V) {
  return z.object({
    montant: z.string().min(1, v('amountRequired')),
    reference: z.string().optional(),
    date_depot: z.string().min(1, v('dateRequired')),
  });
}
