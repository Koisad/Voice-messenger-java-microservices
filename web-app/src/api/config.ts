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
    redirect_uri: window.location.origin + '/', // Add trailing slash just in case
    response_type: "code",
    scope: "openid profile email",
};
