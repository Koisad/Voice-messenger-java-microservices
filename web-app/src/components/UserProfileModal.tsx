import { X } from 'lucide-react';
import type { User } from '../types';

interface UserProfileModalProps {
    user: User;
    onClose: () => void;
}

export function UserProfileModal({ user, onClose }: UserProfileModalProps) {
    return (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
            <div className="modal-content settings-modal" style={{ maxWidth: '400px' }}>
                <div className="modal-header">
                    <h2>Profil Użytkownika</h2>
                    <button className="icon-btn" onClick={onClose}><X size={24} /></button>
                </div>

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
                            border: '2px solid #5865f2',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                    >
                        {user.avatarUrl ? (
                            <img src={user.avatarUrl} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                            <div style={{ fontSize: '32px', color: '#b9bbbe', fontWeight: 'bold' }}>
                                {(user.displayName || user.username || "?").substring(0, 1).toUpperCase()}
                            </div>
                        )}
                    </div>

                    {/* Main Name Display */}
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#fff' }}>
                        {user.displayName || user.username}
                    </div>

                    {/* Username Display (if different or just as subtext) */}
                    <div style={{ fontSize: '16px', color: '#b9bbbe' }}>
                        {user.username}
                    </div>
                </div>

                <div className="form-group" style={{ marginBottom: '15px' }}>
                    {/* Removed Redundant Display Name Field */}
                </div>

                <div className="form-group" style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', color: '#b9bbbe', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase' }}>
                        Nazwa użytkownika
                    </label>
                    <div style={{
                        width: '100%',
                        padding: '10px',
                        background: '#202225',
                        border: '1px solid #202225',
                        borderRadius: '4px',
                        color: '#dcddde',
                        fontSize: '16px'
                    }}>
                        {user.username}
                    </div>
                </div>

                <div className="form-group" style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', color: '#b9bbbe', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase' }}>
                        User ID
                    </label>
                    <div style={{
                        width: '100%',
                        padding: '10px',
                        background: '#202225',
                        border: '1px solid #202225',
                        borderRadius: '4px',
                        color: '#72767d',
                        fontFamily: 'monospace',
                        fontSize: '12px'
                    }}>
                        {user.id}
                    </div>
                </div>
            </div>
        </div>
    );
}
