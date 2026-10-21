/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Secure API Fetch Client with CSRF Protection for NxtWave AI Audit Platform
 */

export function getCsrfToken(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(/(?:^|;\s*)csrf_token=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}

export async function apiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const method = (init?.method || 'GET').toUpperCase();
  const headers = new Headers(init?.headers);

  // If request is mutating, automatically inject CSRF token
  if (method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS') {
    const csrfToken = getCsrfToken();
    if (csrfToken && !headers.has('X-CSRF-Token')) {
      headers.set('X-CSRF-Token', csrfToken);
    }
  }

  return fetch(input, {
    ...init,
    headers,
  });
}
