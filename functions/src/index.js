const { onSchedule } = require('firebase-functions/v2/scheduler');
const logger = require('firebase-functions/logger');
const admin = require('firebase-admin');
const { addDays, endOfDay, format, startOfDay } = require('date-fns');

admin.initializeApp();

const db = admin.firestore();

const DATE_FORMAT = 'yyyy-MM-dd';

// TODO verificar a real necessidade dessa funcao, não parece ser necessária - excluir
/** dueDate no Firestore pode ser Timestamp ou string (legado). Retorna YYYY-MM-DD. */
function getDueDateStr(item) {
  const d = item.dueDate;
  if (d && typeof d.toDate === 'function')
    return format(d.toDate(), DATE_FORMAT);
  return typeof d === 'string' ? d : format(new Date(), DATE_FORMAT);
}

// TODO refatorar as operações com data utilizando date-fns
function buildNotificationBody(expenses) {
  const todayStr = format(new Date(), DATE_FORMAT);
  const overdue = expenses.filter(
    (item) => getDueDateStr(item) < todayStr,
  ).length;
  if (overdue > 0) {
    return 'Ei! Você tem contas vencidas, regularize o quanto antes.';
  }

  const dueToday = expenses.find((item) => getDueDateStr(item) === todayStr);
  if (dueToday) {
    return 'Ei! Você tem contas vencendo hoje.';
  }

  if (expenses.length > 0) {
    return 'Você tem contas a pagar vencendo nos próximos dias.';
  }
  return null;
}

exports.sendDailyUpcomingExpensesNotification = onSchedule(
  {
    schedule: 'every day 08:00',
    timeZone: 'America/Sao_Paulo',
    region: 'southamerica-east1',
  },
  async () => {
    try {
      const now = new Date();
      const todayStart = startOfDay(now);
      const maxEnd = endOfDay(addDays(now, 7));
      const todayTs = admin.firestore.Timestamp.fromDate(todayStart);
      const maxTs = admin.firestore.Timestamp.fromDate(maxEnd);
      const todayStr = format(todayStart, DATE_FORMAT);

      logger.info('Enviando notificações para hoje.', {
        todayStr,
        maxStr: format(maxEnd, DATE_FORMAT),
      });

      const devicesSnap = await db
        .collection('devices')
        .where('notificationsEnabled', '==', true)
        .get();

      if (devicesSnap.empty) {
        logger.info('Nenhum dispositivo elegível para notificação.');
        return;
      }

      let sentCount = 0;

      for (const deviceDoc of devicesSnap.docs) {
        logger.info('processando dispositivo.', {
          id: deviceDoc.id,
        });

        const device = deviceDoc.data();
        const installationId = deviceDoc.id;
        const token = device.fcmToken;
        const lastNotificationDate = device.lastNotificationDate ?? null;

        if (!token) continue;
        // TODO corrigir essa condição utilizar date-fns isSameDay
        // if (lastNotificationDate === todayStr) continue;

        const expensesSnap = await db
          .collection('devices')
          .doc(installationId)
          .collection('upcomingExpenses')
          .where('status', '==', 'pending')
          .where('dueDate', '>=', todayTs)
          .where('dueDate', '<=', maxTs)
          .where('expiresAt', '>', admin.firestore.Timestamp.now())
          .orderBy('dueDate', 'asc')
          .limit(10)
          .get();

        if (expensesSnap.empty) {
          logger.info(
            'não há contas a pagar vencendo nos próximos dias para o dispositivo.',
          );
          continue;
        }

        const expenses = expensesSnap.docs.map((item) => item.data());
        const body = buildNotificationBody(expenses);

        if (!body) {
          logger.info(
            'body is null, não será enviada notificação para o dispositivo.',
          );
          continue;
        }

        logger.info('Enviando notificação para dispositivo.', {
          id: deviceDoc.id,
          body,
        });

        try {
          await admin.messaging().send({
            token,
            notification: {
              title: 'Lembrete de contas',
              body,
            },
            data: {
              installationId,
              source: 'daily_scheduler',
            },
            android: {
              priority: 'high',
              notification: {
                channelId: 'default',
              },
            },
          });

          await deviceDoc.ref.set(
            {
              lastNotificationDate: admin.firestore.Timestamp.now(),
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            },
            { merge: true },
          );
          sentCount += 1;
        } catch (error) {
          const message =
            error instanceof Error ? error.message : String(error);
          logger.error('Falha ao enviar push', { installationId, message });

          // Token inválido não deve interromper os demais envios.
          if (
            message.includes('registration-token-not-registered') ||
            message.includes('invalid-registration-token')
          ) {
            await deviceDoc.ref.set(
              {
                notificationsEnabled: false,
                fcmToken: null,
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
              },
              { merge: true },
            );
          }
        }
      }

      logger.info('Execução diária concluída.', { sentCount });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const stack = error instanceof Error ? error.stack : undefined;
      logger.error('Falha na execução do job de notificações diárias.', {
        message,
        stack,
      });
      throw error;
    }
  },
);
