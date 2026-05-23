export const APP_PASSWORD = 'aradhya';

export const AUTH_COOKIE = 'tally-auth';

/** Opaque cookie value set after successful login. */
export const AUTH_TOKEN = 'tally-authenticated';

export function isAuthenticated(cookieValue: string | undefined): boolean {
  return cookieValue === AUTH_TOKEN;
}
