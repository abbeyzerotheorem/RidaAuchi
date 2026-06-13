import type { User } from 'firebase/auth';

const COOKIE_NAME = 'firebase-auth';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7;

export async function setAuthCookie(user: User) {
  const token = await user.getIdToken();
  document.cookie = `${COOKIE_NAME}=${token}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
}

export function clearAuthCookie() {
  document.cookie = `${COOKIE_NAME}=; path=/; max-age=0`;
}
