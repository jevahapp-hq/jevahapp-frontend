import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { UI_CONFIG } from '../constants';
import { UNDER_REVIEW_BADGE_LABEL } from '../media/underReviewBannerLayout';

interface ModerationBadgeProps {
    /** Widened to `string`: the API also sends `pending`, and omits it entirely
     * on some paths. Anything that isn't `approved` deserves a badge. */
    status?: string | null;
    showLabel?: boolean;
}

export const ModerationBadge: React.FC<ModerationBadgeProps> = ({ status, showLabel = true }) => {
    const normalized = String(status || '').toLowerCase();
    if (normalized === 'approved') return null;

    const getStatusConfig = () => {
        switch (normalized) {
            case 'rejected':
                return {
                    // Rejected content is owner-visible only, so the badge has
                    // to explain why nobody else is engaging with it.
                    text: 'Rejected · only you can see this',
                    color: UI_CONFIG.COLORS.ERROR || '#FF0000',
                    backgroundColor: 'rgba(255, 0, 0, 0.1)',
                };
            case 'under_review':
            case 'pending':
            default:
                return {
                    text: UNDER_REVIEW_BADGE_LABEL,
                    color: '#FFA500', // Orange
                    backgroundColor: 'rgba(255, 165, 0, 0.1)',
                };
        }
    };

    const config = getStatusConfig();
    if (!config) return null;

    return (
        <View style={[styles.container, { backgroundColor: config.backgroundColor }]}>
            <View style={[styles.dot, { backgroundColor: config.color }]} />
            {showLabel && (
                <Text
                    style={[styles.text, { color: config.color }]}
                    allowFontScaling
                    maxFontSizeMultiplier={1.2}
                    adjustsFontSizeToFit={false}
                >
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
        flexWrap: 'wrap',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        alignSelf: 'flex-start',
        maxWidth: '100%',
        overflow: 'visible',
    },
    dot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        marginRight: 6,
        flexShrink: 0,
    },
    text: {
        fontSize: 11,
        lineHeight: 16,
        fontWeight: 'bold',
        letterSpacing: 0.3,
        flexShrink: 1,
        flexGrow: 0,
        flexWrap: 'wrap',
        minWidth: 0,
        overflow: 'visible',
    },
});
