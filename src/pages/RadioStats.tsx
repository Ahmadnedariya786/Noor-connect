import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart3, Clock, Radio, Trash2, Trophy, Flame, Target, TrendingUp, ArrowLeft, MonitorPlay } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { getSortedStationStats, getTotalListeningTime, resetRadioStats, formatDuration, type StationStats } from '@/lib/radio-stats';
import { getAllAchievements, getCurrentStreak } from '@/lib/radio-achievements';
import { useContentLanguage } from '@/lib/content-translator';
import { ContentLanguageBar } from '@/components/ContentLanguageBar';

const STATS_I18N = {
  en: {
    title: 'Media Statistics',
    subtitle: 'Listen & Watch Habits',
    streak: 'day streak',
    days: 'days',
    totalTime: 'Total Time',
    currentStreak: 'Current Streak',
    totalSessions: 'Total Sessions',
    avgSession: 'Avg Session',
    topStation: 'Top Station / Stream',
    achievements: 'Achievements',
    unlocked: 'unlocked',
    mediaBreakdown: 'Media Breakdown',
    noData: 'No media data yet',
    noDataSub: 'Start listening to radio or watching streams to see statistics',
    reset: 'Reset All Statistics',
    confirmReset: 'Are you sure you want to reset all listening statistics?',
    resetTitle: 'Statistics Reset',
    resetDesc: 'All listening statistics have been cleared',
    sessions: 'session(s)',
  },
  ur: {
    title: 'میڈیا کے اعداد و شمار',
    subtitle: 'سننے اور دیکھنے کی عادات',
    streak: 'دن کا تسلسل',
    days: 'دن',
    totalTime: 'مجموعی وقت',
    currentStreak: 'موجودہ تسلسل',
    totalSessions: 'کل سیشنز',
    avgSession: 'اوسط دورانیہ',
    topStation: 'مقبول ترین اسٹیشن و نشریات',
    achievements: 'کامیابیاں و اعزازات',
    unlocked: 'حاصل شدہ',
    mediaBreakdown: 'تفصیلی میڈیا رپورٹ',
    noData: 'ابھی کوئی ریکارڈ موجود نہیں',
    noDataSub: 'اعداد و شمار دیکھنے کے لیے ریڈیو سنیں یا لائیو نشریات دیکھیں',
    reset: 'تمام اعداد و شمار ری سیٹ کریں',
    confirmReset: 'کیا آپ واقعی سننے اور دیکھنے کے تمام اعداد و شمار صاف کرنا چاہتے ہیں؟',
    resetTitle: 'اعداد و شمار صاف کر دیے گئے',
    resetDesc: 'تمام ریکارڈ کامیابی سے ری سیٹ ہو گیا ہے',
    sessions: 'سیشنز',
  },
  gu: {
    title: 'મીડિયા આંકડાશાસ્ત્ર',
    subtitle: 'સાંભળવા અને જોવાની ટેવ',
    streak: 'દિવસની સ્ટ્રીક',
    days: 'દિવસ',
    totalTime: 'કુલ સમય',
    currentStreak: 'વર્તમાન સ્ટ્રીક',
    totalSessions: 'કુલ સત્રો',
    avgSession: 'સરેરાશ સત્ર',
    topStation: 'ટોચનું સ્ટેશન / પ્રસારણ',
    achievements: 'સિદ્ધિઓ',
    unlocked: 'અનલોક થયેલ',
    mediaBreakdown: 'મીડિયા વિશ્લેષણ',
    noData: 'હજુ કોઈ ડેટા નથી',
    noDataSub: 'આંકડા જોવા માટે રેડિયો સાંભળવાનું અથવા લાઈવ જોવાનું શરૂ કરો',
    reset: 'બધા આંકડા રીસેટ કરો',
    confirmReset: 'શું તમે ખરેખર બધા આંકડા રીસેટ કરવા માંગો છો?',
    resetTitle: 'આંકડા રીસેટ થયા',
    resetDesc: 'બધા આંકડા સફળતાપૂર્વક સાફ થઈ ગયા છે',
    sessions: 'સત્રો',
  },
  hi: {
    title: 'मीडिया आँकड़े',
    subtitle: 'सुनने और देखने की आदतें',
    streak: 'दिन की स्ट्रीक',
    days: 'दिन',
    totalTime: 'कुल समय',
    currentStreak: 'वर्तमान स्ट्रीक',
    totalSessions: 'कुल सत्र',
    avgSession: 'औसत सत्र',
    topStation: 'शीर्ष स्टेशन / प्रसारण',
    achievements: 'उपलब्धियां',
    unlocked: 'अनलॉक',
    mediaBreakdown: 'मीडिया विवरण',
    noData: 'अभी कोई डेटा उपलब्ध नहीं',
    noDataSub: 'आँकड़े देखने के लिए रेडियो सुनना या लाइव स्ट्रीम देखना शुरू करें',
    reset: 'सभी आँकड़े रीसेट करें',
    confirmReset: 'क्या आप वाकई सभी आँकड़े रीसेट करना चाहते हैं?',
    resetTitle: 'आँकड़े रीसेट हुए',
    resetDesc: 'सभी आँकड़े सफलतापूर्वक साफ़ कर दिए गए हैं',
    sessions: 'सत्र',
  },
};

