import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Settings as SettingsIcon, RotateCcw, Eye, Plus, EyeOff, Check, X,
  Building, BookOpen, MessageCircle, Navigation, Compass, Star,
  TrendingUp, Calendar, Heart, CloudSun, Target, Flame, Mic,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  DEFAULT_DASHBOARD_WIDGETS,
  loadDashboardWidgetConfig,
  persistDashboardWidgetConfig,
  type DashboardWidgetConfig,
} from "@/lib/dashboard-widget-config";
import { SafeWidgetPreview } from "@/components/SafeWidgetPreview";

// ─────────────────────────────────────────────────────────────
// Widget icon map
// ─────────────────────────────────────────────────────────────
const getWidgetIcon = (id: string, className = "w-5 h-5") => {
  switch (id) {
    case "prayer-times":   return <Building className={className} />;
    case "daily-ayah":     return <BookOpen className={className} />;
    case "daily-hadith":   return <MessageCircle className={className} />;
    case "qibla-quick":    return <Navigation className={className} />;
    case "tasbeeh-quick":  return <Target className={className} />;
    case "ramadan":        return <Compass className={className} />;
    case "salah-tracker":  return <TrendingUp className={className} />;
    case "weekly-chart":   return <Star className={className} />;
    case "quran-progress": return <BookOpen className={className} />;
    case "islamic-events": return <Calendar className={className} />;
    case "weather":        return <CloudSun className={className} />;
    case "prayer-stats":   return <TrendingUp className={className} />;
    case "qaza-tracker":   return <Heart className={className} />;
    case "dhikr-reminder": return <Flame className={className} />;
    case "quran-radio":    return <Mic className={className} />;
    default:               return <SettingsIcon className={className} />;
  }
};

// ─────────────────────────────────────────────────────────────
// Category badge colours
// ─────────────────────────────────────────────────────────────
const getCategoryColor = (category: string) => {
  switch (category) {
    case "essential":
      return "bg-blue-100/80 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-800";
    case "premium":
      return "bg-purple-100/80 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 border-purple-200 dark:border-purple-800";
    default:
      return "bg-[var(--surface-2)] text-[var(--text-secondary)] border border-[var(--border)]";
  }
};

// ─────────────────────────────────────────────────────────────
// Preview Modal
// ─────────────────────────────────────────────────────────────
interface PreviewModalProps {
  widget: DashboardWidgetConfig | null;
  onClose: () => void;
  onToggle: (id: string) => void;
}

