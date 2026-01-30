import { User } from "oidc-client-ts";

export const getUserToken = (): string | null => {
    const oidcStorage = sessionStorage.getItem(`oidc.user:https://auth.voicemessenger.mywire.org/realms/voice-messenger:gateway-client`);
    if (!oidcStorage) return null;

    try {
        const user = User.fromStorageString(oidcStorage);
        return user?.access_token || null;
    } catch (e) {
        return null;
    }
};

export const API_BASE_URL = "/api"; // Gateway proxy is at root relative to where we serve, or we point to localhost:8080 if running standalone?
// Docker compose maps 3000:80. Frontend calls its own backend which is nginx usually?
// Wait, in dev mode (npm run dev), we need a proxy to 8080.
// I will check vite.config.ts to set up proxy.
