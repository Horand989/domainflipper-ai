import { Clock, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import { Alert, AlertDescription } from "./ui/alert";
import { Progress } from "./ui/progress";
import { Button } from "./ui/button";
import { Link } from "wouter";

interface CooldownTimerProps {
  nextAvailableAt: Date;
  onExpire?: () => void;
}

export function CooldownTimer({ nextAvailableAt, onExpire }: CooldownTimerProps) {
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    const updateTimer = () => {
      const now = new Date().getTime();
      const target = nextAvailableAt.getTime();
      const diff = target - now;

      if (diff <= 0) {
        setTimeRemaining(0);
        setIsExpired(true);
        onExpire?.();
      } else {
        setTimeRemaining(diff);
      }
    };

    // Update immediately
    updateTimer();

    // Update every second
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [nextAvailableAt, onExpire]);

  const formatTime = (ms: number): string => {
    const totalSeconds = Math.ceil(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const getProgressPercentage = (): number => {
    const totalCooldown = 5 * 60 * 1000; // 5 minutes in ms
    const elapsed = totalCooldown - timeRemaining;
    return Math.min(100, Math.max(0, (elapsed / totalCooldown) * 100));
  };

  if (isExpired) {
    return null;
  }

  return (
    <Alert className="border-amber-200 bg-amber-50">
      <div className="flex items-start gap-3">
        <div className="p-2 bg-amber-100 rounded-full shrink-0">
          <Clock className="w-5 h-5 text-amber-600" />
        </div>
        
        <div className="flex-1 space-y-3">
          <div className="flex items-center justify-between gap-4">
            <AlertDescription className="text-amber-900 m-0">
              <span className="font-semibold">Free tier cooldown active.</span> Next scan available in:
            </AlertDescription>
            
            <div className="flex items-center gap-3">
              <span className="text-2xl font-bold text-amber-600 tabular-nums">
                {formatTime(timeRemaining)}
              </span>
              
              <Link href="/pricing">
                <Button size="sm" variant="outline" className="shrink-0">
                  <Zap className="w-4 h-4 mr-1.5" />
                  Upgrade to Pro
                </Button>
              </Link>
            </div>
          </div>

          <div className="space-y-1.5">
            <Progress value={getProgressPercentage()} className="h-2" />
            <p className="text-xs text-muted-foreground">
              Pro users get unlimited instant scans with no waiting
            </p>
          </div>
        </div>
      </div>
    </Alert>
  );
}