const getAchievementIcon = (id: string) => {
  switch (id) {
    case 'first_listen': return <Radio className="w-5 h-5 text-primary" />;
    case 'hour_listen': return <Clock className="w-5 h-5 text-amber-500" />;
    case 'ten_hours': return <Target className="w-5 h-5 text-blue-500" />;
    case 'streak_3':
    case 'streak_7':
    case 'streak_30': return <Flame className="w-5 h-5 text-orange-500" />;
    case 'variety_5':
    case 'variety_10': return <TrendingUp className="w-5 h-5 text-emerald-500" />;
    default: return <Trophy className="w-5 h-5 text-primary" />;
  }
};

export default function RadioStats() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { contentLang, isRtl } = useContentLanguage();
  const strings = STATS_I18N[contentLang] || STATS_I18N.en;

  const [stats, setStats] = useState<StationStats[]>([]);
  const [totalTime, setTotalTime] = useState<number>(0);
  const [streak, setStreak] = useState<number>(0);
  const [achievements, setAchievements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    setLoading(true);
    try {
      const [stations, total, currentStreak, allAchievements] = await Promise.all([
        getSortedStationStats(),
        getTotalListeningTime(),
        getCurrentStreak(),
        getAllAchievements(),
      ]);
      setStats(stations);
      setTotalTime(total);
      setStreak(currentStreak);
      setAchievements(allAchievements);
    } catch (error) {
      console.error('Failed to load stats:', error);
      toast({
        title: 'Error',
        description: 'Failed to load listening statistics',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    if (!confirm(strings.confirmReset)) {
      return;
    }

    try {
      await resetRadioStats();
      await loadStats();
      toast({
        title: strings.resetTitle,
        description: strings.resetDesc,
      });
    } catch (error) {
      console.error('Failed to reset stats:', error);
      toast({
        title: 'Error',
        description: 'Failed to reset statistics',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const maxTime = stats.length > 0 ? stats[0].totalSeconds : 0;
  const totalSessions = stats.reduce((sum, s) => sum + s.sessionCount, 0);
  const avgSessionDuration = totalSessions > 0 ? Math.floor(totalTime / totalSessions) : 0;
  const mostListened = stats.length > 0 ? stats[0] : null;
  const unlockedCount = achievements.filter(a => a.unlocked).length;

  return (
    <div className="min-h-screen bg-background safe-top">
      <div className="max-w-2xl mx-auto px-4 py-6 pb-28 space-y-5">
        {/* Page Header */}
        <div className={`flex items-center gap-3 ${isRtl ? 'flex-row-reverse text-right' : ''}`}>
          <Button variant="ghost" size="icon" onClick={() => navigate("/quran-radio")} className="rounded-full">
            <ArrowLeft className={`w-5 h-5 ${isRtl ? 'rotate-180' : ''}`} />
          </Button>
          <div className="flex-1">
            <h1 className={`text-2xl font-black text-foreground tracking-tight ${contentLang === 'ur' ? 'font-urdu' : ''}`}>
              {strings.title}
            </h1>
            <p className={`text-xs font-bold text-muted-foreground uppercase tracking-widest ${contentLang === 'ur' ? 'font-urdu text-[13px]' : ''}`}>
              {strings.subtitle}
            </p>
          </div>
          {streak > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/20">
              <Flame className="w-4 h-4 text-orange-500" />
              <span className={`text-sm font-bold text-orange-500 ${contentLang === 'ur' ? 'font-urdu' : ''}`}>{streak} {strings.streak}</span>
            </div>
          )}
        </div>

        {/* 4-Language Selector Bar */}
        <ContentLanguageBar fullWidth />

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          {/* Total Time */}
          <Card className="p-4 bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/20">
            <div className={`flex items-center gap-2 mb-2 ${isRtl ? 'flex-row-reverse text-right' : ''}`}>
              <Clock className="w-4 h-4 text-purple-600" />
              <p className={`text-xs font-medium text-muted-foreground ${contentLang === 'ur' ? 'font-urdu' : ''}`}>{strings.totalTime}</p>
            </div>
            <p className={`text-2xl font-black text-foreground ${isRtl ? 'text-right' : ''}`}>{formatDuration(totalTime)}</p>
          </Card>

          {/* Streak */}
          <Card className="p-4 bg-gradient-to-br from-orange-500/10 to-red-500/10 border-orange-500/20">
            <div className={`flex items-center gap-2 mb-2 ${isRtl ? 'flex-row-reverse text-right' : ''}`}>
              <Flame className="w-4 h-4 text-orange-600" />
              <p className={`text-xs font-medium text-muted-foreground ${contentLang === 'ur' ? 'font-urdu' : ''}`}>{strings.currentStreak}</p>
            </div>
            <p className={`text-2xl font-black text-foreground ${isRtl ? 'text-right' : ''}`}>{streak} {strings.days}</p>
          </Card>

          {/* Total Sessions */}
          <Card className="p-4 bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border-blue-500/20">
            <div className={`flex items-center gap-2 mb-2 ${isRtl ? 'flex-row-reverse text-right' : ''}`}>
              <Target className="w-4 h-4 text-blue-600" />
              <p className={`text-xs font-medium text-muted-foreground ${contentLang === 'ur' ? 'font-urdu' : ''}`}>{strings.totalSessions}</p>
            </div>
            <p className={`text-2xl font-black text-foreground ${isRtl ? 'text-right' : ''}`}>{totalSessions}</p>
          </Card>

          {/* Avg Duration */}
          <Card className="p-4 bg-[var(--surface-2)] border-[var(--border)]">
            <div className={`flex items-center gap-2 mb-2 ${isRtl ? 'flex-row-reverse text-right' : ''}`}>
              <TrendingUp className="w-4 h-4 text-[var(--accent)]" />
              <p className={`text-xs font-medium text-muted-foreground ${contentLang === 'ur' ? 'font-urdu' : ''}`}>{strings.avgSession}</p>
            </div>
            <p className={`text-2xl font-black text-foreground ${isRtl ? 'text-right' : ''}`}>{formatDuration(avgSessionDuration)}</p>
          </Card>
        </div>

        {/* Most Listened Station */}
        {mostListened && (
          <Card className="p-4">
            <div className={`flex items-center gap-3 ${isRtl ? 'flex-row-reverse text-right' : ''}`}>
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                {mostListened.stationId.startsWith('live_') ? (
                  <MonitorPlay className="w-5 h-5 text-primary" />
                ) : (
                  <Radio className="w-5 h-5 text-primary" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-xs font-medium text-muted-foreground ${contentLang === 'ur' ? 'font-urdu' : ''}`}>{strings.topStation}</p>
                <p className="text-sm font-bold text-foreground truncate">{mostListened.stationName}</p>
              </div>
              <div className={isRtl ? 'text-left' : 'text-right'}>
                <p className="text-sm font-bold text-foreground">{formatDuration(mostListened.totalSeconds)}</p>
                <p className="text-xs text-muted-foreground">
                  {((mostListened.totalSeconds / totalTime) * 100).toFixed(1)}%
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Achievements Section */}
        <div>
          <div className={`flex items-center justify-between mb-3 ${isRtl ? 'flex-row-reverse' : ''}`}>
            <h2 className={`text-lg font-bold text-foreground flex items-center gap-2 ${contentLang === 'ur' ? 'font-urdu' : ''}`}>
              <Trophy className="w-5 h-5 text-yellow-500" />
              {strings.achievements}
            </h2>
            <span className={`text-xs font-medium text-muted-foreground ${contentLang === 'ur' ? 'font-urdu' : ''}`}>
              {unlockedCount}/{achievements.length} {strings.unlocked}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {achievements.map((achievement) => (
              <Card
                key={achievement.id}
                className={`p-3 text-center ${
                  achievement.unlocked
                    ? 'bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border-yellow-500/20'
                    : 'bg-muted/30 border-muted/50 opacity-60'
                }`}
              >
                <div className="w-10 h-10 mx-auto mb-1.5 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
                  {getAchievementIcon(achievement.id)}
                </div>
                <p className="text-xs font-bold text-foreground leading-tight mb-0.5">
                  {achievement.title}
                </p>
                <p className="text-xs text-muted-foreground leading-tight">
                  {achievement.description}
                </p>
                {achievement.unlocked && (
                  <div className="mt-1.5">
                    <div className="w-full h-1 bg-yellow-500/30 rounded-full overflow-hidden">
                      <div className="h-full bg-yellow-500 rounded-full w-full" />
                    </div>
                  </div>
                )}
              </Card>
            ))}
          </div>
        </div>

        {/* Station List */}
        <div>
          <h2 className={`text-lg font-bold text-foreground mb-3 ${contentLang === 'ur' ? 'font-urdu text-right' : ''}`}>
            {strings.mediaBreakdown}
          </h2>
          {stats.length === 0 ? (
            <Card className="p-8 text-center">
              <MonitorPlay className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
              <p className={`text-sm font-medium text-muted-foreground ${contentLang === 'ur' ? 'font-urdu' : ''}`}>{strings.noData}</p>
              <p className={`text-xs text-muted-foreground/50 mt-1 ${contentLang === 'ur' ? 'font-urdu' : ''}`}>{strings.noDataSub}</p>
            </Card>
          ) : (
            <div className="space-y-3">
            {stats.map((station, index) => {
              const percentage = maxTime > 0 ? (station.totalSeconds / maxTime) * 100 : 0;
              return (
                <Card key={station.stationId} className="p-4">
                  <div className="space-y-3">
                    <div className={`flex items-center justify-between ${isRtl ? 'flex-row-reverse' : ''}`}>
                      <div className={`flex items-center gap-3 ${isRtl ? 'flex-row-reverse text-right' : ''}`}>
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                          {station.stationId.startsWith('live_') ? (
                            <MonitorPlay className="w-4 h-4 text-primary" />
                          ) : (
                            <Radio className="w-4 h-4 text-primary" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-foreground">{station.stationName}</p>
                          <p className={`text-xs text-muted-foreground ${contentLang === 'ur' ? 'font-urdu' : ''}`}>
                            {station.sessionCount} {strings.sessions}
                          </p>
                        </div>
                      </div>
                      <div className={isRtl ? 'text-left' : 'text-right'}>
                        <p className="text-sm font-bold text-foreground">{formatDuration(station.totalSeconds)}</p>
                        <p className="text-xs text-muted-foreground">
                          {percentage.toFixed(1)}%
                        </p>
                      </div>
                    </div>
                    {/* Progress Bar */}
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                </Card>
              );
            })}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Button
            variant="destructive"
            onClick={handleReset}
            className={`w-full rounded-2xl ${contentLang === 'ur' ? 'font-urdu' : ''}`}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            {strings.reset}
          </Button>
        </div>
      </div>
    </div>
  );
}
