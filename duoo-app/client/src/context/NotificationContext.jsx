import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from './AuthContext';
import NotificationModal from '../components/ui/NotificationModal';

const NotificationContext = createContext();

export const useNotifications = () => {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error('useNotifications must be used within NotificationProvider');
    }
    return context;
};

export const NotificationProvider = ({ children }) => {
    const { user } = useAuth();
    const [popupNotification, setPopupNotification] = useState(null);
    const [seenPopups, setSeenPopups] = useState(new Set());

    const checkNotifications = async () => {
        if (!user) return;
        try {
            const response = await api.get('/notifications?limit=5');
            const notifications = response.data;

            // Find notifications that haven't been shown as popups yet (notified === false)
            // But we only want to show ONE at a time.
            const newPopup = notifications.find(
                (n) => !n.notified && !n.read && !seenPopups.has(n.id)
            );

            if (newPopup) {
                setPopupNotification(newPopup);
                setSeenPopups((prev) => new Set([...prev, newPopup.id]));

                // Immediately mark as notified on backend so it doesn't show again on reload
                await api.put(`/notifications/${newPopup.id}/notified`);
            }
        } catch (error) {
            console.error('Error checking notifications for popup:', error);
        }
    };

    // Check for new notifications periodically
    useEffect(() => {
        if (!user) {
            setPopupNotification(null);
            return;
        }

        // Check quickly on mount
        checkNotifications();

        // Check every 10 seconds
        const interval = setInterval(checkNotifications, 10000);

        return () => clearInterval(interval);
    }, [user]);

    const closePopup = () => {
        setPopupNotification(null);
    };

    return (
        <NotificationContext.Provider
            value={{
                checkNotifications
            }}
        >
            {children}
            {popupNotification && (
                <NotificationModal
                    notification={popupNotification}
                    onClose={closePopup}
                />
            )}
        </NotificationContext.Provider>
    );
};
