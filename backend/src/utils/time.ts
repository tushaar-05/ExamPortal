let cachedTimeOffset = 0;
let lastSyncTime = 0;

/**
 * Returns an authoritative Date object for time-sensitive exam operations.
 * Fetches real atomic clock time from HTTP Date headers (Google / Cloudflare)
 * to prevent students from bypassing exam start/end times by changing their local OS date/time.
 */
export const getTrustedTime = async (): Promise<Date> => {
  const nowMs = Date.now();

  // Resync every 15 seconds or on initial call
  if (nowMs - lastSyncTime < 15_000 && lastSyncTime !== 0) {
    return new Date(Date.now() + cachedTimeOffset);
  }

  const servers = [
    'https://www.google.com',
    'https://1.1.1.1',
    'https://cloudflare.com',
  ];

  for (const serverUrl of servers) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1200);

      const res = await fetch(serverUrl, {
        method: 'HEAD',
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const dateHeader = res.headers.get('date');
      if (dateHeader) {
        const trustedMs = new Date(dateHeader).getTime();
        if (!isNaN(trustedMs) && trustedMs > 0) {
          const currentLocalMs = Date.now();
          cachedTimeOffset = trustedMs - currentLocalMs;
          lastSyncTime = currentLocalMs;
          return new Date(trustedMs);
        }
      }
    } catch {
      // try next server
    }
  }

  // Fallback to cached offset + current local time
  return new Date(Date.now() + cachedTimeOffset);
};
