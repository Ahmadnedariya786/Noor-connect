import { AppBar } from "@/components/AppBar";
import { PageTransition } from "@/components/PageTransition";
import { QuranAudioPlayer } from "@/components/QuranAudio/QuranAudioPlayer";
import { QuranAudioErrorBoundary } from "@/components/QuranAudio/QuranAudioErrorBoundary";
import { Card, CardContent } from "@/components/ui/card";
import { Headphones, Download, PlayCircle, Settings as SettingsIcon, Sparkles, Volume2, Radio, Mic, Heart, Star } from "lucide-react";
import { motion } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext-new";

export default function QuranAudio() {
    const { t } = useLanguage();
    return (
        <PageTransition>
            <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 dark:from-emerald-950/20 dark:via-teal-950/20 dark:to-cyan-950/20 pb-32">
                <AppBar title={t("quranAudio") || "Quran Audio"} showBack={true} />
                
                <div className="px-5 pt-4 space-y-6">
                    {/* Premium Hero Section */}
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                        className="relative overflow-hidden rounded-[32px] shadow-[var(--elevation-6)]"
                    >
                        {/* Animated Gradient Background */}
                        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-600" />
                        <div className="absolute inset-0 bg-gradient-to-tr from-white/10 via-transparent to-transparent opacity-60 animate-pulse" />
                        
                        {/* Islamic Pattern Overlay */}
                        <div className="absolute inset-0 opacity-[0.05] bg-gradient-to-br from-emerald-100 via-transparent to-blue-100" />
                        
                        {/* Glow Orbs */}
                        <div className="absolute top-[-80px] right-[-80px] w-64 h-64 bg-emerald-300/30 rounded-full blur-3xl" />
                        <div className="absolute bottom-[-60px] left-[-60px] w-48 h-48 bg-cyan-300/30 rounded-full blur-3xl" />
                        
                        {/* Glassmorphism Overlay */}
                        <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent" />
                        
                        {/* Content */}
                        <div className="relative z-10 p-8 text-white">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-3 bg-white/20 backdrop-blur-md rounded-2xl border border-white/20">
                                    <Radio className="w-8 h-8 text-white" />
                                </div>
                                <div className="flex items-center gap-2">
                                    <Sparkles className="w-5 h-5 text-emerald-200" />
                                    <span className="text-sm font-semibold tracking-[0.1em] uppercase text-emerald-100">Premium Audio</span>
                                </div>
                            </div>
                            
                            <h1 className="text-4xl font-bold mb-3 tracking-tight">
                                Divine Recitations
                            </h1>
                            <p className="text-lg text-emerald-50 mb-6 leading-relaxed">
                                Experience the Holy Quran with crystal-clear audio from world-renowned reciters. 
                                Immerse yourself in the beauty of divine revelation.
                            </p>
                            
                            {/* Premium Stats */}
                            <div className="flex items-center gap-6">
                                <div className="flex items-center gap-2">
                                    <Mic className="w-4 h-4 text-emerald-200" />
                                    <span className="text-sm text-emerald-100">11 Expert Reciters</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Star className="w-4 h-4 text-emerald-200" />
                                    <span className="text-sm text-emerald-100">114 Complete Surahs</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Heart className="w-4 h-4 text-emerald-200" />
                                    <span className="text-sm text-emerald-100">HD Quality Audio</span>
                                </div>
                            </div>
                        </div>
                        
                        {/* Corner Accents */}
                        <div className="absolute top-6 left-6 w-12 h-12 border-l-3 border-t-3 border-white/20 rounded-tl-2xl" />
                        <div className="absolute top-6 right-6 w-12 h-12 border-r-3 border-t-3 border-white/20 rounded-tr-2xl" />
                        <div className="absolute bottom-6 left-6 w-12 h-12 border-l-3 border-b-3 border-white/20 rounded-bl-2xl" />
                        <div className="absolute bottom-6 right-6 w-12 h-12 border-r-3 border-b-3 border-white/20 rounded-br-2xl" />
                    </motion.div>
                    
                    {/* Quran Audio Player with Error Boundary */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.1 }}
                    >
                        <QuranAudioErrorBoundary>
                            <QuranAudioPlayer />
                        </QuranAudioErrorBoundary>
                    </motion.div>
                    
                    {/* Premium Features Grid */}
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.2 }}
                        className="grid grid-cols-1 md:grid-cols-2 gap-4"
                    >
                        <motion.div
                            whileHover={{ scale: 1.02, y: -2 }}
                            whileTap={{ scale: 0.98 }}
                            className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500/10 to-teal-500/10 backdrop-blur-sm border border-emerald-500/20 shadow-lg transition-all duration-300"
                        >
                            <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                            <CardContent className="relative z-10 p-6">
                                <div className="flex items-start gap-4">
                                    <div className="p-3 bg-emerald-500/20 rounded-2xl backdrop-blur-sm border border-emerald-500/30">
                                        <Headphones className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-bold text-emerald-900 dark:text-emerald-100 mb-2">Master Reciters</h3>
                                        <p className="text-sm text-emerald-700 dark:text-emerald-300 leading-relaxed">
                                            World-renowned voices including Mishary Alafasy, Abdul Basit, and Saad Al-Ghamdi
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </motion.div>
                        
                        <motion.div
                            whileHover={{ scale: 1.02, y: -2 }}
                            whileTap={{ scale: 0.98 }}
                            className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500/10 to-indigo-500/10 backdrop-blur-sm border border-blue-500/20 shadow-lg transition-all duration-300"
                        >
                            <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                            <CardContent className="relative z-10 p-6">
                                <div className="flex items-start gap-4">
                                    <div className="p-3 bg-blue-500/20 rounded-2xl backdrop-blur-sm border border-blue-500/30">
                                        <PlayCircle className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-bold text-blue-900 dark:text-blue-100 mb-2">Complete Collection</h3>
                                        <p className="text-sm text-blue-700 dark:text-blue-300 leading-relaxed">
                                            All 114 Surahs with seamless streaming and intelligent playback controls
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </motion.div>
                        
                        <motion.div
                            whileHover={{ scale: 1.02, y: -2 }}
                            whileTap={{ scale: 0.98 }}
                            className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-500/10 to-pink-500/10 backdrop-blur-sm border border-purple-500/20 shadow-lg transition-all duration-300"
                        >
                            <div className="absolute inset-0 bg-gradient-to-tr from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                            <CardContent className="relative z-10 p-6">
                                <div className="flex items-start gap-4">
                                    <div className="p-3 bg-purple-500/20 rounded-2xl backdrop-blur-sm border border-purple-500/30">
                                        <Download className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-bold text-purple-900 dark:text-purple-100 mb-2">Offline Library</h3>
                                        <p className="text-sm text-purple-700 dark:text-purple-300 leading-relaxed">
                                            Download your favorite recitations for uninterrupted offline listening
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </motion.div>
                        
                        <motion.div
                            whileHover={{ scale: 1.02, y: -2 }}
                            whileTap={{ scale: 0.98 }}
                            className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500/10 to-orange-500/10 backdrop-blur-sm border border-amber-500/20 shadow-lg transition-all duration-300"
                        >
                            <div className="absolute inset-0 bg-gradient-to-tr from-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                            <CardContent className="relative z-10 p-6">
                                <div className="flex items-start gap-4">
                                    <div className="p-3 bg-amber-500/20 rounded-2xl backdrop-blur-sm border border-amber-500/30">
                                        <SettingsIcon className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-bold text-amber-900 dark:text-amber-100 mb-2">Smart Controls</h3>
                                        <p className="text-sm text-amber-700 dark:text-amber-300 leading-relaxed">
                                            Intuitive interface with background play and advanced audio settings
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </motion.div>
                    </motion.div>
                    
                    {/* Premium Usage Guide */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.3 }}
                        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-50/80 to-slate-100/80 dark:from-slate-800/80 dark:to-slate-900/80 backdrop-blur-md border border-slate-200/50 dark:border-slate-700/50 shadow-lg"
                    >
                        <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500/5 to-transparent opacity-30" />
                        <CardContent className="relative z-10 p-6">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl shadow-lg">
                                    <Sparkles className="w-5 h-5 text-white" />
                                </div>
                                <h3 className="text-xl font-bold text-slate-900 dark:text-white">Premium Experience</h3>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="flex items-start gap-3">
                                    <div className="w-2 h-2 bg-emerald-500 rounded-full mt-2" />
                                    <div>
                                        <p className="text-sm font-medium text-slate-900 dark:text-white mb-1">Select Your Reciter</p>
                                        <p className="text-xs text-slate-600 dark:text-slate-400">Choose from expert reciters with distinct styles</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2" />
                                    <div>
                                        <p className="text-sm font-medium text-slate-900 dark:text-white mb-1">Navigate Surahs</p>
                                        <p className="text-xs text-slate-600 dark:text-slate-400">Browse all 114 chapters with detailed info</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <div className="w-2 h-2 bg-purple-500 rounded-full mt-2" />
                                    <div>
                                        <p className="text-sm font-medium text-slate-900 dark:text-white mb-1">Download & Listen</p>
                                        <p className="text-xs text-slate-600 dark:text-slate-400">Save recitations for premium offline access</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <div className="w-2 h-2 bg-amber-500 rounded-full mt-2" />
                                    <div>
                                        <p className="text-sm font-medium text-slate-900 dark:text-white mb-1">Background Play</p>
                                        <p className="text-xs text-slate-600 dark:text-slate-400">Continue listening while using other apps</p>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </motion.div>
                </div>
            </div>
        </PageTransition>
    );
}
