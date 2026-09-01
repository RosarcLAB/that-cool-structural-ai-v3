// services/authHeaders.ts
// Builds the Authorization header for backend calls.
//
// Both backends verify a Firebase ID token on every request. The token is
// short-lived (1 hour); getIdToken() transparently refreshes it when needed,
// so this can be called before every request without extra cost.

import { auth } from '../config/firebase';

/**
 * Returns an Authorization header for the signed-in user, or an empty object
 * if nobody is signed in (the backend will then reject with 401, which is the
 * correct outcome rather than silently sending an unauthenticated request).
 */
export async function getAuthHeaders(): Promise<Record<string, string>> {
  const user = auth.currentUser;
  if (!user) {
    return {};
  }
  try {
    const token = await user.getIdToken();
    return { Authorization: `Bearer ${token}` };
  } catch (error) {
    console.error('Failed to obtain Firebase ID token:', error);
    return {};
  }
}
