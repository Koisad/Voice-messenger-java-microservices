import React from 'react';
import type { User } from '../types';
import { Settings } from 'lucide-react';

interface UserBarProps {
    currentUser: User | null;
    onOpenSettings: () => void;
}

export const UserBar: React.FC<UserBarProps> = ({ currentUser, onOpenSettings }) => {
    return (
        <div className="user-bar" style={{
            display: 'flex',
            alignItems: 'center',
            padding: '10px',
            backgroundColor: '#292b2f', // Example color, adjust to match your App.css
            borderTop: '1px solid #202225'
        }}>
            <div className="user-avatar-container" style={{ position: 'relative', marginRight: '10px' }}>
                {currentUser?.avatarUrl ? (
                    <img src={currentUser.avatarUrl} alt="Avatar" className="user-avatar-img" style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }} />
                ) : (
                    <div className="user-avatar-placeholder" style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        backgroundColor: '#5865f2',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontSize: '14px'
                    }}>
                        {(currentUser?.displayName || currentUser?.username || "?").substring(0, 1).toUpperCase()}
                    </div>
                )}
                <div className="status-indicator online" style={{
                    position: 'absolute',
                    bottom: '-2px',
                    right: '-2px',
                    width: '10px',
                    height: '10px',
                    backgroundColor: '#3ba55c',
                    borderRadius: '50%',
                    border: '2px solid #292b2f'
                }} />
            </div>
            <div className="user-info" style={{ flex: 1, overflow: 'hidden' }}>
                <div className="username" style={{ fontWeight: 'bold', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {currentUser?.displayName || currentUser?.username}
                </div>
                <div className="status-text" style={{ fontSize: '12px', color: '#b9bbbe' }}>
                    #{currentUser?.username}
                </div>
            </div>
            <button
                className="icon-btn"
                onClick={onOpenSettings}
                title="Ustawienia użytkownika"
                style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#b9bbbe',
                    padding: '5px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}
            >
                <Settings size={20} />
            </button>
        </div>
    );
};
