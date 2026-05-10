import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { theme } from "../../../ui/theme";
import { MaterialCommunityIcons } from "@expo/vector-icons";

const LEVEL_COLORS = {
  1: theme.colors.textSecondary,
  2: theme.colors.yellow,
  3: "#8b5cf6", // Violet
  4: "#f59e0b", // Amber
  5: "#ef4444", // Red
};

const BADGE_LABELS = {
  first_notice: "First Notice",
  campus_scout: "Campus Scout",
  eagle_eye: "Eagle Eye",
  facility_guardian: "Facility Guardian",
  giu_hero: "GIU Hero",
} as const;

export function ReporterStats() {
  const stats = useQuery(api.usersReporter.myStats);

  if (stats === undefined) {
    return (
      <View style={[styles.container, styles.loading]}>
        <Text style={styles.loadingText}>Loading stats...</Text>
      </View>
    );
  }

  if (stats === null) {
    return null;
  }

  const { xp, level, badges, closedTicketsCount } = stats;

  // Calculate next level XP requirement
  // Level = floor(sqrt(xp/10)) + 1
  // Next Level = Level + 1
  // Required XP for Next Level = ((Next Level - 1)^2) * 10
  const nextLevel = level + 1;
  const nextLevelXp = Math.pow(nextLevel - 1, 2) * 10;
  const currentLevelBaseXp = Math.pow(level - 1, 2) * 10;

  const xpIntoCurrentLevel = xp - currentLevelBaseXp;
  const xpRequiredForCurrentLevel = nextLevelXp - currentLevelBaseXp;
  const progressPercent = Math.min(100, Math.max(0, (xpIntoCurrentLevel / xpRequiredForCurrentLevel) * 100));

  const levelColor = LEVEL_COLORS[level as keyof typeof LEVEL_COLORS] || theme.colors.yellow;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.levelBadge}>
          <MaterialCommunityIcons name="star-circle" size={24} color={levelColor} />
          <Text style={[styles.levelText, { color: levelColor }]}>Level {level}</Text>
        </View>
        <Text style={styles.xpText}>{xp} XP</Text>
      </View>

      <View style={styles.progressContainer}>
        <View style={styles.progressBarBackground}>
          <View style={[styles.progressBarFill, { width: `${progressPercent}%`, backgroundColor: levelColor }]} />
        </View>
        <Text style={styles.progressText}>
          {nextLevelXp - xp} XP to Level {nextLevel}
        </Text>
      </View>

      {badges.length > 0 && (
        <View style={styles.badgesContainer}>
          <Text style={styles.badgesTitle}>Badges ({badges.length})</Text>
          <View style={styles.badgesList}>
            {badges.map((badge, idx) => (
              <View key={idx} style={styles.badgeItem}>
                <MaterialCommunityIcons name="shield-check" size={16} color={theme.colors.yellow} />
                <Text style={styles.badgeText}>{BADGE_LABELS[badge]}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      <View style={styles.statsFooter}>
        <Text style={styles.statsFooterText}>{closedTicketsCount} issues resolved thanks to you!</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 8,
  },
  loading: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 32,
  },
  loadingText: {
    color: theme.colors.textSecondary,
    fontSize: 14,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  levelBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  levelText: {
    fontSize: 18,
    fontWeight: "700",
  },
  xpText: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.textSecondary,
  },
  progressContainer: {
    marginBottom: 16,
  },
  progressBarBackground: {
    height: 8,
    backgroundColor: theme.colors.border,
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 6,
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    textAlign: "right",
  },
  badgesContainer: {
    marginTop: 4,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  badgesTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.textPrimary,
    marginBottom: 8,
  },
  badgesList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  badgeItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.background,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 4,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "500",
    color: theme.colors.textPrimary,
  },
  statsFooter: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  statsFooterText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    textAlign: "center",
    fontStyle: "italic",
  },
});
