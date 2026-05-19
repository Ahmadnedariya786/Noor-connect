import { useState, useEffect, useCallback } from 'react';
import { AppBar } from '@/components/AppBar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { LayoutManager } from '@/components/LayoutManager';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';
import { 
  Trophy, 
  RotateCcw, 
  CheckCircle, 
  XCircle, 
  Lightbulb, 
  Award,
  Star,
  Zap,
  Clock,
  Target,
  Flame,
  Gift,
  Shield,
  Crown,
  TrendingUp,
  Timer,
  HelpCircle,
  ShoppingBag,
  Calendar,
  Sparkles,
  Store,
  ChevronRight,
  Lock,
  Heart,
  Package,
  Gift as GiftIcon
} from 'lucide-react';
import { quizManager } from '@/lib/quiz-manager';
import { quizStore } from '@/lib/quiz-store';
import { livesSystem } from '@/lib/lives-system';
import { mysteryBoxSystem } from '@/lib/mystery-box';
import { variableRewardsSystem, VariableReward } from '@/lib/variable-rewards';
import { feedbackSystem } from '@/lib/feedback-system';
import { pushNotificationSystem } from '@/lib/push-notifications';
import { timeEventsSystem } from '@/lib/time-events';
import { AchievementDisplay } from '@/components/AchievementDisplay';
import { QuizStore } from '@/components/quiz/QuizStore';
import { GameModeSelector, GameMode } from '@/components/quiz/GameModeSelector';
import { ComboDisplay, useCombo } from '@/components/quiz/ComboDisplay';
import { DailyRewards } from '@/components/quiz/DailyRewards';
import { LivesDisplay, LivesCompact } from '@/components/quiz/LivesDisplay';
import { MysteryBoxPanel } from '@/components/quiz/MysteryBoxPanel';
import { LossAversionBanner, FloatingNotification, MotivationToast } from '@/components/quiz/LossAversionBanner';
import { getStoreItemById } from '@/data/store-catalog';
import { 
  QUIZ_CATEGORIES, 
  ACHIEVEMENTS, 
  POWER_UPS,
  type QuizQuestion,
  type QuizStats,
  type Achievement,
  type PowerUp 
} from '@/data/enhanced-quiz-data';
import { ComboState, QuizSession } from '@/data/quiz-store-data';

interface GameState {
  questions: QuizQuestion[];
  currentQuestion: number;
  selectedAnswer: number | null;
  showResult: boolean;
  score: number;
  streak: number;
  timeLeft: number;
  isTimerActive: boolean;
  usedPowerUps: string[];
  categoryAnswers: Record<string, { correct: number; total: number }>;
  quizMode: 'classic' | 'timeAttack' | 'survival' | 'daily' | 'category';
  gameModeConfig?: any;
}

