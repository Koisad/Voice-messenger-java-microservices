import React, { useState } from 'react';
import './RegisterPage.css';
import { api } from '../api/client';
import type { RegisterRequestDTO } from '../types';

interface RegisterPageProps {
    onSwitchToLogin: () => void;
}

export const RegisterPage: React.FC<RegisterPageProps> = ({ onSwitchToLogin }) => {
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!username.trim() || !email.trim() || !password.trim()) {
            setError('Wypełnij wszystkie pola');
            return;
        }

        if (password !== confirmPassword) {
            setError('Hasła nie są identyczne');
            return;
        }

        setError('');
        setLoading(true);

        try {
            const data: RegisterRequestDTO = {
                username: username.trim(),
                email: email.trim(),
                password: password
            };

            await api.register(data);
            setSuccess(true);
            setLoading(false);
        } catch (err: any) {
            setError(err.message || 'Rejestracja nie powiodła się');
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="register-page">
                <div className="register-container">
                    <div className="register-glow" />
                    <div className="register-header">
                        <div className="register-logo">
                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12" />
                            </svg>
                        </div>
                        <h1 className="register-title">Konto utworzone!</h1>
                        <p className="register-subtitle">Możesz się teraz zalogować.</p>
                    </div>
                    <button className="register-btn register-btn-primary" onClick={onSwitchToLogin}>
                        Przejdź do logowania
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="register-page">
            <div className="register-container">
                <div className="register-glow" />

                <div className="register-header">
                    <div className="register-logo">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                            <circle cx="8.5" cy="7" r="4" />
                            <line x1="20" y1="8" x2="20" y2="14" />
                            <line x1="23" y1="11" x2="17" y2="11" />
                        </svg>
                    </div>
                    <h1 className="register-title">Utwórz konto</h1>
                    <p className="register-subtitle">Dołącz do Voice Messenger</p>
                </div>

                <form className="register-form" onSubmit={handleRegister}>
                    <div className="register-field">
                        <label htmlFor="register-email">Email</label>
                        <input
                            id="register-email"
                            type="email"
                            placeholder="jan@example.com"
                            autoComplete="email"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            disabled={loading}
                        />
                    </div>

                    <div className="register-field">
                        <label htmlFor="register-username">Nazwa użytkownika</label>
                        <input
                            id="register-username"
                            type="text"
                            placeholder="jan123"
                            autoComplete="username"
                            value={username}
                            onChange={e => setUsername(e.target.value)}
                            disabled={loading}
                        />
                    </div>

                    <div className="register-field">
                        <label htmlFor="register-password">Hasło</label>
                        <input
                            id="register-password"
                            type="password"
                            placeholder="••••••••"
                            autoComplete="new-password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            disabled={loading}
                        />
                    </div>

                    <div className="register-field">
                        <label htmlFor="register-confirm-password">Potwierdź hasło</label>
                        <input
                            id="register-confirm-password"
                            type="password"
                            placeholder="••••••••"
                            autoComplete="new-password"
                            value={confirmPassword}
                            onChange={e => setConfirmPassword(e.target.value)}
                            disabled={loading}
                        />
                    </div>

                    {error && <div className="register-error">{error}</div>}

                    <button type="submit" className="register-btn register-btn-primary" disabled={loading}>
                        {loading ? 'Rejestrowanie...' : 'Zarejestruj się'}
                    </button>
                </form>

                <div className="register-divider">
                    <span>Masz już konto?</span>
                </div>

                <button className="register-btn register-btn-secondary" onClick={onSwitchToLogin}>
                    Zaloguj się
                </button>
            </div>
        </div>
    );
};
