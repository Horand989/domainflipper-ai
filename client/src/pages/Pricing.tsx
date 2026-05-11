import { Check, Zap, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useState } from "react";
import { getLoginUrl } from "@/const";

export default function Pricing() {
  const { data: userTier } = trpc.user.getTier.useQuery();
  const upgradeMutation = trpc.pricing.upgradeToPro.useMutation();
  
  const [isUpgrading, setIsUpgrading] = useState(false);
  
  const handleUpgrade = async () => {
    setIsUpgrading(true);
    try {
      await upgradeMutation.mutateAsync({});
      toast.success("Upgraded to Pro!");
      window.location.href = "/dashboard";
    } catch (error: any) {
      toast.error(error.message || "Failed to upgrade");
    } finally {
      setIsUpgrading(false);
    }
  };

  const currentTier = userTier?.tier || "FREE";
  const isPro = currentTier === "PRO";

  return (
    <div className="container py-8 max-w-5xl">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">Simple Pricing for Serious Flippers</h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          One profitable domain flip pays for a year of FlipandSift. 
          Start free, upgrade when you're ready.
        </p>
      </div>

      {/* Pricing Cards */}
      <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
        {/* Free */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between mb-2">
              <CardTitle className="text-2xl flex items-center gap-2">
                <Zap className="w-6 h-6" />
                Free Trial
              </CardTitle>
              {currentTier === "FREE" && (
                <Badge variant="secondary">Current Plan</Badge>
              )}
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold">$0</span>
            </div>
            <CardDescription className="mt-2">
              Try before you buy. No credit card required.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <ul className="space-y-3">
              <li className="flex items-start gap-2">
                <Check className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <span>3 domain analyses (lifetime)</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <span>Basic AI scoring</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <span>See top 5 ranked domains</span>
              </li>
              <li className="flex items-start gap-2 text-muted-foreground">
                <span className="w-5 h-5 flex items-center justify-center">×</span>
                <span>No Sherlock Check</span>
              </li>
              <li className="flex items-start gap-2 text-muted-foreground">
                <span className="w-5 h-5 flex items-center justify-center">×</span>
                <span>No watchlist</span>
              </li>
              <li className="flex items-start gap-2 text-muted-foreground">
                <span className="w-5 h-5 flex items-center justify-center">×</span>
                <span>No due diligence saving</span>
              </li>
            </ul>
          </CardContent>

          <CardFooter>
            <Button variant="outline" className="w-full" asChild>
              <a href={getLoginUrl()}>
                {currentTier === "FREE" ? "Current Plan" : "Get Started"}
              </a>
            </Button>
          </CardFooter>
        </Card>

        {/* Pro */}
        <Card className="border-primary relative">
          <div className="absolute -top-4 left-1/2 -translate-x-1/2">
            <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0">
              <Crown className="w-3 h-3 mr-1" />
              Most Popular
            </Badge>
          </div>
          
          <CardHeader>
            <div className="flex items-center justify-between mb-2">
              <CardTitle className="text-2xl flex items-center gap-2">
                <Crown className="w-6 h-6 text-amber-500" />
                Pro
              </CardTitle>
              {isPro && (
                <Badge variant="secondary">Current Plan</Badge>
              )}
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold">$97</span>
              <span className="text-muted-foreground">/month</span>
            </div>
            <CardDescription className="mt-2">
              For serious domain flippers who want an edge.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <ul className="space-y-3">
              <li className="flex items-start gap-2">
                <Check className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <span className="font-medium">Unlimited domain analyses</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <span className="font-medium">Sherlock Check included</span>
                <span className="text-muted-foreground text-sm ml-1">(spam detection)</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <span className="font-medium">Due diligence checklists</span>
                <span className="text-muted-foreground text-sm ml-1">(8-point verification)</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <span className="font-medium">Full watchlist</span>
                <span className="text-muted-foreground text-sm ml-1">(track purchases & sales)</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <span>Export results (PDF/CSV)</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <span>Priority support</span>
              </li>
            </ul>
          </CardContent>

          <CardFooter>
            {isPro ? (
              <Button variant="outline" className="w-full" disabled>
                Current Plan
              </Button>
            ) : (
              <Button
                className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
                onClick={handleUpgrade}
                disabled={isUpgrading}
              >
                {isUpgrading ? "Upgrading..." : "Upgrade to Pro"}
              </Button>
            )}
          </CardFooter>
        </Card>
      </div>

      {/* FAQ */}
      <div className="max-w-2xl mx-auto mt-16">
        <h2 className="text-2xl font-bold mb-6 text-center">Frequently Asked Questions</h2>
        <div className="space-y-6">
          <div>
            <h3 className="font-semibold mb-2">How is this different from SpamZilla?</h3>
            <p className="text-sm text-muted-foreground">
              SpamZilla shows raw data. FlipandSift analyzes that data with AI, ranks opportunities, 
              and gives you a due diligence checklist. We turn 3 hours of manual work into 60 seconds.
            </p>
          </div>
          
          <div>
            <h3 className="font-semibold mb-2">Do I need a SpamZilla account?</h3>
            <p className="text-sm text-muted-foreground">
              Yes. We analyze screenshots from SpamZilla (or similar marketplaces). 
              We don't replace SpamZilla — we make it 10x faster to use.
            </p>
          </div>
          
          <div>
            <h3 className="font-semibold mb-2">Can I cancel anytime?</h3>
            <p className="text-sm text-muted-foreground">
              Yes. Cancel anytime and keep access until the end of your billing period.
            </p>
          </div>
          
          <div>
            <h3 className="font-semibold mb-2">What if I need team access?</h3>
            <p className="text-sm text-muted-foreground">
              Contact us at support@domainflipper.ai for Agency pricing with team seats.
            </p>
          </div>
        </div>
      </div>

      {/* Guarantee */}
      <div className="max-w-2xl mx-auto mt-12 text-center">
        <p className="text-sm text-muted-foreground">
          30-day money-back guarantee. If FlipandSift doesn't save you time and help you find 
          better domains, we'll refund your payment. No questions asked.
        </p>
      </div>
    </div>
  );
}
