import React, { useCallback, useState } from "react";
import { Modal, Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  CampusCareIllustration,
  type CampusCareIllustrationName,
} from "../CampusCareIllustration";
import { GlassPressable, GlassSurface } from "../GlassSurface";
import { theme } from "../theme";
import { NotificationCenter } from "../../features/notifications/NotificationCenter";
import { styles } from "./WorkspaceHero.styles";

export type WorkspaceRole = "Reporter" | "Resolver" | "Manager";

export type WorkspaceSwitchTarget = {
  label: string;
  onPress: () => void;
};

export type WorkspaceHeroProps = {
  email: string;
  role: WorkspaceRole;
  illustration: CampusCareIllustrationName;
  onSignOut: () => void;
  switchTo?: WorkspaceSwitchTarget;
  showNotifications?: boolean;
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

export function WorkspaceHero({
  email,
  role,
  illustration,
  onSignOut,
  switchTo,
  showNotifications = true,
}: WorkspaceHeroProps): React.JSX.Element {
  const [menuOpen, setMenuOpen] = useState(false);

  const closeMenu = useCallback(() => setMenuOpen(false), []);
  const openMenu = useCallback(() => setMenuOpen(true), []);

  const handleSignOut = useCallback(() => {
    closeMenu();
    onSignOut();
  }, [closeMenu, onSignOut]);

  const handleSwitch = useCallback(() => {
    closeMenu();
    switchTo?.onPress();
  }, [closeMenu, switchTo]);

  return (
    <>
      <GlassSurface
        style={styles.heroSurface}
        fallbackStyle={styles.heroFallback}
      >
        <View style={styles.row}>
          <CampusCareIllustration
            accessibilityLabel={`${role} workspace illustration`}
            name={illustration}
            style={styles.illustration}
          />
          <View style={styles.identity}>
            <Text style={styles.greeting} maxFontSizeMultiplier={1.4}>
              Hi, {getDisplayName(email)}
            </Text>
            <View style={styles.identityMetaRow}>
              <View style={styles.roleChip}>
                <Text style={styles.roleChipText} maxFontSizeMultiplier={1.2}>
                  {role}
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
            {showNotifications ? (
              <NotificationCenter variant="inline" />
            ) : null}
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
            {__DEV__ && switchTo ? (
              <GlassPressable
                onPress={handleSwitch}
                surfaceStyle={styles.menuItem}
                pressedSurfaceStyle={styles.menuItemPressed}
              >
                <Ionicons
                  name="swap-horizontal-outline"
                  size={16}
                  color={theme.colors.textPrimary}
                />
                <Text style={styles.menuItemText}>{switchTo.label}</Text>
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
