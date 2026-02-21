import AsyncStorage from "@react-native-async-storage/async-storage";
import * as BackgroundTask from "expo-background-task";
import * as Notifications from "expo-notifications";
import * as TaskManager from "expo-task-manager";
import { formatDateStr } from "@/utils/dateUtils";
import { pt } from "@/locales/pt";
import { getDueNotificationsSnapshot } from "@/services/transactionService";

const TASK_NAME = "daily-due-notification-task";
const ANDROID_CHANNEL_ID = "daily-due-alerts";
const LAST_SENT_DATE_KEY = "@my_finance_last_due_notification_date";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

function getNotificationBody(snapshot: ReturnType<typeof getDueNotificationsSnapshot>): string | null {
  if (snapshot.hasOverdue) return pt.notifyOverdueBody;
  if (snapshot.hasDueToday) return pt.notifyDueTodayBody;
  if (snapshot.dueSoonInDays != null) {
    return pt.notifyDueSoonBody.replace("{days}", String(snapshot.dueSoonInDays));
  }
  return null;
}

if (!TaskManager.isTaskDefined(TASK_NAME)) {
  TaskManager.defineTask(TASK_NAME, async () => {
    try {
      const snapshot = getDueNotificationsSnapshot();
      const body = getNotificationBody(snapshot);
      if (!body) {
        return BackgroundTask.BackgroundTaskResult.Success;
      }

      const todayStr = formatDateStr(new Date());
      const lastSentDate = await AsyncStorage.getItem(LAST_SENT_DATE_KEY);
      if (lastSentDate === todayStr) {
        return BackgroundTask.BackgroundTaskResult.Success;
      }

      await Notifications.scheduleNotificationAsync({
        content: {
          title: pt.notifyDueTitle,
          body,
          sound: "default",
        },
        trigger: null,
      });
      await AsyncStorage.setItem(LAST_SENT_DATE_KEY, todayStr);

      return BackgroundTask.BackgroundTaskResult.Success;
    } catch {
      return BackgroundTask.BackgroundTaskResult.Failed;
    }
  });
}

export async function initializeDailyDueNotifications(): Promise<void> {
  const permissions = await Notifications.getPermissionsAsync();
  if (!permissions.granted) {
    const requested = await Notifications.requestPermissionsAsync();
    if (!requested.granted) return;
  }

  await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
    name: pt.notifyDueChannelName,
    importance: Notifications.AndroidImportance.HIGH,
    sound: "default",
  });

  const isRegistered = await TaskManager.isTaskRegisteredAsync(TASK_NAME);
  if (!isRegistered) {
    await BackgroundTask.registerTaskAsync(TASK_NAME, {
      minimumInterval: 60 * 60 * 24,
    });
  }
}

export async function triggerDailyDueNotificationNow(): Promise<"sent" | "no_due" | "permission_denied"> {
  const permissions = await Notifications.getPermissionsAsync();
  if (!permissions.granted) {
    const requested = await Notifications.requestPermissionsAsync();
    if (!requested.granted) return "permission_denied";
  }

  const snapshot = getDueNotificationsSnapshot();
  const body = getNotificationBody(snapshot);
  if (!body) return "no_due";

  await Notifications.scheduleNotificationAsync({
    content: {
      title: pt.notifyDueTitle,
      body,
      sound: "default",
    },
    trigger: null,
  });
  return "sent";
}

