import React, { useCallback, useState } from "react";
import { Modal, Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { CampusCareIllustration } from "../../../ui/CampusCareIllustration";
import { GlassPressable, GlassSurface } from "../../../ui/GlassSurface";
import { theme } from "../../../ui/theme";
import { NotificationCenter } from "../../notifications/NotificationCenter";
import { styles } from "./ReporterWorkspaceHero.styles";

type ReporterWorkspaceHeroProps = {
  email: string;
  onSignOut: () => void;
  onSwitchToResolver?: () => void;
};

function getInitials(email: string): string {
  const localPart = email.split("@")[0] ?? email;
  const segments = localPart.split(/[._-]+/).filter(Boolean);
  if (segments.length === 0) {
    return email.slice(0, 1).toUpperCase();
  }
  if (segments.length === 1) {
    return segments[0].slice(0, 2).toUpperCase();
  }
  return `${segments[0][0]}${segments[1][0]}`.toUpperCase();
}

function getDisplayName(email: string): string {
  const localPart = email.split("@")[0] ?? email;
  const first = localPart.split(/[._-]+/)[0] ?? localPart;
  return first.charAt(0).toUpperCase() + first.slice(1);
}

export function ReporterWorkspaceHero({
  email,
  onSignOut,
  onSwitchToResolver,
}: ReporterWorkspaceHeroProps): React.JSX.Element {
  const [menuOpen, setMenuOpen] = useState(false);

  const closeMenu = useCallback(() => setMenuOpen(false), []);
  const openMenu = useCallback(() => setMenuOpen(true), []);

  const handleSignOut = useCallback(() => {
    closeMenu();
    onSignOut();
  }, [closeMenu, onSignOut]);

  const handleSwitchRole = useCallback(() => {
    closeMenu();
    onSwitchToResolver?.();
  }, [closeMenu, onSwitchToResolver]);

  return (
    <>
      <GlassSurface
        style={styles.heroSurface}
        fallbackStyle={styles.heroFallback}
      >
        <View style={styles.row}>
          <CampusCareIllustration
            accessibilityLabel="Reporter workspace illustration"
            name="ticketReport"
            style={styles.illustration}
          />
          <View style={styles.identity}>
            <Text style={styles.greeting} maxFontSizeMultiplier={1.4}>
              Hi, {getDisplayName(email)}
            </Text>
            <View style={styles.identityMetaRow}>
              <View style={styles.roleChip}>
                <Text style={styles.roleChipText} maxFontSizeMultiplier={1.2}>
                  Reporter
                </Text>
              </View>
              <Text
                style={styles.initialsBadge}
                maxFontSizeMultiplier={1.2}
                numberOfLines={1}
              >
                {getInitials(email)}
              </Text>
            </View>
          </View>
          <View style={styles.actionsRow}>
            <NotificationCenter variant="inline" />
            <Pressable
              onPress={openMenu}
              style={styles.menuButton}
              accessibilityLabel="Open account menu"
              accessibilityRole="button"
              hitSlop={8}
            >
              <Ionicons
                name="ellipsis-horizontal"
                size={20}
                color={theme.colors.textPrimary}
              />
            </Pressable>
          </View>
        </View>
      </GlassSurface>

      <Modal
        visible={menuOpen}
        transparent
        animationType="fade"
        onRequestClose={closeMenu}
      >
        <Pressable style={styles.menuBackdrop} onPress={closeMenu} />
        <View style={styles.menuSheet} pointerEvents="box-none">
          <View style={styles.menuCard}>
            <Text style={styles.menuEmail} numberOfLines={1}>
              {email}
            </Text>
            {__DEV__ && onSwitchToResolver ? (
              <GlassPressable
                onPress={handleSwitchRole}
                surfaceStyle={styles.menuItem}
                pressedSurfaceStyle={styles.menuItemPressed}
              >
                <Ionicons
                  name="swap-horizontal-outline"
                  size={16}
                  color={theme.colors.textPrimary}
                />
                <Text style={styles.menuItemText}>Switch to Resolver (dev)</Text>
              </GlassPressable>
            ) : null}
            <GlassPressable
              onPress={handleSignOut}
              surfaceStyle={styles.menuItem}
              pressedSurfaceStyle={styles.menuItemPressed}
            >
              <Ionicons
                name="log-out-outline"
                size={16}
                color={theme.colors.red}
              />
              <Text style={[styles.menuItemText, styles.menuItemDanger]}>
                Sign out
              </Text>
            </GlassPressable>
          </View>
        </View>
      </Modal>
    </>
  );
}
