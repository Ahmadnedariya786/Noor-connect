/**
 * Quiz Store UI Component
 * Power-up store where users spend XP to buy items
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { quizStore } from '@/lib/quiz-store';
import { quizManager } from '@/lib/quiz-manager';
import { StoreItem, StoreItemCategory } from '@/data/quiz-store-data';
import { ALL_STORE_ITEMS } from '@/data/store-catalog';
import { QuizStats } from '@/data/enhanced-quiz-data';
import {
  Sparkles,
  Star,
  Lock,
  Check,
  X,
  Coins,
  ShoppingBag,
  TrendingUp,
  Zap,
  Shield,
  Clock,
  Package,
  Crown,
  Info,
  AlertCircle
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

interface StoreItemWithStatus extends StoreItem {
  owned: number;
  canAfford: boolean;
  unlocked: boolean;
}

interface QuizStoreProps {
  onClose: () => void;
}

export function QuizStore({ onClose }: QuizStoreProps) {
  const [stats, setStats] = useState<QuizStats | null>(null);
  const [storeItems, setStoreItems] = useState<StoreItemWithStatus[]>([]);
  const [selectedItem, setSelectedItem] = useState<StoreItemWithStatus | null>(null);
  const [activeTab, setActiveTab] = useState<StoreItemCategory>('basic');
  const [purchaseConfirmOpen, setPurchaseConfirmOpen] = useState(false);
  const [purchaseAnimating, setPurchaseAnimating] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadStoreData();
  }, []);

  const loadStoreData = () => {
    const currentStats = quizManager.getStats();
    setStats(currentStats);
    setStoreItems(quizStore.getStoreItems());
  };

  const handlePurchase = async (item: StoreItemWithStatus) => {
    if (!item.unlocked) {
      toast({
        title: 'Locked',
        description: 'You don\'t meet the requirements to buy this item yet.',
        variant: 'destructive'
      });
      return;
    }

    if (!item.canAfford) {
      toast({
        title: 'Not Enough XP',
        description: `You need ${item.cost - (stats?.xp || 0)} more XP to buy this.`,
        variant: 'destructive'
      });
      return;
    }

    if (item.owned >= item.maxInventory) {
      toast({
        title: 'Inventory Full',
        description: 'You can\'t carry more of this item.',
        variant: 'destructive'
      });
      return;
    }

    setSelectedItem(item);
    setPurchaseConfirmOpen(true);
  };

  const confirmPurchase = () => {
    if (!selectedItem) return;

    setPurchaseAnimating(true);

    setTimeout(() => {
      const result = quizStore.purchaseItem(selectedItem.id);

      if (result.success) {
        toast({
          title: 'Purchase Successful! 🎉',
          description: `You bought ${selectedItem.name} for ${selectedItem.cost} XP!`,
        });
        loadStoreData();
      } else {
        toast({
          title: 'Purchase Failed',
          description: result.message || 'Something went wrong.',
          variant: 'destructive'
        });
      }

      setPurchaseAnimating(false);
      setPurchaseConfirmOpen(false);
      setSelectedItem(null);
    }, 500);
  };

  const getCategoryColor = (category: StoreItemCategory) => {
    switch (category) {
      case 'basic': return 'bg-slate-500';
      case 'premium': return 'bg-amber-500';
      case 'legendary': return 'bg-purple-500';
      case 'booster': return 'bg-blue-500';
      default: return 'bg-slate-500';
    }
  };

  const getCategoryIcon = (category: StoreItemCategory) => {
    switch (category) {
      case 'basic': return <Package className="w-4 h-4" />;
      case 'premium': return <Star className="w-4 h-4" />;
      case 'legendary': return <Crown className="w-4 h-4" />;
      case 'booster': return <Zap className="w-4 h-4" />;
      default: return <Package className="w-4 h-4" />;
    }
  };

  const getTypeIcon = (type: StoreItem['type']) => {
    switch (type) {
      case 'powerup': return <Zap className="w-4 h-4 text-yellow-500" />;
      case 'booster': return <TrendingUp className="w-4 h-4 text-blue-500" />;
      case 'protection': return <Shield className="w-4 h-4 text-green-500" />;
      case 'cosmetic': return <Sparkles className="w-4 h-4 text-pink-500" />;
      default: return <Package className="w-4 h-4" />;
    }
  };

  const getRequirementText = (item: StoreItemWithStatus) => {
    if (!item.requirements) return null;
    const { minLevel, achievementId, categoryMastery } = item.requirements;
    if (minLevel) return `Requires Level ${minLevel}`;
    if (achievementId) return 'Requires Achievement';
    if (categoryMastery) return 'Requires Category Mastery';
    return null;
  };

  const itemsByCategory = {
    basic: storeItems.filter(i => i.category === 'basic'),
    premium: storeItems.filter(i => i.category === 'premium'),
    legendary: storeItems.filter(i => i.category === 'legendary'),
    booster: storeItems.filter(i => i.category === 'booster'),
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl">
                <ShoppingBag className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Power-Up Store</h1>
                <p className="text-sm text-muted-foreground">Spend XP to buy awesome power-ups!</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {/* XP Display */}
              <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-100 to-yellow-100 dark:from-amber-900/30 dark:to-yellow-900/30 rounded-full">
                <Coins className="w-5 h-5 text-amber-500" />
                <span className="font-bold text-amber-700 dark:text-amber-300">
                  {stats?.xp?.toLocaleString() || 0} XP
                </span>
              </div>

              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Level Progress */}
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Crown className="w-5 h-5 text-primary" />
                <span className="font-bold">Level {stats?.level || 1}</span>
              </div>
              <span className="text-sm text-muted-foreground">
                {quizManager.getLevelProgress().remaining} XP to next level
              </span>
            </div>
            <Progress value={quizManager.getLevelProgress().progress} className="h-2" />
          </CardContent>
        </Card>

        {/* Category Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as StoreItemCategory)}>
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="basic" className="flex items-center gap-2">
              <Package className="w-4 h-4" />
              <span className="hidden sm:inline">Basic</span>
            </TabsTrigger>
            <TabsTrigger value="premium" className="flex items-center gap-2">
              <Star className="w-4 h-4" />
              <span className="hidden sm:inline">Premium</span>
            </TabsTrigger>
            <TabsTrigger value="legendary" className="flex items-center gap-2">
              <Crown className="w-4 h-4" />
              <span className="hidden sm:inline">Legendary</span>
            </TabsTrigger>
            <TabsTrigger value="booster" className="flex items-center gap-2">
              <Zap className="w-4 h-4" />
              <span className="hidden sm:inline">Boosters</span>
            </TabsTrigger>
          </TabsList>

          {(['basic', 'premium', 'legendary', 'booster'] as StoreItemCategory[]).map((category) => (
            <TabsContent key={category} value={category}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <AnimatePresence mode="popLayout">
                  {itemsByCategory[category].map((item) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      whileHover={{ scale: item.unlocked && item.canAfford ? 1.02 : 1 }}
                    >
                      <Card className={`overflow-hidden transition-all ${
                        !item.unlocked ? 'opacity-60' : ''
                      } ${item.owned >= item.maxInventory ? 'ring-2 ring-green-500/50' : ''}`}>
                        <CardContent className="p-4">
                          <div className="flex items-start gap-4">
                            {/* Icon */}
                            <div className={`w-14 h-14 rounded-xl flex items-center justify-center text-2xl ${
                              getCategoryColor(category)
                            } text-white`}>
                              {item.icon}
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-semibold truncate">{item.name}</h3>
                                {getTypeIcon(item.type)}
                              </div>
                              <p className="text-sm text-muted-foreground line-clamp-2">
                                {item.description}
                              </p>

                              {/* Requirements */}
                              {!item.unlocked && getRequirementText(item) && (
                                <div className="flex items-center gap-1 mt-2 text-xs text-orange-500">
                                  <Lock className="w-3 h-3" />
                                  <span>{getRequirementText(item)}</span>
                                </div>
                              )}

                              {/* Inventory */}
                              <div className="flex items-center gap-2 mt-2">
                                <Badge variant="secondary" className="text-xs">
                                  <Package className="w-3 h-3 mr-1" />
                                  {item.owned}/{item.maxInventory}
                                </Badge>
                              </div>
                            </div>

                            {/* Price & Action */}
                            <div className="flex flex-col items-end gap-2">
                              <div className={`flex items-center gap-1 font-bold ${
                                item.canAfford ? 'text-amber-600' : 'text-red-500'
                              }`}>
                                <Coins className="w-4 h-4" />
                                {item.cost}
                              </div>

                              <Button
                                size="sm"
                                onClick={() => handlePurchase(item)}
                                disabled={!item.unlocked || !item.canAfford || item.owned >= item.maxInventory}
                                variant={item.owned >= item.maxInventory ? 'outline' : 'default'}
                              >
                                {item.owned >= item.maxInventory ? (
                                  <>
                                    <Check className="w-4 h-4 mr-1" />
                                    Max
                                  </>
                                ) : !item.unlocked ? (
                                  <>
                                    <Lock className="w-4 h-4 mr-1" />
                                    Lock
                                  </>
                                ) : (
                                  'Buy'
                                )}
                              </Button>
                            </div>
                          </div>

                          {/* Effect Details */}
                          {item.effect && (
                            <div className="mt-3 pt-3 border-t">
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Info className="w-3 h-3" />
                                <span>
                                  {item.effect.type === 'multiplier' && `2x points for ${item.effect.duration} questions`}
                                  {item.effect.type === 'addTime' && `+${item.effect.value}s to timer`}
                                  {item.effect.type === 'removeWrong' && `Removes ${item.effect.value} wrong answers`}
                                  {item.effect.type === 'freezeTime' && `Pauses timer for ${item.effect.value}s`}
                                  {item.effect.type === 'streakProtection' && 'Protects your streak'}
                                  {item.effect.type === 'autoCorrect' && `Auto-corrects ${item.effect.value} questions`}
                                  {item.effect.type === 'xpMultiplier' && `+${Math.round((item.effect.value - 1) * 100)}% XP earned`}
                                  {item.effect.duration && item.type === 'booster' && ` • Lasts ${Math.round(item.effect.duration / 60)} min`}
                                </span>
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </TabsContent>
          ))}
        </Tabs>

        {/* Quick Stats */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Info className="w-4 h-4" />
              Store Tips
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Earn XP by answering quiz questions correctly</li>
              <li>• Build streaks for bonus XP rewards</li>
              <li>• Premium power-ups unlock at higher levels</li>
              <li>• Boosters give temporary effects for multiple quizzes</li>
              <li>• Check back daily for free rewards!</li>
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Purchase Confirmation Dialog */}
      <Dialog open={purchaseConfirmOpen} onOpenChange={setPurchaseConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Purchase</DialogTitle>
            <DialogDescription>
              Are you sure you want to buy this item?
            </DialogDescription>
          </DialogHeader>

          {selectedItem && (
            <div className="flex items-center gap-4 py-4">
              <div className={`w-16 h-16 rounded-xl flex items-center justify-center text-3xl ${
                getCategoryColor(selectedItem.category)
              } text-white`}>
                {selectedItem.icon}
              </div>
              <div>
                <h3 className="font-semibold text-lg">{selectedItem.name}</h3>
                <p className="text-sm text-muted-foreground">{selectedItem.description}</p>
                <div className="flex items-center gap-1 mt-1 font-bold text-amber-600">
                  <Coins className="w-4 h-4" />
                  {selectedItem.cost} XP
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setPurchaseConfirmOpen(false)}>
              Cancel
            </Button>
            <Button onClick={confirmPurchase} disabled={purchaseAnimating}>
              {purchaseAnimating ? (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    className="w-4 h-4 border-2 border-current border-t-transparent rounded-full mr-2"
                  />
                  Processing...
                </>
              ) : (
                <>
                  <ShoppingBag className="w-4 h-4 mr-2" />
                  Confirm Purchase
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
