import React from "react";
import { Image as ExpoImage } from "expo-image";
import { StyleSheet, Text, View } from "react-native";
import { useQuery } from "convex/react";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { api } from "../../../../convex/_generated/api";
import { theme } from "../../../ui/theme";

const campusImpactBackground = require("../../../../assets/illustrations/generated/campus-impact-background.png");

const LEVEL_COLORS = {
  1: theme.colors.yellowDeep,
  2: theme.colors.yellowDeep,
  3: "#8b5cf6",
  4: "#f59e0b",
  5: theme.colors.red,
};

const LEVEL_PHASES = [
  { level: 1, label: "First Notice" },
  { level: 2, label: "Campus Scout" },
  { level: 3, label: "Eagle Eye" },
  { level: 4, label: "Facility Guardian" },
  { level: 5, label: "GIU Hero" },
] as const;

const BADGE_LABELS: Record<string, string> = {
  first_notice: "First Notice",
  campus_scout: "Campus Scout",
  eagle_eye: "Eagle Eye",
  facility_guardian: "Facility Guardian",
  giu_hero: "GIU Hero",
};

function getPhaseLabel(level: number): string {
  return LEVEL_PHASES.find((phase) => phase.level === level)?.label ?? `Level ${level}`;
}

function getBadgeLabel(badge: string): string {
  return BADGE_LABELS[badge] ?? badge;
}

function getImpactCopy(closedTicketsCount: number): string {
  if (closedTicketsCount === 0) {
    return "Every solved report moves your campus impact forward.";
  }
  if (closedTicketsCount === 1) {
    return "Your report helped close one campus issue.";
  }
  return `Your reports helped close ${closedTicketsCount} campus issues.`;
}

export function ReporterStats() {
  const stats = useQuery(api.usersReporter.myStats);

  if (stats === undefined) {
    return (
      <View style={[styles.card, styles.loading]}>
        <Text style={styles.loadingText}>Loading campus impact...</Text>
      </View>
    );
  }

  if (stats === null) {
    return null;
  }

  const { xp, level, badges, closedTicketsCount } = stats;
  const nextLevel = level + 1;
  const nextLevelXp = Math.pow(nextLevel - 1, 2) * 10;
  const currentLevelBaseXp = Math.pow(level - 1, 2) * 10;
  const xpIntoCurrentLevel = xp - currentLevelBaseXp;
  const xpRequiredForCurrentLevel = nextLevelXp - currentLevelBaseXp;
  const progressPercent = Math.min(
    100,
    Math.max(0, (xpIntoCurrentLevel / xpRequiredForCurrentLevel) * 100),
  );
  const xpRemaining = Math.max(0, nextLevelXp - xp);
  const levelColor = LEVEL_COLORS[level as keyof typeof LEVEL_COLORS] || theme.colors.yellowDeep;
  const nextPhaseLabel = getPhaseLabel(nextLevel);
  const earnedBadgeLabel = badges.length > 0 ? getBadgeLabel(badges[badges.length - 1]) : null;
  const milestoneText =
    xpRemaining > 0 ? `${xpRemaining} XP to ${nextPhaseLabel}` : `Next up: ${nextPhaseLabel}`;

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Campus impact</Text>
      <View style={styles.card}>
        <ExpoImage
          accessibilityLabel="Campus impact progress illustration"
          contentFit="contain"
          source={campusImpactBackground}
          style={styles.backgroundArt}
          transition={120}
        />
        <View pointerEvents="none" style={styles.artWash} />

        <View style={styles.header}>
          <View style={styles.levelGroup}>
            <View style={[styles.levelMark, { borderColor: levelColor }]}>
              <MaterialCommunityIcons name="star" size={22} color={levelColor} />
            </View>
            <View style={styles.levelCopy}>
              <Text style={styles.eyebrow}>Reporter progress</Text>
              <Text style={styles.levelText}>Level {level}</Text>
            </View>
          </View>
          <Text style={styles.xpText}>{xp} XP</Text>
        </View>

        <Text style={styles.impactCopy}>{getImpactCopy(closedTicketsCount)}</Text>

        <View style={styles.progressBlock}>
          <View style={styles.progressMeta}>
            <Text style={styles.currentPhase}>{getPhaseLabel(level)}</Text>
            <Text style={styles.nextPhase}>{milestoneText}</Text>
          </View>
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                { width: `${progressPercent}%`, backgroundColor: levelColor },
              ]}
            />
          </View>
        </View>

        <View style={styles.impactSummary}>
          <View style={styles.summaryItem}>
            <MaterialCommunityIcons
              name="clipboard-check-outline"
              size={17}
              color={theme.colors.success}
            />
            <Text style={styles.summaryText}>
              {closedTicketsCount} closed {closedTicketsCount === 1 ? "report" : "reports"}
            </Text>
          </View>
          <View style={styles.summaryItem}>
            <MaterialCommunityIcons name="shield-star-outline" size={17} color={theme.colors.red} />
            <Text style={styles.summaryText}>
              {earnedBadgeLabel ? `Latest badge: ${earnedBadgeLabel}` : "First badge at first solved report"}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: 10,
    marginTop: 8,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: theme.colors.textPrimary,
    letterSpacing: -0.2,
  },
  card: {
    minHeight: 250,
    overflow: "hidden",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceMuted,
    padding: 18,
  },
  loading: {
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    color: theme.colors.textSecondary,
    fontSize: 14,
  },
  backgroundArt: {
    position: "absolute",
    right: -34,
    bottom: -30,
    width: 312,
    height: 396,
    opacity: 0.66,
  },
  artWash: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255, 253, 246, 0.24)",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 14,
  },
  levelGroup: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  levelMark: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.78)",
    borderWidth: 2,
  },
  levelCopy: {
    flex: 1,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: "800",
    color: theme.colors.textMuted,
    textTransform: "uppercase",
  },
  levelText: {
    fontSize: 30,
    fontWeight: "800",
    color: theme.colors.textPrimary,
  },
  xpText: {
    fontSize: 20,
    fontWeight: "800",
    color: theme.colors.textPrimary,
  },
  impactCopy: {
    width: "58%",
    marginTop: 16,
    fontSize: 16,
    lineHeight: 23,
    fontWeight: "700",
    color: theme.colors.textSecondary,
  },
  progressBlock: {
    marginTop: 22,
    gap: 9,
  },
  progressMeta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  currentPhase: {
    fontSize: 13,
    fontWeight: "800",
    color: theme.colors.textPrimary,
  },
  nextPhase: {
    flexShrink: 1,
    fontSize: 13,
    fontWeight: "800",
    color: theme.colors.textMuted,
    textAlign: "right",
  },
  progressTrack: {
    height: 9,
    overflow: "hidden",
    borderRadius: 5,
    backgroundColor: "rgba(234, 223, 189, 0.72)",
  },
  progressFill: {
    height: "100%",
    borderRadius: 5,
  },
  impactSummary: {
    width: "66%",
    gap: 8,
    marginTop: 22,
  },
  summaryItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  summaryText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 19,
    fontWeight: "700",
    color: theme.colors.textSecondary,
  },
});
