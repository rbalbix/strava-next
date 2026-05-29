import { z } from 'zod';

const StravaServerEnvSchema = z.object({
  CLIENT_ID: z.string().min(1),
  CLIENT_SECRET: z.string().min(1),
});

const StravaOAuthStartEnvSchema = z.object({
  CLIENT_ID: z.string().min(1),
  RESPONSE_TYPE: z.string().min(1).default('code'),
  APPROVAL_PROMPT: z.string().min(1).default('auto'),
  STRAVA_SCOPE: z.string().min(1).default('read,profile:read_all,activity:read_all'),
});

const StravaOAuthTokenEnvSchema = StravaServerEnvSchema.extend({
  GRANT_TYPE: z.string().min(1).default('authorization_code'),
  RESPONSE_TYPE: z.string().min(1).default('code'),
  APPROVAL_PROMPT: z.string().min(1).default('auto'),
  STRAVA_SCOPE: z.string().min(1).default('read,profile:read_all,activity:read_all'),
});

const EmailServerEnvSchema = z.object({
  RESEND_API_KEY: z.string().min(1),
  RESEND_EMAIL_FROM: z.string().min(1),
});

function getStravaServerEnv() {
  return StravaServerEnvSchema.safeParse(process.env);
}

function getStravaOAuthStartEnv() {
  return StravaOAuthStartEnvSchema.safeParse(process.env);
}

function getStravaOAuthTokenEnv() {
  return StravaOAuthTokenEnvSchema.safeParse(process.env);
}

function getEmailServerEnv() {
  return EmailServerEnvSchema.safeParse(process.env);
}

export {
  getEmailServerEnv,
  getStravaOAuthStartEnv,
  getStravaOAuthTokenEnv,
  getStravaServerEnv,
};
