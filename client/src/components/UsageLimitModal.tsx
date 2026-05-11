import { AlertCircle, Clock, Zap } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Link } from "wouter";

interface UsageLimitModalProps {
  open: boolean;
  onClose: () => void;
  nextAvailableAt?: Date;
}

export function UsageLimitModal({ open, onClose, nextAvailableAt }: UsageLimitModalProps) {
  const formatTimeRemaining = (date: Date) => {
    const now = new Date();
    const diff = date.getTime() - now.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-amber-100 rounded-full">
              <AlertCircle className="w-6 h-6 text-amber-600" />
            </div>
            <DialogTitle>Free Tier Limit Reached</DialogTitle>
          </div>
          <DialogDescription className="text-left">
            Please wait before your next free scan. Free tier users can analyze 1 domain every 5 minutes to prevent abuse.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {nextAvailableAt && (
            <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
              <Clock className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Next scan available in</p>
                <p className="text-lg font-bold text-primary">
                  {formatTimeRemaining(nextAvailableAt)}
                </p>
              </div>
            </div>
          )}

          <div className="border-t pt-4">
            <h4 className="font-semibold mb-3 flex items-center gap-2">
              <Zap className="w-4 h-4 text-purple-500" />
              Upgrade to Pro for:
            </h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span>Unlimited domain analysis</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span>Credit-based bulk uploads</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span>Priority processing</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span>Advanced features</span>
              </li>
            </ul>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={onClose} className="w-full sm:w-auto">
            Close
          </Button>
          <Link href="/pricing">
            <Button className="w-full sm:w-auto bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600">
              Upgrade to Pro
            </Button>
          </Link>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
