export type DashboardWidgetCategory = 'essential' | 'optional' | 'premium';

export interface DashboardWidgetConfig {
  id: string;
  name: string;
  description: string;
  visible: boolean;
  order: number;
  category: DashboardWidgetCategory;
}

export const DASHBOARD_WIDGET_CONFIG_STORAGE_KEY = 'widget-customization';
export const DASHBOARD_WIDGET_CONFIG_CHANGED_EVENT = 'widget-config-changed';

export const DEFAULT_DASHBOARD_WIDGETS: DashboardWidgetConfig[] = [
  {
    id: 'prayer-times',
    name: 'Prayer Times',
    description: 'Daily prayer schedule and countdown',
    visible: true,
    order: 1,
    category: 'essential',
  },
  {
    id: 'daily-ayah',
    name: 'Daily Ayah',
    description: 'Quranic verse of the day',
    visible: true,
    order: 2,
    category: 'essential',
  },
  {
    id: 'daily-hadith',
    name: 'Daily Hadith',
    description: 'Prophetic tradition of the day',
    visible: true,
    order: 3,
    category: 'essential',
  },
  {
    id: 'qibla-quick',
    name: 'Qibla',
    description: 'Quick direction & distance to Kaaba',
    visible: false,
    order: 4,
    category: 'optional',
  },
  {
    id: 'tasbeeh-quick',
    name: 'Tasbeeh',
    description: 'Fast dhikr counter for today',
    visible: false,
    order: 5,
    category: 'optional',
  },
  {
    id: 'ramadan',
    name: 'Ramadan',
    description: 'Suhoor/Iftar and Ramadan mode',
    visible: false,
    order: 6,
    category: 'optional',
  },
  {
    id: 'salah-tracker',
    name: 'Salah Tracker',
    description: 'Track today’s 5 prayers',
    visible: true,
    order: 7,
    category: 'optional',
  },
  {
    id: 'weekly-chart',
    name: 'Weekly Progress',
    description: '7‑day salah completion chart',
    visible: true,
    order: 8,
    category: 'optional',
  },
  {
    id: 'quran-progress',
    name: 'Quran Progress',
    description: 'Track your Quran reading progress',
    visible: true,
    order: 9,
    category: 'optional',
  },
  {
    id: 'islamic-events',
    name: 'Islamic Events',
    description: 'Upcoming Islamic holidays and events',
    visible: false,
    order: 10,
    category: 'optional',
  },
  {
    id: 'prayer-stats',
    name: 'Prayer Statistics',
    description: 'Your local salah streak & stats',
    visible: false,
    order: 11,
    category: 'optional',
  },
  {
    id: 'qaza-tracker',
    name: 'Qaza Tracker',
    description: 'Track missed prayers',
    visible: true,
    order: 12,
    category: 'optional',
  },
  {
    id: 'dhikr-reminder',
    name: 'Dhikr Reminder',
    description: 'Gentle reminders & rotating adhkar',
    visible: false,
    order: 13,
    category: 'premium',
  },
  {
    id: 'quran-radio',
    name: 'Quran Radio',
    description: 'Live Quranic radio and station streaming',
    visible: false,
    order: 14,
    category: 'premium',
  },
  {
    id: 'remedy',
    name: 'Quick Remedy',
    description: 'Mood-based Islamic remedies from Quran and Sunnah',
    visible: true,
    order: 15,
    category: 'optional',
  },
];

const isWidgetConfigLike = (value: unknown): value is Partial<DashboardWidgetConfig> =>
  typeof value === 'object' && value !== null && 'id' in value;

const clampOrder = (value: unknown): number | null => {
  if (typeof value !== 'number') return null;
  if (!Number.isFinite(value)) return null;
  return Math.max(1, Math.floor(value));
};

export function normalizeDashboardWidgetConfig(
  widgets: DashboardWidgetConfig[],
  defaults: DashboardWidgetConfig[] = DEFAULT_DASHBOARD_WIDGETS,
): DashboardWidgetConfig[] {
  const savedById = new Map<string, Partial<DashboardWidgetConfig>>();
  for (const widget of widgets) {
    if (widget?.id) savedById.set(widget.id, widget);
  }

  const essentialDefaults = defaults.filter((w) => w.category === 'essential');
  const nonEssentialDefaults = defaults.filter((w) => w.category !== 'essential');

  const normalized: DashboardWidgetConfig[] = [];

  // 1) Essential widgets are pinned and always visible
  essentialDefaults.forEach((defaultWidget, index) => {
    normalized.push({
      ...defaultWidget,
      visible: true,
      order: index + 1,
    });
  });

  // 2) Non-essential widgets: keep saved visibility + order, but refresh meta from defaults
  const nonEssential = nonEssentialDefaults
    .map((defaultWidget) => {
      const saved = savedById.get(defaultWidget.id);
      const order = clampOrder(saved?.order) ?? defaultWidget.order;
      const visible = typeof saved?.visible === 'boolean' ? saved.visible : defaultWidget.visible;

      return {
        ...defaultWidget,
        visible,
        order,
      };
    })
    .sort((a, b) => (a.order - b.order) || (a.id.localeCompare(b.id)));

  nonEssential.forEach((widget, index) => {
    normalized.push({
      ...widget,
      order: essentialDefaults.length + index + 1,
    });
  });

  return normalized;
}

export function loadDashboardWidgetConfig(): DashboardWidgetConfig[] {
  try {
    const raw = localStorage.getItem(DASHBOARD_WIDGET_CONFIG_STORAGE_KEY);
    if (!raw) return normalizeDashboardWidgetConfig(DEFAULT_DASHBOARD_WIDGETS);

    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return normalizeDashboardWidgetConfig(DEFAULT_DASHBOARD_WIDGETS);

    const parsedWidgets: DashboardWidgetConfig[] = parsed
      .filter(isWidgetConfigLike)
      .map((w) => ({
        id: String(w.id),
        name: typeof w.name === 'string' ? w.name : '',
        description: typeof w.description === 'string' ? w.description : '',
        visible: Boolean(w.visible),
        order: clampOrder(w.order) ?? 999,
        category: (w.category as DashboardWidgetCategory) ?? 'optional',
      }));

    // Migration: Force hide qibla-quick and tasbeeh-quick widgets
    const migratedWidgets = parsedWidgets.map(w => 
      (w.id === 'qibla-quick' || w.id === 'tasbeeh-quick') ? { ...w, visible: false } : w
    );

    const merged = normalizeDashboardWidgetConfig(migratedWidgets);

    // If defaults changed (new widgets added), persist silently so the customizer can show them.
    const mergedString = JSON.stringify(merged);
    if (mergedString !== raw) {
      localStorage.setItem(DASHBOARD_WIDGET_CONFIG_STORAGE_KEY, mergedString);
    }

    return merged;
  } catch (error) {
    console.warn('[dashboard-widget-config] Failed to load config:', error);
    return normalizeDashboardWidgetConfig(DEFAULT_DASHBOARD_WIDGETS);
  }
}

export function persistDashboardWidgetConfig(widgets: DashboardWidgetConfig[]): DashboardWidgetConfig[] {
  const normalized = normalizeDashboardWidgetConfig(widgets);
  localStorage.setItem(DASHBOARD_WIDGET_CONFIG_STORAGE_KEY, JSON.stringify(normalized));

  window.dispatchEvent(
    new CustomEvent(DASHBOARD_WIDGET_CONFIG_CHANGED_EVENT, {
      detail: { widgets: normalized },
    }),
  );

  return normalized;
}

