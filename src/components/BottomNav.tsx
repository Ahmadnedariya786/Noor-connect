import { useState, useCallback, useEffect } from "react";
import { NavLink } from "react-router-dom";
import { Home, BookOpen, Settings, Compass, LayoutGrid } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext-new";
import { memo } from "react";
import { motion, AnimatePresence } from "framer-motion";

// Premium Bottom Navigation with enhanced glassmorphism and micro-interactions
const BottomNav = memo(function BottomNav() {
  const { t } = useLanguage();

  const navItems = [
    { title: t('home'), path: "/", icon: Home, gradient: 'from-emerald-500 to-emerald-600' },
    { title: t('quran'), path: "/quran", icon: BookOpen, gradient: 'from-emerald-500 to-emerald-600' },
    { title: t('qibla'), path: "/qibla", icon: Compass, gradient: 'from-emerald-500 to-emerald-600' },
    { title: t('services'), path: "/services", icon: LayoutGrid, gradient: 'from-emerald-500 to-emerald-600' },
    { title: t('settings'), path: "/profile", icon: Settings, gradient: 'from-emerald-500 to-emerald-600' },
  ];

  return (
    <nav
      className="w-full fixed bottom-0 left-0 right-0 z-[100] pointer-events-none flex justify-center"
      style={{
        willChange: 'transform, opacity',
        transform: 'translateZ(0)',
        paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)',
        paddingLeft: '12px',
        paddingRight: '12px'
      }}
    >
      {/* Premium Floating Island with enhanced glassmorphism */}
      <div className="w-full max-w-md bg-white/80 dark:bg-black/80 backdrop-blur-3xl border border-border/50 shadow-2xl pointer-events-auto rounded-[32px] relative mx-4">
        {/* Subtle animated gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5 opacity-60 rounded-[32px] overflow-hidden" />
        
        <div className="relative z-10 flex flex-row items-center justify-between h-[72px] px-1">
          {navItems.map((item, index) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === "/"}
              className="group flex-1 flex flex-col items-center justify-center h-full relative min-w-0"
            >
              {({ isActive }) => (
                <motion.div 
                   className="flex flex-col items-center justify-center gap-1.5 relative z-10 w-full"
                   whileTap={{ scale: 0.9 }}
                >
                  {/* Premium Active Indicator */}
                  <div className="relative flex items-center justify-center w-full min-w-[48px] h-[36px]">
                    <AnimatePresence>
                      {isActive && (
                        <motion.div
                          layoutId="nav-bg-glow"
                          className={`absolute inset-0 bg-gradient-to-br ${item.gradient} opacity-20 rounded-xl`}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          transition={{ type: "spring", stiffness: 500, damping: 35 }}
                        />
                      )}
                    </AnimatePresence>

                    <motion.div
                      className={`p-1.5 rounded-xl transition-all duration-500 ${isActive
                        ? `bg-gradient-to-br ${item.gradient} shadow-md`
                        : "bg-transparent group-hover:bg-muted/10"
                        }`}
                    >
                      <item.icon
                        className={`w-[22px] h-[22px] transition-all duration-500 ${isActive
                          ? "text-white scale-110"
                          : "text-muted-foreground group-hover:text-foreground"
                          }`}
                        strokeWidth={isActive ? 2.5 : 2}
                      />
                    </motion.div>
                  </div>

                  <motion.span 
                    className={`text-[9px] font-bold uppercase tracking-tight transition-all duration-300 truncate w-full px-1 text-center ${isActive
                      ? "text-foreground"
                      : "text-muted-foreground/50 group-hover:text-foreground"
                      }`}
                  >
                    {item.title}
                  </motion.span>
                </motion.div>
              )}
            </NavLink>
          ))}
        </div>

        {/* Premium home indicator with glow */}
        <div className="relative z-10 flex justify-center pb-2">
          <div className="h-[4px] w-12 bg-muted/20 rounded-full overflow-hidden">
             <motion.div 
                className="h-full w-full bg-gradient-to-r from-primary/20 via-primary to-primary/20"
                animate={{
                  x: [-40, 40],
                  opacity: [0.3, 0.7, 0.3]
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "linear"
                }}
             />
          </div>
        </div>
      </div>
    </nav>
  );
});

export default BottomNav;