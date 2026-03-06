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

export const authConfig = {
    authority: "https://auth.voicemessenger.mywire.org/realms/voice-messenger",
    client_id: "gateway-client",
    // CRITICAL: Keycloak often whitelist exact URLs. 
    // window.location.origin gives "https://domain.com" without trailing slash.
    // If the browser adds a slash, we might need to handle it, but for now we MUST match Keycloak's whitelist.
    redirect_uri: window.location.origin,
    response_type: "code",
    scope: "openid profile email",
    post_logout_redirect_uri: window.location.origin,
};
