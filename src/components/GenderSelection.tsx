import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { User, UserCircle, UserX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { setGender, type Gender } from "@/lib/gender-settings";
import { useToast } from "@/hooks/use-toast";

interface GenderSelectionProps {
  onComplete: () => void;
}

export function GenderSelection({ onComplete }: GenderSelectionProps) {
  const [selectedGender, setSelectedGender] = useState<Gender | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const genderOptions = [
    {
      value: "male" as Gender,
      label: "Man",
      description: "Male user",
      icon: User,
      color: "from-blue-500/20 to-blue-600/10 border-blue-500/20",
    },
    {
      value: "female" as Gender,
      label: "Woman", 
      description: "Female user",
      icon: UserCircle,
      color: "from-pink-500/20 to-pink-600/10 border-pink-500/20",
    },
    {
      value: "prefer-not-to-say" as Gender,
      label: "Prefer not to say",
      description: "Privacy-focused option",
      icon: UserX,
      color: "from-slate-500/20 to-slate-600/10 border-slate-500/20",
    },
  ];

  const handleSubmit = async () => {
    if (!selectedGender) return;

    setIsSubmitting(true);
    
    try {
      setGender(selectedGender);
      
      toast({
        title: "Welcome to Noor Connect!",
        description: selectedGender === "female" 
          ? "Menstrual mode features are now available for you."
          : "Your preferences have been saved.",
      });
      
      setTimeout(() => {
        onComplete();
      }, 500);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save your preference. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 1.5, duration: 0.5 }}
      className="w-full max-w-md mx-auto px-4"
    >
      <Card className="glass-card border-primary/20">
        <CardContent className="p-6 space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <h2 className="text-xl font-semibold text-foreground">
              Welcome to Noor Connect
            </h2>
            <p className="text-sm text-muted-foreground">
              Please select your gender to personalize your experience
            </p>
          </div>

          {/* Gender Options */}
          <div className="space-y-3">
            {genderOptions.map((option) => {
              const Icon = option.icon;
              const isSelected = selectedGender === option.value;
              
              return (
                <motion.div
                  key={option.value}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Button
                    variant={isSelected ? "default" : "outline"}
                    className={`w-full h-auto p-4 justify-start gap-4 rounded-xl transition-all ${
                      isSelected 
                        ? option.color + " border-primary" 
                        : "border-border/50 hover:border-primary/50"
                    }`}
                    onClick={() => setSelectedGender(option.value)}
                  >
                    <div className={`p-2 rounded-lg ${
                      isSelected 
                        ? "bg-primary/20" 
                        : "bg-muted/50"
                    }`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="text-left flex-1">
                      <p className="font-medium">{option.label}</p>
                      <p className="text-xs text-muted-foreground">
                        {option.description}
                      </p>
                    </div>
                    {isSelected && (
                      <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                    )}
                  </Button>
                </motion.div>
              );
            })}
          </div>

          {/* Submit Button */}
          <Button
            onClick={handleSubmit}
            disabled={!selectedGender || isSubmitting}
            className="w-full gap-2 rounded-xl"
            size="lg"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                Setting up...
              </>
            ) : (
              <>
                Continue
              </>
            )}
          </Button>

          {/* Privacy Note */}
          <div className="text-center">
            <p className="text-xs text-muted-foreground">
              🔒 This information is stored locally on your device and is never shared
            </p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
