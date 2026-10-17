/**
 * Daily Rewards Component
 * 7-day login reward system with streak tracking
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { quizStore } from '@/lib/quiz-store';
import { DailyReward, DailyRewardStatus } from '@/data/quiz-store-data';
import {
  Gift,
  Coins,
  Package,
  Check,
  Flame,
  Calendar,
  Star,
  Crown,
  ChevronRight,
  AlertCircle,
  Sparkles
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface DailyRewardsProps {
  onClose: () => void;
}

export function DailyRewards({ onClose }: DailyRewardsProps) {
  const [rewardStatus, setRewardStatus] = useState<DailyRewardStatus | null>(null);
  const [claiming, setClaiming] = useState(false);
  const [justClaimed, setJustClaimed] = useState<DailyReward | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadRewards();
  }, []);

  const loadRewards = () => {
    setRewardStatus(quizStore.getDailyRewardStatus());
  };

  const handleClaim = async () => {
    if (!rewardStatus?.canClaimToday) return;

    setClaiming(true);

    // Simulate claim animation
    setTimeout(() => {
      const result = quizStore.claimDailyReward();

      if (result.success && result.reward) {
        setJustClaimed(result.reward);
        toast({
          title: 'Daily Reward Claimed! 🎉',
          description: `You received Day ${result.reward.day} rewards!`,
        });
        loadRewards();

        // Hide claim animation after delay
        setTimeout(() => {
          setJustClaimed(null);
        }, 3000);
      } else {
        toast({
          title: 'Unable to Claim',
          description: result.message || 'Please try again later.',
          variant: 'destructive'
        });
      }

      setClaiming(false);
    }, 800);
  };

  const getItemIcon = (itemId: string) => {
    const icons: Record<string, string> = {
      fifty_fifty: '✂️',
      extra_time: '⏰',
      hint: '💡',
      skip: '⏭️',
      double_points: '2️⃣',
      perfect_round: '✨'
    };
    return icons[itemId] || '📦';
  };

  const getDayLabel = (day: number) => {
    if (day === 7) return 'GRAND PRIZE';
    if (day === 1) return 'Day 1';
    return `Day ${day}`;
  };

  if (!rewardStatus) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4">
      <div className="max-w-md mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl">
              <Gift className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Daily Rewards</h1>
              <p className="text-sm text-muted-foreground">Come back every day!</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>

        {/* Streak Counter */}
        <Card className="bg-gradient-to-br from-orange-500 to-red-500 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-white/20 rounded-full">
                  <Flame className="w-8 h-8" />
                </div>
                <div>
                  <p className="text-sm opacity-90">Current Streak</p>
                  <p className="text-3xl font-bold">{rewardStatus.currentStreak} Days</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm opacity-90">Next Reward</p>
                <p className="text-lg font-semibold">
                  Day {Math.min(rewardStatus.currentStreak + 1, 7)}
                </p>
              </div>
            </div>

            {/* Streak Progress */}
            <div className="mt-4">
              <div className="flex justify-between text-xs mb-2">
                <span>Progress to Weekly Bonus</span>
                <span>{rewardStatus.currentStreak}/7</span>
              </div>
              <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-white rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${(rewardStatus.currentStreak / 7) * 100}%` }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                />
              </div>
              <p className="text-xs mt-2 opacity-80">
                Complete 7 days for 500 XP + Legendary Power-Up!
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Claim Button */}
        {rewardStatus.canClaimToday && rewardStatus.nextReward && (
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
          >
            <Button
              onClick={handleClaim}
              disabled={claiming}
              className="w-full h-16 text-lg font-bold bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
            >
              {claiming ? (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    className="w-5 h-5 border-2 border-current border-t-transparent rounded-full mr-2"
                  />
                  Claiming...
                </>
              ) : (
                <>
                  <Gift className="w-5 h-5 mr-2" />
                  Claim Day {rewardStatus.nextReward.day} Reward!
                </>
              )}
            </Button>
          </motion.div>
        )}

        {/* Already Claimed Message */}
        {!rewardStatus.canClaimToday && (
          <Card className="bg-muted">
            <CardContent className="p-4 flex items-center gap-3">
              <Check className="w-5 h-5 text-green-500" />
              <div>
                <p className="font-medium">Already Claimed Today!</p>
                <p className="text-sm text-muted-foreground">
                  Come back tomorrow for your next reward.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Claimed Reward Animation */}
        <AnimatePresence>
          {justClaimed && (
            <motion.div
              initial={{ scale: 0.8, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0, y: -20 }}
            >
              <Card className="border-2 border-green-500 bg-green-50 dark:bg-green-900/20">
                <CardContent className="p-6 text-center">
                  <motion.div
                    animate={{ rotate: [0, 10, -10, 0] }}
                    transition={{ duration: 0.5, repeat: 2 }}
                    className="text-4xl mb-3"
                  >
                    🎉
                  </motion.div>
                  <h3 className="font-bold text-lg text-green-700 dark:text-green-300">
                    Day {justClaimed.day} Reward Claimed!
                  </h3>
                  <div className="flex items-center justify-center gap-2 mt-3">
                    <Coins className="w-5 h-5 text-amber-500" />
                    <span className="font-bold">+{justClaimed.xp} XP</span>
                  </div>
                  {justClaimed.items && justClaimed.items.length > 0 && (
                    <div className="flex items-center justify-center gap-2 mt-2">
                      <Package className="w-5 h-5 text-blue-500" />
                      <span className="text-sm">
                        +{justClaimed.items.reduce((acc, item) => acc + item.quantity, 0)} Power-ups
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 7-Day Reward Calendar */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Weekly Rewards
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-7 gap-2">
              {rewardStatus.rewards.map((reward, index) => {
                const isClaimed = reward.claimed;
                const isToday = reward.day === rewardStatus.currentStreak + 1 && rewardStatus.canClaimToday;
                const isPast = reward.day <= rewardStatus.currentStreak;
                const isFuture = reward.day > rewardStatus.currentStreak + 1;

                return (
                  <motion.div
                    key={reward.day}
                    whileHover={!isClaimed && !isFuture ? { scale: 1.05 } : {}}
                    className={`relative aspect-square rounded-lg flex flex-col items-center justify-center text-center p-2 ${
                      isClaimed
                        ? 'bg-green-100 dark:bg-green-900/30 border-2 border-green-500'
                        : isToday
                        ? 'bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30 border-2 border-amber-500 animate-pulse'
                        : isFuture
                        ? 'bg-muted border-2 border-dashed border-muted-foreground/30'
                        : 'bg-muted border-2 border-muted'
                    }`}
                  >
                    {/* Day Number */}
                    <span className={`text-xs font-bold ${
                      isClaimed ? 'text-green-600' :
                      isToday ? 'text-amber-600' :
                      'text-muted-foreground'
                    }`}>
                      {reward.day === 7 ? <Crown className="w-4 h-4 mx-auto" /> : reward.day}
                    </span>

                    {/* Reward Preview */}
                    <div className="mt-1">
                      {isClaimed ? (
                        <Check className="w-4 h-4 text-green-500 mx-auto" />
                      ) : reward.day === 7 ? (
                        <Sparkles className="w-4 h-4 text-purple-500 mx-auto" />
                      ) : reward.items ? (
                        <span className="text-xs">{getItemIcon(reward.items[0].itemId)}</span>
                      ) : (
                        <Coins className="w-3 h-3 text-amber-500 mx-auto" />
                      )}
                    </div>

                    {/* XP Amount */}
                    {!isClaimed && (
                      <span className="text-xs text-muted-foreground mt-1">
                        {reward.xp} XP
                      </span>
                    )}

                    {/* Day 7 Special Badge */}
                    {reward.day === 7 && (
                      <Badge className="absolute -top-2 -right-2 bg-purple-500 text-xs px-1">
                        BONUS
                      </Badge>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Tips */}
        <Card className="bg-primary/5">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-primary mt-0.5" />
              <div>
                <h4 className="font-medium text-sm">How Daily Rewards Work</h4>
                <ul className="text-sm text-muted-foreground mt-1 space-y-1">
                  <li>• Claim a reward every 24 hours</li>
                  <li>• Streak resets if you miss 2 days</li>
                  <li>• Use Streak Freeze to protect your streak</li>
                  <li>• Day 7 gives the biggest rewards!</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
