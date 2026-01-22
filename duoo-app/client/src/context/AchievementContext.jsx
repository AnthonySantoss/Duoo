import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from './AuthContext';

const AchievementContext = createContext();

export const useAchievements = () => {
    const context = useContext(AchievementContext);
    if (!context) {
        throw new Error('useAchievements must be used within AchievementProvider');
    }
    return context;
};

export const AchievementProvider = ({ children }) => {
    const { user } = useAuth();
    const [pendingAchievement, setPendingAchievement] = useState(null);
    const [checkedAchievements, setCheckedAchievements] = useState(new Set());

    const checkAchievements = async () => {
        if (!user) return;
        try {
            const response = await api.get('/achievements/user');
            const achievements = response.data;

            // Find newly unlocked achievements that haven't been notified
            const newAchievement = achievements.find(
                (ach) => ach.unlocked && !ach.notified && !checkedAchievements.has(ach.id)
            );

            if (newAchievement) {
                setPendingAchievement(newAchievement);
                setCheckedAchievements((prev) => new Set([...prev, newAchievement.id]));

                // Mark as notified on backend
                await api.post(`/achievements/${newAchievement.id}/notify`);
            }
        } catch (error) {
            console.error('Error checking achievements:', error);
        }
    };

    // Check for new achievements periodically
    useEffect(() => {
        if (!user) {
            setPendingAchievement(null);
            return;
        }

        // Check immediately
        checkAchievements();

        // Check every 20 seconds
        const interval = setInterval(checkAchievements, 20000);

        return () => clearInterval(interval);
    }, [user]); // Only restart when user context changes

    const dismissAchievement = () => {
        setPendingAchievement(null);
    };

    const triggerAchievement = (achievement) => {
        setPendingAchievement(achievement);
        setCheckedAchievements((prev) => new Set([...prev, achievement.id]));
    };

    return (
        <AchievementContext.Provider
            value={{
                pendingAchievement,
                dismissAchievement,
                triggerAchievement,
                checkAchievements,
            }}
        >
            {children}
        </AchievementContext.Provider>
    );
};
