/**
 * Smart Reminder System for meals and water.
 *
 * - When reminders_enabled, fires at meal times (breakfast, lunch, dinner).
 * - When water_reminders_enabled, fires every N hours (water_reminder_interval_hours) starting at water_reminder_start_time.
 * - Checks every minute; each reminder fires once per day. Shows in-app banner if notifications blocked.
 */

import { useEffect, useState, useMemo } from 'react';
import { getUserSettings } from '../api/dietApi';

const SLOTS = [
  { key: 'breakfast', label: 'Breakfast', field: 'breakfast_time', defaultTime: '08:00' },
  { key: 'lunch', label: 'Lunch', field: 'lunch_time', defaultTime: '13:00' },
  { key: 'dinner', label: 'Dinner', field: 'dinner_time', defaultTime: '20:00' },
];

function getTodayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function timeReached(timeStr, now) {
  if (!timeStr || typeof timeStr !== 'string') return false;
  const [hh, mm] = timeStr.split(':').map((v) => parseInt(v, 10));
  if (Number.isNaN(hh) || Number.isNaN(mm)) return false;
  if (now.getHours() > hh) return true;
  if (now.getHours() < hh) return false;
  return now.getMinutes() >= mm;
}

/** Build list of "HH:MM" for the day from start time and interval in hours (e.g. 08:00 every 2h => 08:00, 10:00, ..., 22:00). */
function getWaterTimesForDay(startTime, intervalHours) {
  const [hh, mm] = (startTime || '08:00').split(':').map((v) => parseInt(v, 10));
  const startMins = (Number.isNaN(hh) ? 8 : hh) * 60 + (Number.isNaN(mm) ? 0 : mm);
  const intervalMins = Math.max(60, Math.min(360, (intervalHours || 2) * 60));
  const times = [];
  for (let m = startMins; m < 24 * 60; m += intervalMins) {
    const h = Math.floor(m / 60);
    const min = m % 60;
    times.push(`${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`);
  }
  return times;
}

export default function ReminderManager() {
  const [settings, setSettings] = useState(null);
  const [banner, setBanner] = useState('');
  const [firedForDay, setFiredForDay] = useState({});

  const remindersOn = settings?.reminders_enabled ?? false;
  const waterRemindersOn = settings?.water_reminders_enabled ?? false;
  const waterIntervalHours = Math.max(1, Math.min(6, Number(settings?.water_reminder_interval_hours) || 2));
  const waterStartTime = settings?.water_reminder_start_time || '08:00';
  const waterTimes = useMemo(
    () => (waterRemindersOn ? getWaterTimesForDay(waterStartTime, waterIntervalHours) : []),
    [waterRemindersOn, waterStartTime, waterIntervalHours]
  );

  useEffect(() => {
    let cancelled = false;
    getUserSettings()
      .then((res) => {
        if (!cancelled && res?.success) setSettings(res.data);
      })
      .catch(() => {
        if (!cancelled) setSettings({});
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!remindersOn && !waterRemindersOn) return undefined;

    if (typeof window === 'undefined' || typeof Notification === 'undefined') {
      setBanner('Reminders are enabled. Keep this tab open to receive them.');
      return undefined;
    }

    if (Notification.permission === 'default') {
      Notification.requestPermission().then((perm) => {
        if (perm === 'denied') {
          setBanner('Notifications are blocked. We will show in-app reminders instead.');
        }
      }).catch(() => {});
    } else if (Notification.permission === 'denied') {
      setBanner('Notifications are blocked. We will show in-app reminders instead.');
    }

    const interval = setInterval(() => {
      const now = new Date();
      const todayKey = getTodayKey();

      if (remindersOn) {
        SLOTS.forEach((slot) => {
          const time = settings[slot.field] || slot.defaultTime;
          const fireKey = `${todayKey}-${slot.key}`;
          if (firedForDay[fireKey]) return;
          if (!timeReached(time, now)) return;

          if (Notification.permission === 'granted') {
            try {
              new Notification(`Time for ${slot.label}`, {
                body: 'Open Diet AI to view your plan for this meal.',
                tag: `diet-ai-${slot.key}`,
              });
            } catch {
              setBanner(`Time for ${slot.label}. Open Diet AI to view your plan.`);
            }
          } else {
            setBanner(`Time for ${slot.label}. Open Diet AI to view your plan.`);
          }
          setFiredForDay((prev) => ({ ...prev, [fireKey]: true }));
        });
      }

      if (waterRemindersOn && waterTimes.length > 0) {
        waterTimes.forEach((timeStr) => {
          const fireKey = `${todayKey}-water-${timeStr}`;
          if (firedForDay[fireKey]) return;
          if (!timeReached(timeStr, now)) return;

          if (Notification.permission === 'granted') {
            try {
              new Notification('Time to drink water', {
                body: 'Stay hydrated! Log your water in the Water tracker.',
                tag: `diet-ai-water-${timeStr}`,
              });
            } catch {
              setBanner('Time to drink water. Stay hydrated!');
            }
          } else {
            setBanner('Time to drink water. Stay hydrated!');
          }
          setFiredForDay((prev) => ({ ...prev, [fireKey]: true }));
        });
      }
    }, 60 * 1000);

    return () => clearInterval(interval);
  }, [settings, firedForDay, remindersOn, waterRemindersOn, waterTimes]);

  if ((!remindersOn && !waterRemindersOn) || !banner) return null;

  return (
    <div className="alert alert-info theme-card border-theme small mb-2 no-print" role="status">
      {banner}
    </div>
  );
}

