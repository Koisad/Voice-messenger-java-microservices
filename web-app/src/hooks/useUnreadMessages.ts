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

    const fetchUnreadCounts = useCallback(async (channelIds: string[], ignoreChannelId?: string) => {
        if (!userId || channelIds.length === 0) return;
        try {
            const counts = await api.getUnreadCounts(channelIds);

            setUnreadCounts(prev => {
                const next = { ...prev, ...counts };
                // If we are currently on a channel, ensure it stays marked as read (0 or undefined)
                // even if the server returned a count (race condition)
                if (ignoreChannelId && next[ignoreChannelId]) {
                    delete next[ignoreChannelId];
                }
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
