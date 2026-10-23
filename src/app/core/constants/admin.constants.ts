export const ADMIN_API_KEY_STORAGE_KEY = 'stemgraph_admin_api_key';

// Grenzen für das Scheduler-Intervall (kommen so aus der OpenAPI-Spec)
export const SCHEDULE_MIN_MINUTES = 60;
export const SCHEDULE_MAX_MINUTES = 10080;

// So oft (ms) wird der Update-Status abgefragt, solange ein Update läuft
export const UPDATE_STATUS_POLL_INTERVAL = 3000;

// Schnellauswahl für das Intervall im Scheduler
export const SCHEDULE_PRESETS = [
  { label: '1 h', minutes: 60 },
  { label: '6 h', minutes: 360 },
  { label: '12 h', minutes: 720 },
  { label: '1 day', minutes: 1440 },
  { label: '1 week', minutes: 10080 },
];

// Tabs der Admin-Seite
export type AdminTab = 'scheduler' | 'update' | 'status';