function PreviewModal({ widget, onClose, onToggle }: PreviewModalProps) {
  if (!widget) return null;
  const isEssential = widget.category === "essential";

  return (
    <Dialog open={!!widget} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-primary/10">
              {getWidgetIcon(widget.id, "w-5 h-5 text-primary")}
            </div>
            {widget.name}
            <Badge variant="outline" className={`text-xs ml-1 ${getCategoryColor(widget.category)}`}>
              {widget.category}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        {/* Description */}
        <p className="text-sm text-muted-foreground -mt-1">{widget.description}</p>

        {/* Live preview */}
        <div className="mt-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Live Preview
          </p>
          <SafeWidgetPreview widgetId={widget.id} isVisible={widget.visible} />
        </div>

        <DialogFooter className="flex gap-2 pt-2">
          <Button variant="outline" onClick={onClose} className="flex-1 gap-2">
            <X className="w-4 h-4" /> Close
          </Button>
          {!isEssential && (
            <Button
              onClick={() => { onToggle(widget.id); onClose(); }}
              variant={widget.visible ? "destructive" : "default"}
              className="flex-1 gap-2"
            >
              {widget.visible ? (
                <><EyeOff className="w-4 h-4" /> Remove</>
              ) : (
                <><Plus className="w-4 h-4" /> Add to Dashboard</>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────────
// Active Widget Card
// ─────────────────────────────────────────────────────────────
interface ActiveCardProps {
  widget: DashboardWidgetConfig;
  onToggle: (id: string) => void;
  onPreview: (w: DashboardWidgetConfig) => void;
}

function ActiveWidgetCard({ widget, onToggle, onPreview }: ActiveCardProps) {
  const isEssential = widget.category === "essential";

  return (
    <Card className="group overflow-hidden border border-border/60 bg-card/80 backdrop-blur shadow-sm hover:shadow-md hover:border-border transition-all duration-300 flex flex-col">
      <CardContent className="p-4 flex flex-col flex-1 gap-3">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <div className="p-2 rounded-xl bg-primary/8 shrink-0">
              {getWidgetIcon(widget.id, "w-4 h-4 text-primary")}
            </div>
            <div className="min-w-0">
              <h4 className="font-bold text-sm text-foreground truncate leading-tight">{widget.name}</h4>
              <span className={`inline-block text-xs font-bold px-1.5 py-0.5 rounded-full border mt-0.5 ${getCategoryColor(widget.category)}`}>
                {widget.category}
              </span>
            </div>
          </div>
          <div className="shrink-0 flex items-center gap-2">
            {isEssential ? (
              <Badge variant="secondary" className="text-xs bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400 border-none">
                Pinned
              </Badge>
            ) : (
              <Switch
                checked={widget.visible}
                onCheckedChange={() => onToggle(widget.id)}
                className="data-[state=checked]:bg-primary"
              />
            )}
          </div>
        </div>

        {/* Description */}
        <p className="text-xs text-muted-foreground line-clamp-1 leading-relaxed -mt-1">
          {widget.description}
        </p>

        {/* Live mini-preview */}
        <div className="mt-auto">
          <SafeWidgetPreview widgetId={widget.id} isVisible={true} />
        </div>

        {/* Preview button */}
        <Button
          variant="ghost"
          size="sm"
          className="w-full h-7 text-xs gap-1.5 text-muted-foreground hover:text-foreground rounded-lg mt-1"
          onClick={() => onPreview(widget)}
        >
          <Eye className="w-3.5 h-3.5" /> Full Preview
        </Button>
      </CardContent>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────
// Hidden Widget Card (with preview-before-add)
// ─────────────────────────────────────────────────────────────
interface HiddenCardProps {
  widget: DashboardWidgetConfig;
  onToggle: (id: string) => void;
  onPreview: (w: DashboardWidgetConfig) => void;
}

function HiddenWidgetCard({ widget, onToggle, onPreview }: HiddenCardProps) {
  return (
    <Card className="overflow-hidden border-dashed border-border/50 bg-muted/10 hover:bg-muted/20 transition-all duration-300 flex flex-col">
      <CardContent className="p-4 flex flex-col flex-1 gap-3">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <div className="p-2 rounded-xl bg-muted shrink-0">
              {getWidgetIcon(widget.id, "w-4 h-4 text-muted-foreground")}
            </div>
            <div className="min-w-0">
              <h4 className="font-bold text-sm text-foreground truncate leading-tight">{widget.name}</h4>
              <span className={`inline-block text-xs font-bold px-1.5 py-0.5 rounded-full border mt-0.5 ${getCategoryColor(widget.category)}`}>
                {widget.category}
              </span>
            </div>
          </div>
        </div>

        <p className="text-xs text-muted-foreground line-clamp-1 -mt-1">{widget.description}</p>

        {/* Dimmed preview */}
        <div className="opacity-70 grayscale-[0.2] mt-auto">
          <SafeWidgetPreview widgetId={widget.id} isVisible={false} onEnable={() => onToggle(widget.id)} />
        </div>

        {/* CTA row */}
        <div className="flex gap-2 mt-1">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 h-8 text-xs gap-1.5 rounded-lg"
            onClick={() => onPreview(widget)}
          >
            <Eye className="w-3.5 h-3.5" /> Preview
          </Button>
          <Button
            size="sm"
            className="flex-1 h-8 text-xs gap-1.5 rounded-lg"
            onClick={() => onToggle(widget.id)}
          >
            <Plus className="w-3.5 h-3.5" /> Add
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────
// Main Customizer
// ─────────────────────────────────────────────────────────────
export function WidgetCustomizer() {
  const [widgets, setWidgets] = useState<DashboardWidgetConfig[]>(DEFAULT_DASHBOARD_WIDGETS);
  const [previewWidget, setPreviewWidget] = useState<DashboardWidgetConfig | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    setWidgets(loadDashboardWidgetConfig());
  }, []);

  const saveConfig = useCallback((newWidgets: DashboardWidgetConfig[]) => {
    const persisted = persistDashboardWidgetConfig(newWidgets);
    setWidgets(persisted);
    toast({ title: "Dashboard updated", description: "Your widget layout has been saved." });
  }, [toast]);

  const toggleWidgetVisibility = useCallback((widgetId: string) => {
    setWidgets(prev => {
      const updated = prev.map(w =>
        w.id === widgetId && w.category !== "essential"
          ? { ...w, visible: !w.visible }
          : w
      );
      persistDashboardWidgetConfig(updated);
      return updated;
    });
    toast({
      title: "Dashboard updated",
      description: "Your widget layout has been saved.",
    });
  }, [toast]);

  const resetToDefault = useCallback(() => {
    saveConfig(DEFAULT_DASHBOARD_WIDGETS);
  }, [saveConfig]);

  const visibleWidgets = widgets.filter(w => w.visible).sort((a, b) => a.order - b.order);
  const hiddenWidgets  = widgets.filter(w => !w.visible);

  return (
    <div className="w-full max-w-5xl mx-auto space-y-8 pb-24">
      {/* Page header */}
      <Card className="border-none shadow-none bg-transparent">
        <CardHeader className="px-0 pt-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-2xl flex items-center gap-2">
                <SettingsIcon className="w-6 h-6 text-primary" />
                Customize Dashboard
              </CardTitle>
              <CardDescription className="text-base mt-1">
                Toggle widgets on/off and tap <Eye className="w-3.5 h-3.5 inline-block mx-0.5" /> Preview to see them before adding.
              </CardDescription>
            </div>
            <Button
              variant="outline"
              onClick={resetToDefault}
              className="gap-2 w-full sm:w-auto rounded-xl border border-[var(--border)]"
            >
              <RotateCcw className="w-4 h-4" /> Reset to Default
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* ── Active widgets ──────────────────────────── */}
      <section className="space-y-4">
        <div className="flex items-center gap-3 px-1">
          <Check className="w-4 h-4 text-emerald-500" />
          <h3 className="font-bold text-lg text-foreground tracking-tight">Active Widgets</h3>
          <Badge variant="secondary" className="rounded-full px-2 py-0.5">{visibleWidgets.length}</Badge>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {visibleWidgets.map(w => (
            <ActiveWidgetCard
              key={w.id}
              widget={w}
              onToggle={toggleWidgetVisibility}
              onPreview={setPreviewWidget}
            />
          ))}
        </div>
      </section>

      {/* ── Hidden / available widgets ──────────────── */}
      {hiddenWidgets.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center gap-3 px-1">
            <EyeOff className="w-4 h-4 text-muted-foreground" />
            <h3 className="font-bold text-lg text-muted-foreground tracking-tight">Available Widgets</h3>
            <Badge variant="secondary" className="rounded-full bg-muted/60 text-muted-foreground px-2 py-0.5">
              {hiddenWidgets.length}
            </Badge>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {hiddenWidgets.map(w => (
              <HiddenWidgetCard
                key={w.id}
                widget={w}
                onToggle={toggleWidgetVisibility}
                onPreview={setPreviewWidget}
              />
            ))}
          </div>
        </section>
      )}

      {/* ── Preview modal ────────────────────────────── */}
      <PreviewModal
        widget={previewWidget}
        onClose={() => setPreviewWidget(null)}
        onToggle={toggleWidgetVisibility}
      />
    </div>
  );
}

export default WidgetCustomizer;
