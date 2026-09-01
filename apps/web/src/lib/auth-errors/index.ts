import i18n from '../../i18n/index.ts'

const AUTH_ERROR_KEYS: Record<string, string> = {
  INVALID_EMAIL_OR_PASSWORD: 'auth.invalidCredentials',
  INVALID_PASSWORD: 'auth.invalidCredentials',
  USER_NOT_FOUND: 'auth.invalidCredentials',
  CREDENTIAL_ACCOUNT_NOT_FOUND: 'auth.invalidCredentials',
  INVALID_EMAIL: 'auth.emailInvalid',
  USER_ALREADY_EXISTS: 'auth.emailInUse',
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: 'auth.emailInUse',
  PASSWORD_TOO_SHORT: 'auth.passwordMin',
  PASSWORD_TOO_LONG: 'auth.passwordTooLong',
  FAILED_TO_CREATE_USER: 'auth.signUpFailed',
  FAILED_TO_CREATE_SESSION: 'auth.signInFailed',
  SESSION_EXPIRED: 'auth.sessionExpired',
  INVALID_CODE: 'auth.invalidCode',
  INVALID_BACKUP_CODE: 'auth.invalidCode',
  INVALID_TWO_FACTOR_COOKIE: 'auth.twoFactorExpired',
  TOO_MANY_ATTEMPTS_REQUEST_NEW_CODE: 'auth.tooManyAttempts',
  ACCOUNT_TEMPORARILY_LOCKED: 'auth.accountLocked',
}

export function authErrorMessage(error: { code?: string; status?: number }, fallback: string) {
  if (error.code && AUTH_ERROR_KEYS[error.code]) {
    return i18n.t(AUTH_ERROR_KEYS[error.code])
  }
  if (error.status === 429) return i18n.t('auth.tooManyRequests')
  return fallback
}
