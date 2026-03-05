import {
  getFirestoreDb,
  isFirebaseConfigured,
} from '@/services/firebaseClient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Application from 'expo-application';
import * as Network from 'expo-network';
import * as Notifications from 'expo-notifications';
import {
  deleteDoc,
  doc,
  serverTimestamp,
  setDoc,
  Timestamp,
} from 'firebase/firestore';
import { Platform } from 'react-native';

const LOG_TAG = 'MyFinanceSync';
const INSTALLATION_ID_KEY = '@my_finance_installation_id';
const SYNC_QUEUE_KEY = '@my_finance_remote_sync_queue';
const INITIAL_SYNC_DONE_KEY = '@my_finance_initial_sync_done';

type ExpenseSyncPayload = {
  expenseId: string;
  dueDate: string;
  title: string;
  status: 'pending' | 'paid';
  updatedAt: string;
  expiresAt: string;
};

type QueueItem =
  | { type: 'upsert'; payload: ExpenseSyncPayload; attempt: number }
  | { type: 'delete'; expenseId: string; attempt: number };

let initialized = false;
let isFlushing = false;
let queueLock: Promise<void> = Promise.resolve();

function logInfo(message: string, context?: Record<string, unknown>) {
  if (context) {
    console.log(`[${LOG_TAG}] ${message}`, context);
    return;
  }
  console.log(`[${LOG_TAG}] ${message}`);
}

function logError(
  message: string,
  error: unknown,
  context?: Record<string, unknown>,
) {
  const errorMessage = error instanceof Error ? error.message : String(error);
  console.error(`[${LOG_TAG}] ${message}`, { error: errorMessage, ...context });
}

