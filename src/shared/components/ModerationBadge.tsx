import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { UI_CONFIG } from '../constants';

interface ModerationBadgeProps {
    status: 'approved' | 'under_review' | 'rejected';
    showLabel?: boolean;
}

export const ModerationBadge: React.FC<ModerationBadgeProps> = ({ status, showLabel = true }) => {
    if (status === 'approved') return null;

    const getStatusConfig = () => {
        switch (status) {
            case 'under_review':
                return {
                    text: 'Under Review',
                    color: '#FFA500', // Orange
                    backgroundColor: 'rgba(255, 165, 0, 0.1)',
                };
            case 'rejected':
                return {
                    text: 'Rejected',
                    color: UI_CONFIG.COLORS.ERROR || '#FF0000',
                    backgroundColor: 'rgba(255, 0, 0, 0.1)',
                };
            default:
                return null;
        }
    };

    const config = getStatusConfig();
    if (!config) return null;

    return (
        <View style={[styles.container, { backgroundColor: config.backgroundColor }]}>
            <View style={[styles.dot, { backgroundColor: config.color }]} />
            {showLabel && (
                <Text style={[styles.text, { color: config.color }]}>
                    {config.text}
                </Text>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        alignSelf: 'flex-start',
    },
    dot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        marginRight: 6,
    },
    text: {
        fontSize: 10,
        fontWeight: 'bold',
        textTransform: 'uppercase',
    },
});
