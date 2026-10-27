import { AppBar } from "@/components/AppBar";
import QiblaCompassModern from "@/components/QiblaCompassModern";
import { PageTransition } from "@/components/PageTransition";
import { useLanguage } from "@/contexts/LanguageContext-new";
import { ErrorBoundary } from "@/components/ErrorBoundary";

const Qibla = () => {
  const { t, ui } = useLanguage();

  return (
    <PageTransition>
      <div className="min-h-screen bg-[var(--bg-base)] pb-20">
        <AppBar title={ui.qibla || t("qibla") || "Qibla"} />
        <div className="flex flex-col min-h-[calc(100vh-64px)]">
          <div className="flex-grow">
            <ErrorBoundary
              fallback={
                <div className="flex flex-col items-center justify-center p-6 text-center my-8">
                  <div className="w-full max-w-sm rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm space-y-3">
                    <div className="w-12 h-12 rounded-full bg-[var(--accent-soft)] text-[var(--accent-text)] flex items-center justify-center mx-auto text-xl">
                      🧭
                    </div>
                    <h3 className="text-base font-bold text-[var(--text-primary)]">Qibla Temporarily Unavailable</h3>
                    <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                      The compass sensor or location service encountered an issue. You can still determine Qibla using prayer times or tap below to reload.
                    </p>
                    <button
                      onClick={() => window.location.reload()}
                      className="mt-2 px-4 py-2 rounded-xl bg-[var(--accent)] text-[var(--on-accent)] text-xs font-bold shadow-md shadow-[var(--accent-glow)] active:scale-95 transition-all"
                    >
                      Retry Compass
                    </button>
                  </div>
                </div>
              }
            >
              <QiblaCompassModern />
            </ErrorBoundary>
          </div>
          <p className="text-center text-xs text-[var(--text-secondary)]/75 px-6 pb-8 italic leading-relaxed">
            {ui.qiblaCalibrationTip || t("qiblaCalibrationTip")}
          </p>
        </div>
      </div>
    </PageTransition>
  );
};

export default Qibla;
