// src/utils/notifier.ts
type NotifyFn = (message: string) => Promise<void>;
let _notifyFn: NotifyFn | null = null;

export function registerNotifier(fn: NotifyFn) {
  _notifyFn = fn;
}

export async function sendNotification(msg: string) {
  if (_notifyFn) {
    await _notifyFn(msg);
  } else {
    console.log('[Notification (Buffered)]:', msg);
  }
}
