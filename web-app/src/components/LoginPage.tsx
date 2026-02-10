import React, { useState } from 'react';
import { useAuth } from 'react-oidc-context';
import './LoginPage.css';

// Keycloak IDP hint values for social login
const GOOGLE_IDP = 'google';
const GITHUB_IDP = 'github';

const KEYCLOAK_TOKEN_URL = 'https://auth.voicemessenger.mywire.org/realms/voice-messenger/protocol/openid-connect/token';
const CLIENT_ID = 'gateway-client';
const AUTHORITY = 'https://auth.voicemessenger.mywire.org/realms/voice-messenger';
const STORAGE_KEY = `oidc.user:${AUTHORITY}:${CLIENT_ID}`;

/** Decode a JWT payload (base64url → JSON) */
function decodeJwtPayload(token: string): any {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(base64));
}

export const LoginPage: React.FC = () => {
    const auth = useAuth();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSocialLogin = (idpHint: string) => {
        auth.signinRedirect({
            extraQueryParams: { kc_idp_hint: idpHint },
        });
    };

    const handleDirectLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!username.trim() || !password.trim()) return;

        setError('');
        setLoading(true);

        try {
            const body = new URLSearchParams({
                grant_type: 'password',
                client_id: CLIENT_ID,
                username: username.trim(),
                password: password,
                scope: 'openid profile email',
            });

            const res = await fetch(KEYCLOAK_TOKEN_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: body.toString(),
            });

            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                if (data.error === 'invalid_grant') {
                    setError('Nieprawidłowa nazwa użytkownika lub hasło');
                } else {
                    setError(data.error_description || 'Błąd logowania');
                }
                setLoading(false);
                return;
            }

            const tokens = await res.json();
            const idPayload = tokens.id_token ? decodeJwtPayload(tokens.id_token) : {};

            // Build oidc-client-ts User object for session storage
            const user = {
                access_token: tokens.access_token,
                token_type: tokens.token_type || 'Bearer',
                id_token: tokens.id_token,
                refresh_token: tokens.refresh_token,
                scope: tokens.scope || 'openid profile email',
                expires_at: Math.floor(Date.now() / 1000) + (tokens.expires_in || 300),
                profile: {
                    sub: idPayload.sub,
                    preferred_username: idPayload.preferred_username,
                    email: idPayload.email,
                    name: idPayload.name,
                    given_name: idPayload.given_name,
                    family_name: idPayload.family_name,
                    picture: idPayload.picture,
                    iss: idPayload.iss,
                    aud: idPayload.aud,
                },
            };

            sessionStorage.setItem(STORAGE_KEY, JSON.stringify(user));

            // Reload so react-oidc-context picks up the stored user
            window.location.reload();

        } catch (err) {
            setError('Nie udało się połączyć z serwerem');
            setLoading(false);
        }
    };

    return (
        <div className="login-page">
            <div className="login-container">
                <div className="login-glow" />

                <div className="login-header">
                    <div className="login-logo">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                            <line x1="12" y1="19" x2="12" y2="23" />
                            <line x1="8" y1="23" x2="16" y2="23" />
                        </svg>
                    </div>
                    <h1 className="login-title">Voice Messenger</h1>
                    <p className="login-subtitle">Komunikuj się głosem i tekstem</p>
                </div>

                <form className="login-form" onSubmit={handleDirectLogin}>
                    <div className="login-field">
                        <label htmlFor="login-email">Email lub nazwa użytkownika</label>
                        <input
                            id="login-email"
                            type="text"
                            placeholder="jan@example.com"
                            autoComplete="username"
                            value={username}
                            onChange={e => setUsername(e.target.value)}
                            disabled={loading}
                        />
                    </div>
                    <div className="login-field">
                        <label htmlFor="login-password">Hasło</label>
                        <input
                            id="login-password"
                            type="password"
                            placeholder="••••••••"
                            autoComplete="current-password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            disabled={loading}
                        />
                    </div>

                    {error && <div className="login-error">{error}</div>}

                    <button type="submit" className="login-btn login-btn-primary" disabled={loading}>
                        {loading ? 'Logowanie...' : 'Zaloguj się'}
                    </button>
                </form>

                <div className="login-divider">
                    <span>lub kontynuuj przez</span>
                </div>

                <div className="login-social">
                    <button className="login-btn login-btn-google" onClick={() => handleSocialLogin(GOOGLE_IDP)}>
                        <svg className="login-btn-icon" viewBox="0 0 24 24" width="20" height="20">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                        </svg>
                        Google
                    </button>

                    <button className="login-btn login-btn-github" onClick={() => handleSocialLogin(GITHUB_IDP)}>
                        <svg className="login-btn-icon" viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                        </svg>
                        GitHub
                    </button>
                </div>

                <p className="login-footer">
                    Logując się, akceptujesz warunki użytkowania
                </p>
            </div>
        </div>
    );
};
