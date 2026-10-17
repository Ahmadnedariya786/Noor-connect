import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useIslamicCalendar } from "@/hooks/useIslamicCalendar";
import { Calculator, Sparkles, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function FitranaCalculatorNotification() {
  const { toast } = useToast();
  const { islamicInfo, isLoading } = useIslamicCalendar();
  const [dismissed, setDismissed] = useState(false);

  // Check if Fitrana Calculator should be shown (only 1 week before Eid al-Fitr)
  const shouldShow = (() => {
    if (isLoading || !islamicInfo || dismissed) return false;
    
    const hijriMonth = islamicInfo.hijriMonth;
    const hijriDay = islamicInfo.hijriDay;
    
    // Only show 1 week before Eid al-Fitr (23-30 Ramadan)
    if (hijriMonth === 9 && hijriDay >= 23) return true;
    
    return false;
  })();

  // Show notification when Eid al-Fitr is 1 week away
  useEffect(() => {
    if (shouldShow) {
      // Show toast notification
      toast({
        title: "🧮 Fitrana Calculator Available!",
        description: "Calculate your Zakat al-Fitr with our easy-to-use calculator.",
        duration: 8000,
      });
    }
  }, [shouldShow, toast]);

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem('fitrana-calculator-notification-dismissed', 'true');
  };

  const handleNavigate = () => {
    window.location.href = '/services';
  };

  if (!shouldShow || dismissed) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -50 }}
        transition={{ duration: 0.3 }}
        className="fixed top-20 left-4 right-4 z-50 max-w-sm mx-auto"
      >
        <Card className="bg-gradient-to-r from-green-500 to-emerald-500 border-0 shadow-lg">
          <CardContent className="p-4 text-white">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 flex-1">
                <div className="p-2 bg-white/20 rounded-full">
                  <Calculator className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-1 mb-1">
                    <Sparkles className="w-4 h-4" />
                    <h3 className="font-semibold text-sm">Fitrana Calculator</h3>
                  </div>
                  <p className="text-xs text-white/90 leading-relaxed">
                    Calculate your Zakat al-Fitr accurately with our enhanced calculator.
                  </p>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="mt-2 bg-emerald-950/20 hover:bg-emerald-950/30 text-white border border-emerald-200/40"
                    onClick={handleNavigate}
                  >
                    Calculate Now
                  </Button>
                </div>
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="text-white/80 hover:text-white hover:bg-white/10 p-1"
                onClick={handleDismiss}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
}
