import React, { useCallback, useMemo, useState } from "react";
import { FlatList, Modal, Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, usePaginatedQuery, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { GlassPressable } from "../../ui/GlassSurface";
import { theme } from "../../ui/theme";
import type { AppNotification } from "./types";
import { formatNotificationTimestamp, getNotificationTypeLabel } from "./utils";
import { formatError } from "../../utils/formatError";
import { styles } from "./NotificationCenter.styles";

type NotificationCenterProps = {
  variant?: "inline" | "row";
};

export function NotificationCenter({
  variant = "inline",
}: NotificationCenterProps = {}): React.JSX.Element {
  const [visible, setVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isMarkingAllRead, setIsMarkingAllRead] = useState(false);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const markRead = useMutation(api.notifications.markRead);
  const markAllRead = useMutation(api.notifications.markAllRead);
  const sendTestToMe = useMutation(api.notifications.sendTestToMe);
  const unreadCount = useQuery(api.notifications.getUnreadCount, {}) as
    | number
    | undefined;

  const { results, status, loadMore } = usePaginatedQuery(
    api.notifications.listMine,
    visible ? {} : "skip",
    { initialNumItems: 16 },
  );

  const notifications = useMemo(() => results as AppNotification[], [results]);
  const unreadDisplay = unreadCount ?? 0;

  const openModal = useCallback(() => {
    setVisible(true);
    setErrorMessage("");
  }, []);

  const closeModal = useCallback(() => {
    setVisible(false);
  }, []);

  const onMarkAllRead = useCallback(async () => {
    if (unreadDisplay === 0) {
      return;
    }
    setIsMarkingAllRead(true);
    setErrorMessage("");
    try {
      await markAllRead({});
    } catch (error) {
      setErrorMessage(formatError(error));
    } finally {
      setIsMarkingAllRead(false);
    }
  }, [markAllRead, unreadDisplay]);

  const onSendTestNotification = useCallback(async () => {
    setIsSendingTest(true);
    setErrorMessage("");
    try {
      await sendTestToMe({});
      setVisible(true);
    } catch (error) {
      setErrorMessage(formatError(error));
    } finally {
      setIsSendingTest(false);
    }
  }, [sendTestToMe]);

  const onOpenNotification = useCallback(
    async (notification: AppNotification) => {
      if (notification.readAt !== null) {
        return;
      }
      setErrorMessage("");
      try {
        await markRead({ notificationId: notification._id });
      } catch (error) {
        setErrorMessage(formatError(error));
      }
    },
    [markRead],
  );

  const renderNotification = useCallback(
    ({ item }: { item: AppNotification }) => {
      const unread = item.readAt === null;
      return (
        <Pressable
          onPress={() => void onOpenNotification(item)}
          style={({ pressed }) => [
            styles.card,
            unread ? styles.cardUnread : null,
            pressed ? styles.cardPressed : null,
          ]}
        >
          <View style={styles.metaRow}>
            <View style={styles.typeChip}>
              <Text style={styles.typeChipText}>
                {getNotificationTypeLabel(item.type)}
              </Text>
            </View>
            <Text style={styles.metaText}>
              {formatNotificationTimestamp(item.createdAt)}
            </Text>
          </View>
          <Text style={styles.cardTitle}>{item.title}</Text>
          <Text style={styles.cardBody}>{item.body}</Text>
          {unread ? <View style={styles.unreadDot} /> : null}
        </Pressable>
      );
    },
    [onOpenNotification],
  );

  return (
    <>
      <NotificationTrigger
        variant={variant}
        unreadCount={unreadDisplay}
        onPress={openModal}
      />
      <NotificationSheet
        visible={visible}
        unreadCount={unreadDisplay}
        notifications={notifications}
        canLoadMore={status === "CanLoadMore"}
        errorMessage={errorMessage}
        isMarkingAllRead={isMarkingAllRead}
        isSendingTest={isSendingTest}
        renderNotification={renderNotification}
        onClose={closeModal}
        onLoadMore={() => loadMore(16)}
        onMarkAllRead={() => void onMarkAllRead()}
        onSendTestNotification={() => void onSendTestNotification()}
      />
    </>
  );
}

function NotificationTrigger({
  variant,
  unreadCount,
  onPress,
}: {
  variant: "inline" | "row";
  unreadCount: number;
  onPress: () => void;
}): React.JSX.Element {
  if (variant === "inline") {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.bell,
          pressed ? styles.bellPressed : null,
        ]}
        accessibilityRole="button"
        accessibilityLabel={
          unreadCount > 0
            ? `Notifications, ${unreadCount} unread`
            : "Notifications"
        }
        hitSlop={6}
      >
        <Ionicons
          name={unreadCount > 0 ? "notifications" : "notifications-outline"}
          size={20}
          color={theme.colors.textPrimary}
        />
        {unreadCount > 0 ? (
          <View style={styles.bellBadge}>
            <Text style={styles.bellBadgeText} maxFontSizeMultiplier={1.2}>
              {unreadCount > 99 ? "99+" : unreadCount}
            </Text>
          </View>
        ) : null}
      </Pressable>
    );
  }

  return (
    <View style={styles.rowTrigger}>
      <GlassPressable
        onPress={onPress}
        surfaceStyle={styles.rowButton}
        pressedSurfaceStyle={styles.controlPressed}
      >
        <Ionicons
          name={unreadCount > 0 ? "notifications" : "notifications-outline"}
          size={16}
          color={theme.colors.textPrimary}
        />
        <Text style={styles.rowButtonText}>
          {unreadCount > 0 ? `${unreadCount} new` : "Notifications"}
        </Text>
      </GlassPressable>
    </View>
  );
}

