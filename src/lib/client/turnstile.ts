/** Cloudflare Turnstile on the client. Without NEXT_PUBLIC_TURNSTILE_SITE_KEY it does nothing. */

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
const SCRIPT_URL = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

interface TurnstileApi {
  render(el: HTMLElement, options: Record<string, unknown>): string;
  remove(id: string): void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

let scriptLoading: Promise<TurnstileApi> | null = null;

function loadScript(): Promise<TurnstileApi> {
  scriptLoading ??= new Promise((resolve, reject) => {
    if (window.turnstile) return resolve(window.turnstile);
    const script = document.createElement("script");
    script.src = SCRIPT_URL;
    script.async = true;
    script.onload = () => (window.turnstile ? resolve(window.turnstile) : reject(new Error("Turnstile missing")));
    script.onerror = () => {
      scriptLoading = null;
      reject(new Error("Turnstile failed to load"));
    };
    document.head.appendChild(script);
  });
  return scriptLoading;
}

/**
 * Runs the check and returns its one-time token. Most visitors see nothing; a challenge,
 * when Cloudflare asks for one, shows at the bottom of the screen.
 */
export async function turnstileToken(): Promise<string | undefined> {
  if (!SITE_KEY || typeof window === "undefined") return undefined;
  const api = await loadScript();
  const box = document.createElement("div");
  box.style.cssText = "position:fixed;bottom:16px;left:50%;transform:translateX(-50%);z-index:50";
  document.body.appendChild(box);
  try {
    return await new Promise<string>((resolve, reject) => {
      api.render(box, {
        sitekey: SITE_KEY,
        appearance: "interaction-only",
        language: "he",
        callback: resolve,
        "error-callback": () => reject(new Error("Turnstile error")),
        "expired-callback": () => reject(new Error("Turnstile expired")),
      });
    });
  } finally {
    box.remove();
  }
}
