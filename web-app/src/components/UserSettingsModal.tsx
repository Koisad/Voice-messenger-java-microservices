import React, { useState, useRef } from 'react';
import type { User } from '../types';
import { api } from '../api/client'; // Adjust path if needed
import { X, Camera, Save, Loader2 } from 'lucide-react';

interface UserSettingsModalProps {
    currentUser: User;
    onClose: () => void;
    onUpdate: (updatedUser: User) => void;
    onShowToast: (message: string, type: 'success' | 'error') => void;
}

export function UserSettingsModal({ currentUser, onClose, onUpdate, onShowToast }: UserSettingsModalProps) {
    const [displayName, setDisplayName] = useState(currentUser.displayName || currentUser.username);
    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(currentUser.avatarUrl || null);
    const [isLoading, setIsLoading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setAvatarFile(file);
            // Create preview
            const url = URL.createObjectURL(file);
            setPreviewUrl(url);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            // Only send fields that changed
            const nameToSend = displayName !== currentUser.displayName ? displayName : undefined;
            const updatedUser = await api.updateProfile(nameToSend, avatarFile || undefined);
            onUpdate(updatedUser);
            // Success toast is handled by parent or here? Parent currently does it.
            // But we can do it here if we want consistent feedback.
            // The parent code in App.tsx shows "Profil zaktualizowany" on success callback.
            // So we only handle error here.
            onClose();
        } catch (error) {
            console.error("Failed to update profile", error);
            onShowToast("Nie udało się zaktualizować profilu", "error");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
            <div className="modal-content settings-modal" style={{ maxWidth: '400px' }}>
                <div className="modal-header">
                    <h2>Ustawienia Profilu</h2>
                    <button className="icon-btn" onClick={onClose}><X size={24} /></button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="avatar-section" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '20px' }}>
                        <div
                            className="avatar-preview"
                            style={{
                                width: '100px',
                                height: '100px',
                                borderRadius: '50%',
                                overflow: 'hidden',
                                position: 'relative',
                                background: '#2f3136',
                                marginBottom: '10px',
                                border: '2px solid #5865f2'
                            }}
                        >
                            {previewUrl ? (
                                <img src={previewUrl} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', color: '#b9bbbe' }}>
                                    {currentUser.username.substring(0, 2).toUpperCase()}
                                </div>
                            )}

                            <div
                                className="avatar-overlay"
                                onClick={() => fileInputRef.current?.click()}
                                style={{
                                    position: 'absolute',
                                    top: 0, left: 0, right: 0, bottom: 0,
                                    background: 'rgba(0,0,0,0.5)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'cursor',
                                    opacity: 0,
                                    transition: 'opacity 0.2s'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                                onMouseLeave={(e) => e.currentTarget.style.opacity = '0'}
                            >
                                <Camera color="white" />
                            </div>
                        </div>
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            accept="image/*"
                            style={{ display: 'none' }}
                        />
                        <button type="button" className="btn-link" onClick={() => fileInputRef.current?.click()} style={{ background: 'none', border: 'none', color: '#00aff4', cursor: 'pointer', textDecoration: 'underline' }}>
                            Zmień avatar
                        </button>
                    </div>

                    <div className="form-group" style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', color: '#b9bbbe', fontSize: '12px', fontWeight: 'bold' }}>NAZWA WYŚWIETLANA</label>
                        <input
                            className="input-field"
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                            placeholder={currentUser.username}
                            style={{ width: '100%' }}
                        />
                    </div>

                    <div className="form-group" style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', color: '#b9bbbe', fontSize: '12px', fontWeight: 'bold' }}>USERNAME</label>
                        <div className="input-field" style={{ opacity: 0.7, cursor: 'not-allowed' }}>
                            {currentUser.username}
                        </div>
                    </div>

                    <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                        <button type="button" className="btn" onClick={onClose} disabled={isLoading} style={{ background: 'transparent' }}>
                            Anuluj
                        </button>
                        <button type="submit" className="btn btn-primary" disabled={isLoading} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {isLoading ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                            Zapisz
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
