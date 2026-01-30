export const authConfig = {
  authority: "https://auth.voicemessenger.mywire.org/realms/voice-messenger",
  client_id: "gateway-client",
  redirect_uri: window.location.origin,
  response_type: "code",
  scope: "openid profile email",
};
