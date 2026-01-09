/**
 * Log status values
 */
export const LOG_STATUS = {
  COMPLETED: 'COMPLETED',
  TENTATIVE: 'TENTATIVE',
} as const;

export type LogStatus = typeof LOG_STATUS[keyof typeof LOG_STATUS];

/**
 * Telegram conversation challenge types
 */
export const CHALLENGE_TYPES = {
  GAP_CONFIRM: 'GAP_CONFIRM',
  GAP_DURATION: 'GAP_DURATION',
  GAP_NAME: 'GAP_NAME',
} as const;

export type ChallengeType = typeof CHALLENGE_TYPES[keyof typeof CHALLENGE_TYPES];

/**
 * Time thresholds (in minutes)
 */
export const GAP_THRESHOLD_MINUTES = 5; // Show gap indicator if > 5 mins
export const IMPLICIT_CHAIN_MINUTES = 15; // Auto-chain if < 15 mins since last log

/**
 * Retry configuration for Telegram API
 */
export const TELEGRAM_RETRY = {
  ATTEMPTS: 3,
  DELAY_MS: 500,
} as const;

/**
 * Default tag values for new users
 */
export const DEFAULT_TAGS = [
  'Health',
  'Learning', 
  'Connection',
  'Deep Work',
  'Growth',
] as const;
