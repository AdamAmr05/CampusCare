import React, { useCallback, useMemo, useState } from "react";
import { FlatList, Modal, Pressable, Text, View } from "react-native";
import { useMutation, usePaginatedQuery, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { GlassPressable, getActiveGlassTint } from "../../ui/GlassSurface";
import type { AppNotification } from "./types";
import { formatNotificationTimestamp, getNotificationTypeLabel } from "./utils";
import { formatError } from "../../utils/formatError";
import { styles } from "./NotificationCenter.styles";

export function NotificationCenter(): React.JSX.Element {
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
    {},
    { initialNumItems: 16 },
  );

  const notifications = useMemo(() => results as AppNotification[], [results]);

  const openModal = useCallback(() => {
    setVisible(true);
    setErrorMessage("");
  }, []);

  const closeModal = useCallback(() => {
    setVisible(false);
  }, []);

  const onMarkAllRead = useCallback(async () => {
    if ((unreadCount ?? 0) === 0) {
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
  }, [markAllRead, unreadCount]);

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
          style={[styles.card, unread ? styles.cardUnread : null]}
        >
          <View style={styles.metaRow}>
            <View style={styles.typeChip}>
              <Text style={styles.typeChipText}>{getNotificationTypeLabel(item.type)}</Text>
            </View>
            <Text style={styles.metaText}>{formatNotificationTimestamp(item.createdAt)}</Text>
          </View>
          <Text style={styles.cardTitle}>{item.title}</Text>
          <Text style={styles.cardBody}>{item.body}</Text>
        </Pressable>
      );
    },
    [onOpenNotification],
  );

  const unreadDisplay = unreadCount ?? 0;

  return (
    <>
      <View style={styles.triggerRow}>
        <GlassPressable
          onPress={openModal}
          surfaceStyle={styles.triggerButton}
          pressedSurfaceStyle={styles.controlPressed}
        >
          <Text style={styles.triggerButtonText}>Notifications ({unreadDisplay} unread)</Text>
        </GlassPressable>
        <GlassPressable
          onPress={() => void onMarkAllRead()}
          disabled={isMarkingAllRead || unreadDisplay === 0}
          surfaceStyle={styles.markAllButton}
          pressedSurfaceStyle={styles.controlPressed}
          disabledSurfaceStyle={styles.controlDisabled}
        >
          <Text style={styles.markAllText}>
            {isMarkingAllRead ? "Marking..." : "Mark all read"}
          </Text>
        </GlassPressable>
        {__DEV__ ? (
          <GlassPressable
            onPress={() => void onSendTestNotification()}
            disabled={isSendingTest}
            surfaceStyle={styles.testButton}
            pressedSurfaceStyle={styles.controlPressed}
            disabledSurfaceStyle={styles.controlDisabled}
            tintColor={getActiveGlassTint(true)}
          >
            <Text style={styles.testButtonText}>
              {isSendingTest ? "Sending..." : "Send test"}
            </Text>
          </GlassPressable>
        ) : null}
      </View>

      <Modal
        visible={visible}
        transparent
        animationType="slide"
        onRequestClose={closeModal}
      >
        <View style={styles.modalBackdrop}>
          <Pressable style={styles.backdropDismissArea} onPress={closeModal} />
          <View style={styles.modalSheet}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Notifications</Text>
              <GlassPressable
                onPress={closeModal}
                surfaceStyle={styles.closeButton}
                pressedSurfaceStyle={styles.controlPressed}
              >
                <Text style={styles.closeButtonText}>Close</Text>
              </GlassPressable>
            </View>

            {errorMessage.length > 0 ? <Text style={styles.statusText}>{errorMessage}</Text> : null}

            <FlatList
              data={notifications}
              keyExtractor={(item) => item._id}
              renderItem={renderNotification}
              contentContainerStyle={styles.listContent}
              ListEmptyComponent={<Text style={styles.emptyText}>No notifications yet.</Text>}
              ListFooterComponent={
                <View>
                  {status === "CanLoadMore" ? (
                    <GlassPressable
                      onPress={() => loadMore(16)}
                      surfaceStyle={styles.loadMoreButton}
                      pressedSurfaceStyle={styles.controlPressed}
                    >
                      <Text style={styles.loadMoreText}>Load More</Text>
                    </GlassPressable>
                  ) : null}
                </View>
              }
            />
          </View>
        </View>
      </Modal>
    </>
  );
}
