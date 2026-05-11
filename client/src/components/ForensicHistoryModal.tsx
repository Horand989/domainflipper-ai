import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle2, Shield, TrendingUp } from "lucide-react";

interface ForensicHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: {
    finalTier: "Tier 1" | "Tier 2" | "Tier 3" | "Tier 4";
    riskLevel: "Safe" | "Moderate" | "Critical";
    primaryIdentity: string;
    badges: string[];
    reasoning: string;
    evidence: string;
    historicalSnapshots: { year: number; content: string }[];
  } | null;
  domainName: string;
}

const tierConfig = {
  "Tier 1": {
    label: "🏆 GOLD - High Trust",
    color: "bg-yellow-500 text-white",
    icon: Shield,
    description: "Official government, educational, or registered non-profit",
  },
  "Tier 2": {
    label: "🥈 SILVER - Legitimate Business",
    color: "bg-gray-400 text-white",
    icon: CheckCircle2,
    description: "Consistent SMB, niche expert blog, or personal portfolio",
  },
  "Tier 3": {
    label: "🥉 BRONZE - Low Value",
    color: "bg-orange-500 text-white",
    icon: TrendingUp,
    description: "Generic directories, thin affiliate sites, or content farms",
  },
  "Tier 4": {
    label: "⚠️ TOXIC - Burned/Spam",
    color: "bg-red-600 text-white",
    icon: AlertTriangle,
    description: "Gambling, adult, pharma, PBNs, or hacked sites",
  },
};

const riskConfig = {
  Safe: { color: "bg-green-100 text-green-800", label: "Safe to Purchase" },
  Moderate: { color: "bg-yellow-100 text-yellow-800", label: "Proceed with Caution" },
  Critical: { color: "bg-red-100 text-red-800", label: "High Risk - Not Recommended" },
};

export function ForensicHistoryModal({
  isOpen,
  onClose,
  result,
  domainName,
}: ForensicHistoryModalProps) {
  if (!result) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Forensic History Analysis</DialogTitle>
          </DialogHeader>
          <div className="text-center py-8">
            <p className="text-muted-foreground">No analysis data available for {domainName}</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const tier = tierConfig[result.finalTier];
  const risk = riskConfig[result.riskLevel];
  const TierIcon = tier.icon;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Forensic History Analysis</DialogTitle>
          <p className="text-sm text-muted-foreground">{domainName}</p>
        </DialogHeader>

        <div className="space-y-6">
          {/* Tier Classification */}
          <div className={`rounded-lg p-6 ${tier.color}`}>
            <div className="flex items-center gap-3 mb-2">
              <TierIcon className="h-8 w-8" />
              <h3 className="text-2xl font-bold">{tier.label}</h3>
            </div>
            <p className="text-sm opacity-90">{tier.description}</p>
          </div>

          {/* Risk Level */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Risk Level:</span>
            <Badge className={risk.color}>{risk.label}</Badge>
          </div>

          {/* Primary Identity */}
          <div>
            <h4 className="text-sm font-medium mb-2">Primary Identity</h4>
            <p className="text-muted-foreground">{result.primaryIdentity}</p>
          </div>

          {/* Badges */}
          {result.badges.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-2">Detection Badges</h4>
              <div className="flex flex-wrap gap-2">
                {result.badges.map((badge, index) => (
                  <Badge key={index} variant="outline">
                    {badge}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Reasoning */}
          <div>
            <h4 className="text-sm font-medium mb-2">Analysis Reasoning</h4>
            <p className="text-sm text-muted-foreground leading-relaxed">{result.reasoning}</p>
          </div>

          {/* Evidence */}
          <div>
            <h4 className="text-sm font-medium mb-2">Evidence Found</h4>
            <div className="bg-muted p-4 rounded-lg">
              <p className="text-sm font-mono">{result.evidence}</p>
            </div>
          </div>

          {/* Historical Timeline */}
          {result.historicalSnapshots.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-3">Historical Timeline</h4>
              <div className="space-y-3">
                {result.historicalSnapshots.map((snapshot, index) => (
                  <div key={index} className="border-l-2 border-primary pl-4">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-primary">{snapshot.year}</span>
                      <Badge variant="secondary" className="text-xs">
                        Snapshot {index + 1}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {snapshot.content}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recommendation */}
          <div
            className={`rounded-lg p-4 border-2 ${
              result.riskLevel === "Critical"
                ? "border-red-500 bg-red-50"
                : result.riskLevel === "Moderate"
                ? "border-yellow-500 bg-yellow-50"
                : "border-green-500 bg-green-50"
            }`}
          >
            <h4 className="font-semibold mb-2">
              {result.riskLevel === "Critical"
                ? "⚠️ Not Recommended"
                : result.riskLevel === "Moderate"
                ? "⚡ Proceed with Caution"
                : "✅ Safe to Purchase"}
            </h4>
            <p className="text-sm">
              {result.riskLevel === "Critical"
                ? "This domain has a toxic history and is not recommended for purchase. It may have been used for spam, gambling, adult content, or other harmful activities that could negatively impact your SEO."
                : result.riskLevel === "Moderate"
                ? "This domain has some concerns in its history. Conduct additional due diligence before purchasing. Check current backlinks and Google index status."
                : "This domain has a clean history with no major red flags. It appears to be safe for purchase and should not negatively impact your SEO efforts."}
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
