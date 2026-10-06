const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILURES = 5;
const MAX_TRACKED_EMAILS = 10_000;

interface FailureWindow {
  count: number;
  expiresAt: number;
}

const failures = new Map<string, FailureWindow>();

function pruneExpired(now: number) {
  for (const [email, window] of failures) {
    if (window.expiresAt <= now) failures.delete(email);
  }
}

export function isLoginRateLimited(email: string, now = Date.now()): boolean {
  const window = failures.get(email);
  if (!window) return false;
  if (window.expiresAt <= now) {
    failures.delete(email);
    return false;
  }
  return window.count >= MAX_FAILURES;
}

export function recordFailedLogin(email: string, now = Date.now()): void {
  let window = failures.get(email);
  if (!window || window.expiresAt <= now) {
    if (failures.size >= MAX_TRACKED_EMAILS) pruneExpired(now);
    if (failures.size >= MAX_TRACKED_EMAILS) failures.delete(failures.keys().next().value as string);
    window = { count: 0, expiresAt: now + WINDOW_MS };
    failures.set(email, window);
  }
  window.count += 1;
}

export function clearFailedLogins(email: string): void {
  failures.delete(email);
}