function buildFallbackInstallationId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `inst_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

/** Obtém um ID estável do dispositivo quando disponível (Android ID, iOS IDFV), senão gera e persiste um. */
async function getOrCreateDeviceId(): Promise<string> {
  if (Platform.OS === 'android') {
    try {
      return `android_${Application.getAndroidId()}`;
    } catch {
      return buildFallbackInstallationId();
    }
  }
  if (Platform.OS === 'ios') {
    try {
      const idfv = await Application.getIosIdForVendorAsync();
      if (idfv) return `ios_${idfv}`;
    } catch {
      // ignore
    }
  }
  return buildFallbackInstallationId();
}

async function getInstallationId(): Promise<string> {
  const saved = await AsyncStorage.getItem(INSTALLATION_ID_KEY);
  if (saved) return saved;
  const id = await getOrCreateDeviceId();
  await AsyncStorage.setItem(INSTALLATION_ID_KEY, id);
  return id;
}

async function withQueueLock(work: () => Promise<void>): Promise<void> {
  queueLock = queueLock.then(work).catch(() => {
    // lock chain keeps running even if a step fails.
  });
  return queueLock;
}

async function loadQueue(): Promise<QueueItem[]> {
  const raw = await AsyncStorage.getItem(SYNC_QUEUE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as QueueItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function saveQueue(items: QueueItem[]): Promise<void> {
  await AsyncStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(items));
}

function addDaysIso(days: number): string {
  const now = new Date();
  now.setDate(now.getDate() + days);
  return now.toISOString();
}

/** Cria o canal "default" no Android para as notificações push aparecerem (obrigatório Android 8+). */
async function ensureNotificationChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  try {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Lembretes',
      importance: Notifications.AndroidImportance.DEFAULT,
      sound: 'default',
      enableVibrate: true,
    });
  } catch (e) {
    logError('Falha ao criar canal de notificação', e);
  }
}

async function getFcmToken(): Promise<string | null> {
  await ensureNotificationChannel();
  const permissions = await Notifications.getPermissionsAsync();
  if (!permissions.granted) {
    const requested = await Notifications.requestPermissionsAsync();
    if (!requested.granted) {
      logInfo('Permissão de notificação negada');
      return null;
    }
  }

  const token = await Notifications.getDevicePushTokenAsync();
  if (!token?.data) return null;
  console.log('token FCM', token.data);
  return token.data;
}

async function isOnline(): Promise<boolean> {
  try {
    const state = await Network.getNetworkStateAsync();
    return Boolean(state.isConnected && state.isInternetReachable !== false);
  } catch {
    return false;
  }
}

async function registerDeviceIfPossible(): Promise<void> {
  if (!isFirebaseConfigured()) {
    logInfo('Firebase não configurado. Registro remoto ignorado.');
    return;
  }
  const db = getFirestoreDb();
  if (!db) return;

  try {
    const installationId = await getInstallationId();
    const token = await getFcmToken();
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone ?? 'UTC';
    await setDoc(
      doc(db, 'devices', installationId),
      {
        installationId,
        platform: 'android',
        timezone,
        notificationsEnabled: Boolean(token),
        fcmToken: token,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
  } catch (error) {
    logError('Falha ao registrar dispositivo no Firestore', error);
  }
}

export async function hasInitialSyncRun(): Promise<boolean> {
  const value = await AsyncStorage.getItem(INITIAL_SYNC_DONE_KEY);
  return value === '1';
}

export async function setInitialSyncDone(): Promise<void> {
  await AsyncStorage.setItem(INITIAL_SYNC_DONE_KEY, '1');
}

/**
 * Enfileira uma lista de despesas para sync (ex.: sincronização inicial) e dispara o flush.
 * Útil para enviar ao Firebase as despesas com vencimento em até 7 dias já existentes no app.
 */
export async function runInitialExpenseSync(
  payloads: Array<Omit<ExpenseSyncPayload, 'expiresAt'>>,
): Promise<void> {
  if (payloads.length === 0) return;
  await withQueueLock(async () => {
    const queue = await loadQueue();
    const expiresAt = addDaysIso(30);
    for (const payload of payloads) {
      queue.push({
        type: 'upsert',
        payload: { ...payload, expiresAt },
        attempt: 0,
      });
    }
    await saveQueue(queue);
  });
  await setInitialSyncDone();
  void flushSyncQueue('initial_sync');
}

export async function initializeRemoteNotificationSync(): Promise<void> {
  if (initialized) return;
  initialized = true;
  // Mostrar notificação mesmo com app em primeiro plano
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
  await registerDeviceIfPossible();
  void flushSyncQueue('startup');
}

export async function enqueueExpenseUpsert(
  payload: Omit<ExpenseSyncPayload, 'expiresAt'>,
): Promise<void> {
  await withQueueLock(async () => {
    const queue = await loadQueue();
    queue.push({
      type: 'upsert',
      payload: {
        ...payload,
        expiresAt: addDaysIso(30),
      },
      attempt: 0,
    });
    await saveQueue(queue);
  });
  void flushSyncQueue('enqueue_upsert');
}

export async function enqueueExpenseDelete(expenseId: string): Promise<void> {
  await withQueueLock(async () => {
    const queue = await loadQueue();
    queue.push({ type: 'delete', expenseId, attempt: 0 });
    await saveQueue(queue);
  });
  void flushSyncQueue('enqueue_delete');
}

async function writeUpsert(
  installationId: string,
  payload: ExpenseSyncPayload,
): Promise<void> {
  const db = getFirestoreDb();
  if (!db) throw new Error('Firestore indisponível');

  await setDoc(
    doc(db, 'devices', installationId, 'upcomingExpenses', payload.expenseId),
    {
      dueDate: Timestamp.fromDate(new Date(payload.dueDate)),
      title: payload.title,
      status: payload.status,
      updatedAt: payload.updatedAt,
      expiresAt: Timestamp.fromDate(new Date(payload.expiresAt)),
    },
    { merge: true },
  );
}

async function writeDelete(
  installationId: string,
  expenseId: string,
): Promise<void> {
  const db = getFirestoreDb();
  if (!db) throw new Error('Firestore indisponível');
  await deleteDoc(
    doc(db, 'devices', installationId, 'upcomingExpenses', expenseId),
  );
}

export async function flushSyncQueue(reason: string): Promise<boolean> {
  console.log('flushSyncQueue called with reason:', reason);
  if (isFlushing) return false;
  isFlushing = true;

  try {
    if (!isFirebaseConfigured()) return false;
    if (!(await isOnline())) {
      logInfo('Sem internet, mantendo fila pendente', { reason });
      return false;
    }

    const installationId = await getInstallationId();
    const queue = await loadQueue();
    if (queue.length === 0) return true;

    const pending: QueueItem[] = [];

    for (const item of queue) {
      try {
        console.log('processing item:', item);
        if (item.type === 'upsert') {
          await writeUpsert(installationId, item.payload);
        } else {
          await writeDelete(installationId, item.expenseId);
        }
      } catch (error) {
        const nextAttempt = item.attempt + 1;
        if (nextAttempt <= 5) {
          pending.push({ ...item, attempt: nextAttempt });
        }
        logError('Falha ao processar item de sync', error, {
          reason,
          type: item.type,
          attempt: nextAttempt,
          expenseId:
            item.type === 'upsert' ? item.payload.expenseId : item.expenseId,
        });
      }
    }

    await saveQueue(pending);
    if (pending.length > 0) {
      const delayMs = 2_000;
      setTimeout(() => {
        void flushSyncQueue('retry_backoff');
      }, delayMs);
    }
    return pending.length === 0;
  } finally {
    isFlushing = false;
  }
}

export async function triggerManualSyncTest(
  payloads: Array<Omit<ExpenseSyncPayload, 'expiresAt'>>,
): Promise<void> {
  for (const payload of payloads) {
    await enqueueExpenseUpsert(payload);
  }
  await flushSyncQueue('manual_test');
}