type NotificationSheetProps = {
  visible: boolean;
  unreadCount: number;
  notifications: AppNotification[];
  canLoadMore: boolean;
  errorMessage: string;
  isMarkingAllRead: boolean;
  isSendingTest: boolean;
  renderNotification: ({
    item,
  }: {
    item: AppNotification;
  }) => React.JSX.Element;
  onClose: () => void;
  onLoadMore: () => void;
  onMarkAllRead: () => void;
  onSendTestNotification: () => void;
};

function NotificationSheet({
  visible,
  unreadCount,
  notifications,
  canLoadMore,
  errorMessage,
  isMarkingAllRead,
  isSendingTest,
  renderNotification,
  onClose,
  onLoadMore,
  onMarkAllRead,
  onSendTestNotification,
}: NotificationSheetProps): React.JSX.Element {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalBackdrop}>
        <Pressable style={styles.backdropDismissArea} onPress={onClose} />
        <View style={styles.modalSheet}>
          <NotificationSheetHeader
            unreadCount={unreadCount}
            isMarkingAllRead={isMarkingAllRead}
            onClose={onClose}
            onMarkAllRead={onMarkAllRead}
          />

          {__DEV__ ? (
            <Pressable
              onPress={onSendTestNotification}
              disabled={isSendingTest}
              style={({ pressed }) => [
                styles.devTestButton,
                pressed ? styles.controlPressed : null,
              ]}
            >
              <Ionicons
                name="flash-outline"
                size={12}
                color={theme.colors.yellowDeep}
              />
              <Text style={styles.devTestButtonText}>
                {isSendingTest ? "Sending…" : "Send test (dev)"}
              </Text>
            </Pressable>
          ) : null}

          {errorMessage.length > 0 ? (
            <Text style={styles.statusText}>{errorMessage}</Text>
          ) : null}

          <FlatList
            data={notifications}
            keyExtractor={(item) => item._id}
            renderItem={renderNotification}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Ionicons
                  name="notifications-off-outline"
                  size={28}
                  color={theme.colors.textMuted}
                />
                <Text style={styles.emptyText}>No notifications yet.</Text>
              </View>
            }
            ListFooterComponent={
              <View>
                {canLoadMore ? (
                  <GlassPressable
                    onPress={onLoadMore}
                    surfaceStyle={styles.loadMoreButton}
                    pressedSurfaceStyle={styles.controlPressed}
                  >
                    <Text style={styles.loadMoreText}>Load more</Text>
                  </GlassPressable>
                ) : null}
              </View>
            }
          />
        </View>
      </View>
    </Modal>
  );
}

function NotificationSheetHeader({
  unreadCount,
  isMarkingAllRead,
  onClose,
  onMarkAllRead,
}: {
  unreadCount: number;
  isMarkingAllRead: boolean;
  onClose: () => void;
  onMarkAllRead: () => void;
}): React.JSX.Element {
  return (
    <View style={styles.modalHeaderRow}>
      <View style={styles.modalTitleBlock}>
        <Text style={styles.modalTitle}>Notifications</Text>
        {unreadCount > 0 ? (
          <Text style={styles.modalSubtitle}>{unreadCount} unread</Text>
        ) : null}
      </View>
      <View style={styles.headerActions}>
        {unreadCount > 0 ? (
          <Pressable
            onPress={onMarkAllRead}
            disabled={isMarkingAllRead}
            style={({ pressed }) => [
              styles.headerActionButton,
              pressed ? styles.controlPressed : null,
            ]}
            accessibilityLabel="Mark all read"
          >
            <Text style={styles.headerActionText}>
              {isMarkingAllRead ? "Marking…" : "Mark all read"}
            </Text>
          </Pressable>
        ) : null}
        <Pressable
          onPress={onClose}
          style={({ pressed }) => [
            styles.closeIcon,
            pressed ? styles.controlPressed : null,
          ]}
          accessibilityLabel="Close notifications"
          hitSlop={8}
        >
          <Ionicons
            name="close"
            size={18}
            color={theme.colors.textPrimary}
          />
        </Pressable>
      </View>
    </View>
  );
}