export default function EnhancedIslamicQuiz() {
  const { toast } = useToast();
  const [gameState, setGameState] = useState<GameState>({
    questions: [],
    currentQuestion: 0,
    selectedAnswer: null,
    showResult: false,
    score: 0,
    streak: 0,
    timeLeft: 30,
    isTimerActive: false,
    usedPowerUps: [],
    categoryAnswers: {},
    quizMode: 'classic'
  });
  
  const [quizComplete, setQuizComplete] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');
  const [stats, setStats] = useState<QuizStats | null>(null);
  const [powerUps, setPowerUps] = useState<PowerUp[]>([]);
  const [storeInventory, setStoreInventory] = useState<Record<string, number>>({});
  const [newAchievements, setNewAchievements] = useState<Achievement[]>([]);
  const [showAchievements, setShowAchievements] = useState(false);
  const [gameMode, setGameMode] = useState<'menu' | 'playing' | 'results' | 'achievements' | 'store' | 'modeSelect' | 'dailyRewards' | 'mysteryBox'>('menu');
  const [selectedGameMode, setSelectedGameMode] = useState<GameMode>('classic');
  const [combo, setCombo] = useState(0);
  const [comboMultiplier, setComboMultiplier] = useState(1);
  const [quizStartTime, setQuizStartTime] = useState<number>(0);
  const [variableReward, setVariableReward] = useState<VariableReward | null>(null);
  const [canClaimMysteryBox, setCanClaimMysteryBox] = useState(false);
  const [activeEvent, setActiveEvent] = useState<ReturnType<typeof timeEventsSystem.getActiveEvent>>(null);

  useEffect(() => {
    setStats(quizManager.getStats());
    setPowerUps(quizManager.getPowerUps());
    loadStoreInventory();
  }, []);

  const loadStoreInventory = () => {
    const inventory = quizStore.getInventory();
    setStoreInventory(inventory.items);
  };

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (gameState.isTimerActive && gameState.timeLeft > 0) {
      timer = setTimeout(() => {
        setGameState(prev => ({
          ...prev,
          timeLeft: prev.timeLeft - 1
        }));
      }, 1000);
    } else if (gameState.timeLeft === 0 && gameState.isTimerActive) {
      handleTimeUp();
    }
    return () => clearTimeout(timer);
  }, [gameState.timeLeft, gameState.isTimerActive]);

  const startNewQuiz = useCallback((mode: GameMode = selectedGameMode, config?: any) => {
    // Get questions based on game mode
    let questionCount = 10;
    if (mode === 'timeAttack') questionCount = 50; // Unlimited for 2 minutes
    if (mode === 'survival') questionCount = 100; // Endless until wrong
    
    const questions = quizManager.getQuestions(
      selectedCategory || config?.category || undefined, 
      selectedDifficulty !== 'all' ? selectedDifficulty : config?.difficulty || undefined, 
      questionCount
    );
    
    setGameState({
      questions,
      currentQuestion: 0,
      selectedAnswer: null,
      showResult: false,
      score: 0,
      streak: 0,
      timeLeft: questions[0]?.timeLimit || 30,
      isTimerActive: true,
      usedPowerUps: [],
      categoryAnswers: {},
      quizMode: mode,
      gameModeConfig: config
    });
    setQuizComplete(false);
    setNewAchievements([]);
    setGameMode('playing');
    setQuizStartTime(Date.now());
    
    // Reset combo for new quiz
    setCombo(0);
    setComboMultiplier(1);
  }, [selectedCategory, selectedDifficulty, selectedGameMode]);

  const finishQuiz = useCallback(() => {
    setQuizComplete(true);
    setGameMode('results');
    
    // Calculate time spent
    const timeSpent = Math.floor((Date.now() - quizStartTime) / 1000);
    
    // Save quiz session to history
    const session: QuizSession = {
      id: `quiz_${Date.now()}`,
      date: new Date().toISOString(),
      mode: gameState.quizMode,
      score: gameState.score,
      totalQuestions: gameState.questions.length,
      accuracy: Math.round((gameState.score / gameState.questions.length) * 100),
      xpEarned: 0,
      maxCombo: combo,
      powerUpsUsed: gameState.usedPowerUps,
      categories: Object.keys(gameState.categoryAnswers),
      timeSpent,
      streakAtEnd: gameState.streak
    };
    
    // Calculate XP with combo multiplier and event multiplier
    const baseXP = gameState.score * 10;
    const perfectBonus = gameState.score === gameState.questions.length ? 50 : 0;
    const comboBonus = combo >= 10 ? combo * 5 : 0;
    const eventMultiplier = timeEventsSystem.getCurrentMultiplier();
    const totalXP = Math.round((baseXP + perfectBonus + comboBonus) * comboMultiplier * eventMultiplier);
    
    session.xpEarned = totalXP;
    
    // Add XP through store system
    const actualXP = quizStore.addXP(totalXP, `${gameState.quizMode} Quiz Complete`);
    
    // Check for variable rewards
    const completionReward = variableRewardsSystem.rollQuizCompletionReward(
      gameState.score,
      session.accuracy,
      combo,
      gameState.streak
    );
    
    if (completionReward) {
      setVariableReward(completionReward);
      toast({
        title: '🎁 Bonus Reward!',
        description: completionReward.message,
      });
    }
    
    // Save session
    quizStore.saveQuizSession(session);
    
    // Complete daily challenge if this was it
    if (gameState.quizMode === 'daily') {
      quizStore.completeDailyChallenge();
    }
    
    const updatedStats = quizManager.getStats();
    setStats(updatedStats);
    
    // Check for new achievements
    const achievements = quizManager.getAchievements();
    const newOnes = achievements.filter(a => a.unlocked && !stats?.achievements.includes(a.id));
    setNewAchievements(newOnes);
    
    if (newOnes.length > 0) {
      setShowAchievements(true);
    }
    
    // Show completion toast
    toast({
      title: 'Quiz Complete! 🎉',
      description: `You earned ${actualXP} XP!`,
    });
    
    // Level up feedback
    if (updatedStats.level > (stats?.level || 0)) {
      feedbackSystem.feedbackLevelUp();
    }
  }, [gameState, combo, comboMultiplier, quizStartTime, stats, toast]);

  // Update combo when answering
  const handleAnswer = useCallback((answerIndex: number) => {
    if (gameState.showResult) return;
    
    const question = gameState.questions[gameState.currentQuestion];
    const isCorrect = answerIndex === question.correctAnswer;
    
    // Haptic & Audio feedback
    if (isCorrect) {
      feedbackSystem.feedbackCorrect();
    } else {
      feedbackSystem.feedbackWrong();
    }
    
    // Update combo
    const newComboState = quizStore.updateCombo(isCorrect);
    setCombo(newComboState.currentCombo);
    setComboMultiplier(newComboState.comboMultiplier);
    
    // Combo milestone feedback
    if (newComboState.currentCombo > 0 && newComboState.currentCombo % 5 === 0) {
      feedbackSystem.feedbackCombo(newComboState.currentCombo);
    }
    
    // Check for streak bonus
    const streakReward = variableRewardsSystem.checkStreakMilestone(newComboState.currentCombo);
    if (streakReward) {
      toast({
        title: streakReward.message,
        description: streakReward.itemId ? 'Bonus item added to inventory!' : `+${streakReward.amount} XP bonus!`,
      });
    }
    
    // Lucky find (rare random drop)
    const luckyFind = variableRewardsSystem.rollLuckyFind();
    if (luckyFind) {
      setVariableReward(luckyFind);
      toast({
        title: `${luckyFind.icon} ${luckyFind.message}`,
      });
    }
    
    // Update category answers
    const categoryAnswers = { ...gameState.categoryAnswers };
    if (!categoryAnswers[question.category]) {
      categoryAnswers[question.category] = { correct: 0, total: 0 };
    }
    categoryAnswers[question.category].total += 1;
    if (isCorrect) {
      categoryAnswers[question.category].correct += 1;
    }
    
    setGameState(prev => ({
      ...prev,
      selectedAnswer: answerIndex,
      showResult: true,
      isTimerActive: false,
      score: isCorrect ? prev.score + question.points : prev.score,
      streak: isCorrect ? prev.streak + 1 : 0,
      categoryAnswers
    }));
    
    // In survival mode, end quiz if answer is wrong
    if (!isCorrect && gameState.quizMode === 'survival') {
      feedbackSystem.feedbackStreakBreak();
      setTimeout(() => {
        finishQuiz();
      }, 2000);
    }
  }, [gameState.showResult, gameState.questions, gameState.currentQuestion, gameState.quizMode, finishQuiz, toast]);

  const handleTimeUp = useCallback(() => {
    setGameState(prev => ({
      ...prev,
      showResult: true,
      isTimerActive: false,
      streak: 0
    }));
    
    // In survival mode, time up also ends the quiz
    if (gameState.quizMode === 'survival') {
      setTimeout(() => {
        finishQuiz();
      }, 2000);
    }
  }, [gameState.quizMode]);

  const nextQuestion = useCallback(() => {
    // In survival mode, only continue if answer was correct
    if (gameState.quizMode === 'survival') {
      const lastAnswer = gameState.selectedAnswer;
      const lastQuestion = gameState.questions[gameState.currentQuestion];
      const wasCorrect = lastAnswer === lastQuestion.correctAnswer;
      
      if (!wasCorrect) {
        return; // Don't continue if wrong answer in survival mode
      }
    }
    
    if (gameState.currentQuestion < gameState.questions.length - 1) {
      const nextQuestionIndex = gameState.currentQuestion + 1;
      const nextQ = gameState.questions[nextQuestionIndex];
      
      setGameState(prev => ({
        ...prev,
        currentQuestion: nextQuestionIndex,
        selectedAnswer: null,
        showResult: false,
        timeLeft: nextQ?.timeLimit || 30,
        isTimerActive: true
      }));
    } else {
      finishQuiz();
    }
  }, [gameState]);

  const handleUsePowerUp = useCallback((powerUpId: string) => {
    if (gameState.usedPowerUps.includes(powerUpId)) return;
    
    const success = quizStore.useItem(powerUpId);
    if (success) {
      // Update inventory display
      loadStoreInventory();
      
      const item = getStoreItemById(powerUpId);
      
       switch (powerUpId) {
         case 'fifty_fifty': {
           // Remove two incorrect answers
           toast({
             title: '50:50 Used!',
             description: 'Two wrong answers eliminated.',
           });
           break;
         }
         case 'extra_time': {
           setGameState(prev => ({
             ...prev,
             timeLeft: prev.timeLeft + 30,
             usedPowerUps: [...prev.usedPowerUps, powerUpId]
           }));
           toast({
             title: 'Extra Time!',
             description: '+30 seconds added to timer.',
           });
           break;
         }
         case 'skip': {
           nextQuestion();
           toast({
             title: 'Question Skipped!',
             description: 'Moving to next question...',
           });
           break;
         }
         case 'freeze_time': {
           setGameState(prev => ({
             ...prev,
             isTimerActive: false,
             usedPowerUps: [...prev.usedPowerUps, powerUpId]
           }));
           toast({
             title: 'Time Frozen!',
             description: 'Timer paused for 15 seconds.',
           });
           // Resume after 15 seconds
           setTimeout(() => {
             setGameState(prev => ({
               ...prev,
               isTimerActive: true
             }));
           }, 15000);
           break;
         }
         case 'second_chance': {
           toast({
             title: 'Second Chance Active!',
             description: 'Your streak is protected for one wrong answer.',
           });
           break;
         }
         default: {
           toast({
             title: `${item?.name || 'Power-up'} Used!`,
             description: item?.description || 'Power-up activated.',
           });
         }
       }
    } else {
      toast({
        title: 'Failed to Use',
        description: 'You don\'t have this item in your inventory.',
        variant: 'destructive'
      });
    }
  }, [gameState.usedPowerUps, nextQuestion, toast]);

  if (gameMode === 'menu') {
    return <QuizMenu 
      onStartQuiz={startNewQuiz}
      onSelectMode={() => setGameMode('modeSelect')}
      selectedCategory={selectedCategory}
      setSelectedCategory={setSelectedCategory}
      selectedDifficulty={selectedDifficulty}
      setSelectedDifficulty={setSelectedDifficulty}
      stats={stats}
      setStats={setStats}
      powerUps={powerUps}
      storeInventory={storeInventory}
      onShowAchievements={() => setGameMode('achievements')}
      onOpenStore={() => setGameMode('store')}
      onOpenDailyRewards={() => setGameMode('dailyRewards')}
      onOpenMysteryBox={() => setGameMode('mysteryBox')}
      canClaimMysteryBox={canClaimMysteryBox}
      activeEvent={activeEvent}
    />;
  }

  if (gameMode === 'store') {
    return <QuizStore onClose={() => {
      setGameMode('menu');
      loadStoreInventory();
    }} />;
  }

  if (gameMode === 'modeSelect') {
    return <GameModeSelector 
      onSelectMode={(mode: GameMode, config?: any) => {
        setSelectedGameMode(mode);
        startNewQuiz(mode, config);
      }}
      onBack={() => setGameMode('menu')}
    />;
  }

  if (gameMode === 'mysteryBox') {
    return <MysteryBoxPanel onClose={() => {
      setGameMode('menu');
      loadStoreInventory();
      setCanClaimMysteryBox(mysteryBoxSystem.canClaimDailyBox());
    }} />;
  }

  if (gameMode === 'dailyRewards') {
    return <DailyRewards onClose={() => {
      setGameMode('menu');
      setStats(quizManager.getStats());
    }} />;
  }

  if (gameMode === 'achievements') {
    return (
      <LayoutManager>
        <div className="min-h-screen bg-background">
          <AppBar title="Achievements" showBack />
          <div className="max-w-lg mx-auto p-4">
            <AchievementDisplay />
          </div>
        </div>
      </LayoutManager>
    );
  }

  if (gameMode === 'playing' && gameState.questions.length === 0) {
    return (
      <LayoutManager>
        <div className="min-h-screen bg-background">
          <AppBar title="Islamic Quiz" showBack />
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
          </div>
        </div>
      </LayoutManager>
    );
  }

  const question = gameState.questions[gameState.currentQuestion];
  const progress = gameState.quizMode === 'timeAttack' || gameState.quizMode === 'survival'
    ? 0 // No progress bar for infinite modes
    : ((gameState.currentQuestion + 1) / gameState.questions.length) * 100;
  
  // Timer progress
  const timerProgress = question?.timeLimit ? ((question.timeLimit - gameState.timeLeft) / question.timeLimit) * 100 : 0;

  return (
    <LayoutManager>
      <div className="min-h-screen bg-background">
        <AppBar title="Islamic Quiz" showBack />
      
        <div className="max-w-lg mx-auto p-4 space-y-4">
          {!quizComplete ? (
            <>
              {/* Header with Stats */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Trophy className="w-4 h-4 text-primary" />
                      <span className="font-bold">{gameState.score}</span>
                      <span className="text-sm text-muted-foreground">points</span>
                    </div>
                    <ComboDisplay 
                      combo={combo}
                      multiplier={comboMultiplier}
                      isActive={combo > 0}
                    />
                  </div>
                  
                  {/* Timer Bar */}
                  <div className="mb-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-muted-foreground">Time Remaining</span>
                      <span className={`text-xs font-bold ${gameState.timeLeft <= 10 ? 'text-red-500' : 'text-primary'}`}>
                        {gameState.timeLeft}s
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all duration-1000 ${
                          gameState.timeLeft <= 10 ? 'bg-red-500' : 'bg-primary'
                        }`}
                        style={{ width: `${100 - timerProgress}%` }}
                      />
                    </div>
                  </div>
                  
                  {/* Progress Bar (hidden for time attack and survival) */}
                  {gameState.quizMode !== 'timeAttack' && gameState.quizMode !== 'survival' && (
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-muted-foreground">
                          Question {gameState.currentQuestion + 1} of {gameState.questions.length}
                        </span>
                      </div>
                      <Progress value={progress} className="h-2" />
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Power-ups from Store Inventory */}
              <Card>
                <CardContent className="p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Zap className="w-4 h-4 text-yellow-500" />
                    <span className="text-sm font-medium">Your Power-ups</span>
                    <Badge variant="outline" className="ml-auto text-xs">
                      {Object.values(storeInventory).reduce((a, b) => a + b, 0)} items
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(storeInventory)
                      .filter(([_, count]) => count > 0)
                      .slice(0, 4) // Show max 4 power-ups
                      .map(([itemId, count]) => {
                        const item = getStoreItemById(itemId);
                        if (!item) return null;
                        return (
                          <Button
                            key={itemId}
                            size="sm"
                            variant="outline"
                            onClick={() => handleUsePowerUp(itemId)}
                            disabled={gameState.usedPowerUps.includes(itemId)}
                            className="flex items-center gap-1 text-xs"
                          >
                            <span>{item.icon}</span>
                            <span>{item.name}</span>
                            <Badge variant="secondary" className="ml-1 h-4 text-[10px]">
                              {count}
                            </Badge>
                          </Button>
                        );
                      })}
                    {Object.keys(storeInventory).length === 0 && (
                      <p className="text-xs text-muted-foreground">
                        No power-ups. Visit the store to buy some!
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Question */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Lightbulb className="w-3 h-3" />
                      <span>{QUIZ_CATEGORIES.find(c => c.id === question.category)?.name}</span>
                    </div>
                    <Badge variant={question.difficulty === 'easy' ? 'secondary' : 
                                   question.difficulty === 'medium' ? 'default' : 'destructive'}>
                      {question.difficulty}
                    </Badge>
                  </div>
                  <CardTitle className="text-lg">{question.question}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {question.options.map((option, index) => {
                    let buttonClass = "w-full justify-start text-left h-auto py-3 px-4";
                    
                    if (gameState.showResult) {
                      if (index === question.correctAnswer) {
                        buttonClass += " bg-green-100 border-green-500 text-green-700";
                      } else if (index === gameState.selectedAnswer && index !== question.correctAnswer) {
                        buttonClass += " bg-red-100 border-red-500 text-red-700";
                      }
                    }
                    
                    return (
                      <Button
                        key={index}
                        variant="outline"
                        className={buttonClass}
                        onClick={() => handleAnswer(index)}
                        disabled={gameState.showResult}
                      >
                        <div className="flex items-center gap-3">
                          <span className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold">
                            {String.fromCharCode(65 + index)}
                          </span>
                          <span>{option}</span>
                          {gameState.showResult && index === question.correctAnswer && (
                            <CheckCircle className="w-4 h-4 ms-auto text-green-600" />
                          )}
                          {gameState.showResult && index === gameState.selectedAnswer && index !== question.correctAnswer && (
                            <XCircle className="w-4 h-4 ms-auto text-red-600" />
                          )}
                        </div>
                      </Button>
                    );
                  })}
                </CardContent>
              </Card>

              {/* Explanation */}
              {gameState.showResult && (
                <Card className="bg-primary/5 border-primary/20">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <Lightbulb className="w-5 h-5 text-primary mt-0.5" />
                      <div>
                        <p className="font-medium text-sm mb-1">Explanation</p>
                        <p className="text-sm text-muted-foreground">{question.explanation}</p>
                        <p className="text-xs text-primary mt-2">+{question.points} points</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Next Button */}
              {gameState.showResult && (
                <Button onClick={nextQuestion} className="w-full">
                  {gameState.currentQuestion < gameState.questions.length - 1 ? 'Next Question' : 'See Results'}
                </Button>
              )}
            </>
          ) : (
            <QuizResults 
              stats={stats!}
              score={gameState.score}
              totalQuestions={gameState.questions.length}
              onPlayAgain={startNewQuiz}
              onBackToMenu={() => setGameMode('menu')}
              newAchievements={newAchievements}
              showAchievements={showAchievements}
              setShowAchievements={setShowAchievements}
            />
          )}
        </div>
      </div>
    </LayoutManager>
  );
}

// Quiz Menu Component
function QuizMenu({ 
  onStartQuiz, 
  onSelectMode,
  selectedCategory, 
  setSelectedCategory, 
  selectedDifficulty, 
  setSelectedDifficulty,
  stats,
  setStats,
  powerUps,
  storeInventory,
  onShowAchievements,
  onOpenStore,
  onOpenDailyRewards,
  onOpenMysteryBox,
  canClaimMysteryBox,
  activeEvent
}: any) {
  const dailyStatus = quizStore.getDailyRewardStatus();
  const canClaimDaily = dailyStatus.canClaimToday;

  return (
    <LayoutManager>
      <div className="min-h-screen bg-background">
        <AppBar title="Islamic Quiz" showBack />
        
        {/* Loss Aversion Banner */}
        <LossAversionBanner 
          onAction={(type: string) => {
            if (type === 'lives') {
              // Handle lives action
            } else if (type === 'streak' || type === 'daily_reward') {
              onOpenDailyRewards();
            } else if (type === 'event') {
              onSelectMode();
            } else if (type === 'mystery_box') {
              onOpenMysteryBox();
            }
          }}
        />
        
        {/* Floating Notification */}
        <FloatingNotification onClick={() => onSelectMode()} />
        
        {/* Motivation Toast */}
        <MotivationToast />
        
        <div className="max-w-lg mx-auto p-4 space-y-4">
          {/* Player Stats with Lives */}
          {stats && (
            <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Crown className="w-5 h-5 text-primary" />
                    <span className="font-bold">Level {stats.level}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <LivesCompact />
                    <div className="flex items-center gap-1 px-2 py-1 bg-yellow-100 rounded-full">
                      <Star className="w-3 h-3 text-yellow-600" />
                      <span className="text-xs font-bold text-yellow-700">{stats.xp}</span>
                    </div>
                  </div>
                </div>
                <Progress value={quizManager.getLevelProgress().progress} className="h-2 mb-2" />
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div>
                    <p className="font-bold text-primary">{stats.totalGames}</p>
                    <p className="text-muted-foreground">Games</p>
                  </div>
                  <div>
                    <p className="font-bold text-primary">{stats.bestStreak}</p>
                    <p className="text-muted-foreground">Best Streak</p>
                  </div>
                  <div>
                    <p className="font-bold text-primary">{stats.dailyStreak}</p>
                    <p className="text-muted-foreground">Daily Streak</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Active Event Banner */}
          {activeEvent && (
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
            >
              <Card className={`bg-gradient-to-r ${activeEvent.color} text-white overflow-hidden`}>
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{activeEvent.icon}</span>
                      <div>
                        <p className="font-bold text-sm">{activeEvent.title}</p>
                        <p className="text-xs opacity-90">{activeEvent.multiplier}x XP Active!</p>
                      </div>
                    </div>
                    <Badge className="bg-white/20 text-white">
                      {timeEventsSystem.getTimeRemaining()}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Category Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Select Category</CardTitle>
              <CardDescription>Choose your area of knowledge</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {QUIZ_CATEGORIES.filter(c => c.unlocked).map(category => (
                <Button
                  key={category.id}
                  variant={selectedCategory === category.id ? "default" : "outline"}
                  onClick={() => setSelectedCategory(category.id)}
                  className="w-full justify-start"
                >
                  <span className="mr-2">{category.icon}</span>
                  <span>{category.name}</span>
                  {stats?.categoryMastery[category.id] && (
                    <Badge variant="secondary" className="ml-auto">
                      {stats.categoryMastery[category.id]}%
                    </Badge>
                  )}
                </Button>
              ))}
            </CardContent>
          </Card>

          {/* Difficulty Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Difficulty</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {['all', 'easy', 'medium', 'hard'].map(difficulty => (
                <Button
                  key={difficulty}
                  variant={selectedDifficulty === difficulty ? "default" : "outline"}
                  onClick={() => setSelectedDifficulty(difficulty)}
                  className="w-full justify-start capitalize"
                >
                  {difficulty === 'all' ? 'All Difficulties' : difficulty}
                </Button>
              ))}
            </CardContent>
          </Card>

          {/* Lives Display */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Heart className="w-5 h-5 text-red-500" />
                Lives
              </CardTitle>
            </CardHeader>
            <CardContent>
              <LivesDisplay onRefill={() => setStats(quizManager.getStats())} />
            </CardContent>
          </Card>

          {/* Power-ups */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Zap className="w-5 h-5 text-yellow-500" />
                Power-ups
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {powerUps.map(powerUp => (
                <div key={powerUp.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span>{powerUp.icon}</span>
                    <span className="text-sm">{powerUp.name}</span>
                  </div>
                  <Badge variant={powerUp.uses > 0 ? "default" : "secondary"}>
                    {powerUp.uses}/{powerUp.maxUses}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Store, Rewards & Mystery Box */}
          <div className="grid grid-cols-3 gap-2">
            <Button 
              onClick={onOpenStore} 
              variant="outline" 
              className="w-full bg-gradient-to-r from-amber-50 to-yellow-50 hover:from-amber-100 hover:to-yellow-100"
            >
              <Store className="w-4 h-4 mr-1 text-amber-500" />
              <span className="text-amber-700 text-xs">Store</span>
            </Button>
            <Button 
              onClick={onOpenDailyRewards} 
              variant="outline" 
              className={`w-full ${canClaimDaily ? 'animate-pulse bg-gradient-to-r from-green-50 to-emerald-50' : ''}`}
            >
              <Calendar className={`w-4 h-4 mr-1 ${canClaimDaily ? 'text-green-500' : ''}`} />
              <span className={canClaimDaily ? 'text-green-700 font-semibold text-xs' : 'text-xs'}>
                {canClaimDaily ? 'Daily!' : 'Daily'}
              </span>
            </Button>
            <Button 
              onClick={onOpenMysteryBox} 
              variant="outline" 
              className={`w-full ${canClaimMysteryBox ? 'animate-pulse bg-gradient-to-r from-purple-50 to-pink-50' : ''}`}
            >
              <GiftIcon className={`w-4 h-4 mr-1 ${canClaimMysteryBox ? 'text-purple-500' : ''}`} />
              <span className={canClaimMysteryBox ? 'text-purple-700 font-semibold text-xs' : 'text-xs'}>
                {canClaimMysteryBox ? 'Box!' : 'Box'}
              </span>
            </Button>
          </div>

          {/* Game Mode Selection */}
          <Card className="border-2 border-primary/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                Select Game Mode
              </CardTitle>
              <CardDescription>Choose how you want to play</CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={onSelectMode}
                className="w-full"
                variant="default"
              >
                <Target className="w-4 h-4 mr-2" />
                Choose Game Mode
                <ChevronRight className="w-4 h-4 ml-auto" />
              </Button>
            </CardContent>
          </Card>

          {/* Achievements Button */}
          <Button onClick={onShowAchievements} variant="outline" className="w-full">
            <Trophy className="w-4 h-4 mr-2" />
            View Achievements
          </Button>

          {/* Quick Start Button */}
          <Button onClick={() => onStartQuiz('classic')} className="w-full" size="lg">
            <Target className="w-4 h-4 mr-2" />
            Quick Start (Classic)
          </Button>
        </div>
      </div>
    </LayoutManager>
  );
}

// Quiz Results Component
function QuizResults({ 
  stats, 
  score, 
  totalQuestions, 
  onPlayAgain, 
  onBackToMenu,
  newAchievements,
  showAchievements,
  setShowAchievements 
}: any) {
  const accuracy = totalQuestions > 0 ? Math.round((score / totalQuestions) * 100) : 0;
  const xpEarned = score * 10 + (score === totalQuestions ? 50 : 0);
  
  return (
    <div className="space-y-4">
      <Card className="overflow-hidden">
        <div className="bg-gradient-to-br from-primary/20 via-primary/10 to-transparent p-8 text-center">
          <Award className="w-16 h-16 mx-auto text-primary mb-4" />
          <h2 className="text-2xl font-bold mb-2">Quiz Complete!</h2>
          <p className="text-4xl font-bold text-primary mb-2">
            {score} / {totalQuestions}
          </p>
          <p className="text-sm text-muted-foreground mb-4">
            {accuracy >= 90 ? "Excellent! Ma sha Allah!" : 
             accuracy >= 70 ? "Good job! Keep learning!" : 
             accuracy >= 50 ? "Nice effort! Review and try again!" : 
             "Keep studying! You'll improve!"}
          </p>
          <div className="flex items-center justify-center gap-4 text-sm">
            <div className="flex items-center gap-1">
              <Star className="w-4 h-4 text-yellow-500" />
              <span>+{xpEarned} XP</span>
            </div>
            <div className="flex items-center gap-1">
              <TrendingUp className="w-4 h-4 text-green-500" />
              <span>{accuracy}% Accuracy</span>
            </div>
          </div>
        </div>
      </Card>

      {/* New Achievements */}
      {newAchievements.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gift className="w-5 h-5 text-yellow-500" />
              New Achievements!
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {newAchievements.map(achievement => (
              <div key={achievement.id} className="flex items-center gap-3 p-2 bg-yellow-50 rounded-lg">
                <span className="text-2xl">{achievement.icon}</span>
                <div>
                  <p className="font-medium">{achievement.name}</p>
                  <p className="text-xs text-muted-foreground">{achievement.description}</p>
                </div>
                <Badge variant="secondary" className="ml-auto">
                  +{achievement.points} XP
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Stats Overview */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-primary">{stats.totalGames}</p>
              <p className="text-xs text-muted-foreground">Total Games</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-primary">{stats.level}</p>
              <p className="text-xs text-muted-foreground">Current Level</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-primary">{stats.bestStreak}</p>
              <p className="text-xs text-muted-foreground">Best Streak</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-primary">{stats.dailyStreak}</p>
              <p className="text-xs text-muted-foreground">Daily Streak</p>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button onClick={onPlayAgain} className="flex-1">
              <RotateCcw className="w-4 h-4 mr-2" />
              Play Again
            </Button>
            <Button onClick={onBackToMenu} variant="outline" className="flex-1">
              Back to Menu
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
