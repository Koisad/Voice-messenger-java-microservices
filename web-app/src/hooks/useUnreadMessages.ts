import { useState, useRef, useCallback } from 'react';
import { api } from '../api/client';

export const useUnreadMessages = (userId?: string) => {
    // Mapping: channelId -> count
    const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});

    // Store current counts in ref to access in callbacks without dependency issues
    const unreadCountsRef = useRef<Record<string, number>>({});

    const updateCounts = (newCounts: Record<string, number>) => {
        unreadCountsRef.current = newCounts;
        setUnreadCounts(newCounts);
    };

    const fetchUnreadCounts = useCallback(async (channelIds: string[]) => {
        if (!userId || channelIds.length === 0) return;
        try {
            const counts = await api.getUnreadCounts(channelIds);
            // Merge with existing counts (or replace? usually replace for a set of channels)
            // But we might have other channels in state (e.g. from other servers if we cached them? No, we usually just care about current view)
            // Let's merge to be safe, but typically we reset when switching servers.
            // For now, let's just update the keys we got

            setUnreadCounts(prev => {
                const next = { ...prev, ...counts };
                unreadCountsRef.current = next;
                return next;
            });
        } catch (err) {
            console.error("Failed to fetch unread counts", err);
        }
    }, [userId]);

    const incrementUnreadCount = useCallback((channelId: string) => {
        setUnreadCounts(prev => {
            const current = prev[channelId] || 0;
            const next = { ...prev, [channelId]: current + 1 };
            unreadCountsRef.current = next;
            return next;
        });
    }, []);

    const markAsRead = useCallback(async (channelId: string) => {
        // Optimistic update
        setUnreadCounts(prev => {
            const next = { ...prev };
            delete next[channelId]; // or set to 0
            unreadCountsRef.current = next;
            return next;
        });

        if (!userId) return;

        try {
            await api.markChannelAsRead(channelId);
        } catch (err) {
            console.error(`Failed to mark channel ${channelId} as read`, err);
            // Revert on error? Probably not worth the complexity for read status
        }
    }, [userId]);

    const clearCounts = useCallback(() => {
        updateCounts({});
    }, []);

    return {
        unreadCounts,
        fetchUnreadCounts,
        incrementUnreadCount,
        markAsRead,
        clearCounts
    };
};
