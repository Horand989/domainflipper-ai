import { Coins, TrendingUp } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useState } from "react";

interface BuyCreditsModalProps {
  open: boolean;
  onClose: () => void;
  requiredCredits?: number;
}

export function BuyCreditsModal({ open, onClose, requiredCredits }: BuyCreditsModalProps) {
  const { data: tiers } = trpc.pricing.getTiers.useQuery();
  const checkoutMutation = trpc.pricing.createCheckoutSession.useMutation();
  const utils = trpc.useUtils();
  const [purchasing, setPurchasing] = useState<string | null>(null);

  const handlePurchase = async (packageId: string) => {
    setPurchasing(packageId);
    try {
      const result = await checkoutMutation.mutateAsync({ packageId });
      if (result.checkoutUrl) {
        toast.info("Redirecting to checkout...");
        window.open(result.checkoutUrl, "_blank");
        onClose();
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to create checkout session");
    } finally {
      setPurchasing(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-amber-100 rounded-full">
              <Coins className="w-6 h-6 text-amber-600" />
            </div>
            <DialogTitle>Purchase Credits</DialogTitle>
          </div>
          <DialogDescription className="text-left">
            {requiredCredits ? (
              <>You need {requiredCredits} more credits to complete this action. Choose a credit package below.</>
            ) : (
              <>Credits are used for bulk domain uploads and advanced features. Choose a package that fits your needs.</>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {tiers?.creditPackages.map((pkg) => (
            <Card 
              key={pkg.id}
              className={`cursor-pointer transition-all hover:border-primary ${
                pkg.popular ? "border-primary" : ""
              }`}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-amber-50 rounded-lg">
                      <Coins className="w-6 h-6 text-amber-500" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold">{pkg.name}</h3>
                        {pkg.popular && (
                          <Badge className="bg-primary text-xs">
                            <TrendingUp className="w-3 h-3 mr-1" />
                            Popular
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {pkg.credits} credits • ${pkg.pricePerCredit.toFixed(2)}/credit
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-2xl font-bold">${pkg.price}</p>
                    </div>
                    <Button
                      onClick={() => handlePurchase(pkg.id)}
                      disabled={purchasing === pkg.id}
                      variant={pkg.popular ? "default" : "outline"}
                    >
                      {purchasing === pkg.id ? "Processing..." : "Buy Now"}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
