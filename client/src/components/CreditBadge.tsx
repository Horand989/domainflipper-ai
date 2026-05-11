import { Coins, Zap } from "lucide-react";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";

export function CreditBadge() {
  const { data: balance, isLoading } = trpc.pricing.getBalance.useQuery();

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-full animate-pulse">
        <div className="w-16 h-4 bg-muted-foreground/20 rounded"></div>
      </div>
    );
  }

  const isFree = balance?.tier === "FREE";
  const credits = balance?.credits || 0;

  return (
    <div className="flex items-center gap-2">
      {/* Tier Badge */}
      <Badge 
        variant={isFree ? "secondary" : "default"}
        className={`${
          isFree 
            ? "bg-gray-100 text-gray-800 border-gray-300" 
            : "bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0"
        }`}
      >
        {isFree ? (
          <>
            <Zap className="w-3 h-3 mr-1" />
            Free
          </>
        ) : (
          <>
            <Zap className="w-3 h-3 mr-1 fill-current" />
            Pro
          </>
        )}
      </Badge>

      {/* Credits Display */}
      <Link href="/pricing">
        <Button 
          variant="outline" 
          size="sm"
          className="h-8 gap-1.5 hover:bg-primary/5"
        >
          <Coins className="w-4 h-4 text-amber-500" />
          <span className="font-semibold">{credits}</span>
          <span className="text-muted-foreground text-xs">credits</span>
        </Button>
      </Link>
    </div>
  );
}
