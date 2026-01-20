import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AchievementContext = createContext();

export const useAchievements = () => {
    const context = useContext(AchievementContext);
    if (!context) {
        throw new Error('useAchievements must be used within AchievementProvider');
    }
    return context;
};

export const AchievementProvider = ({ children }) => {
    const [pendingAchievement, setPendingAchievement] = useState(null);
    const [checkedAchievements, setCheckedAchievements] = useState(new Set());

    // Check for new achievements periodically
    useEffect(() => {
        const checkAchievements = async () => {
            try {
                const response = await api.get('/achievements/user');
                const achievements = response.data;

                // Find newly unlocked achievements
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

        // Check immediately and then every 30 seconds
        checkAchievements();
        const interval = setInterval(checkAchievements, 30000);

        return () => clearInterval(interval);
    }, [checkedAchievements]);

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
            }}
        >
            {children}
        </AchievementContext.Provider>
    );
};
