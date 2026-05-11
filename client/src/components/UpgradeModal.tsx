/**
 * UpgradeModal Component
 * 
 * Modal that promotes PRO tier subscription when users click locked features.
 * Shows pricing, benefits, and upgrade CTA.
 */

import { X, Check, Zap, TrendingUp, Shield, Infinity } from "lucide-react";
import { useEffect } from "react";

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Feature that triggered the modal (for analytics) */
  feature?: string;
}

export function UpgradeModal({ isOpen, onClose, feature }: UpgradeModalProps) {
  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleUpgrade = () => {
    // TODO: Integrate with Stripe checkout
    console.log(`[Upgrade] User wants to upgrade from feature: ${feature}`);
    alert("Stripe checkout will be integrated here!");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-lg hover:bg-gray-100 transition-colors z-10"
          aria-label="Close modal"
        >
          <X className="w-5 h-5 text-gray-500" />
        </button>

        {/* Header */}
        <div className="bg-gradient-to-br from-indigo-600 to-purple-600 px-8 py-12 text-white">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
              <Zap className="w-8 h-8" />
            </div>
            <h2 className="text-3xl font-bold">Upgrade to PRO</h2>
          </div>
          <p className="text-indigo-100 text-lg">
            Unlock powerful domain intelligence and save 85% on API costs
          </p>
        </div>

        {/* Content */}
        <div className="p-8">
          {/* Pricing */}
          <div className="mb-8 p-6 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl border-2 border-indigo-200">
            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-5xl font-bold text-indigo-600">$49</span>
              <span className="text-gray-600">/month</span>
            </div>
            <p className="text-sm text-gray-600">
              Cancel anytime • 14-day money-back guarantee
            </p>
          </div>

          {/* Features */}
          <div className="space-y-4 mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              What you'll get:
            </h3>

            <Feature
              icon={<TrendingUp className="w-5 h-5" />}
              title="DataForSEO Metrics"
              description="Unlock search volume, keyword difficulty, CPC, and competition data"
            />

            <Feature
              icon={<Shield className="w-5 h-5" />}
              title="Domain Authority Scores"
              description="See DA, Trust Flow, Citation Flow, and backlink counts"
            />

            <Feature
              icon={<Zap className="w-5 h-5" />}
              title="Weekly Pulse Tracking"
              description="Automated index checks and rank tracking every Friday"
            />

            <Feature
              icon={<Infinity className="w-5 h-5" />}
              title="Unlimited Projects"
              description="Create and track as many domain projects as you need"
            />

            <Feature
              icon={<Check className="w-5 h-5" />}
              title="Priority Support"
              description="Get help faster with priority email support"
            />

            <Feature
              icon={<Check className="w-5 h-5" />}
              title="Export Reports"
              description="Download PDF reports and CSV exports"
            />
          </div>

          {/* CTA */}
          <div className="space-y-3">
            <button
              onClick={handleUpgrade}
              className="w-full py-4 px-6 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl"
            >
              Upgrade to PRO Now
            </button>

            <button
              onClick={onClose}
              className="w-full py-3 px-6 text-gray-600 hover:text-gray-900 font-medium transition-colors"
            >
              Maybe later
            </button>
          </div>

          {/* Trust badges */}
          <div className="mt-6 pt-6 border-t border-gray-200 flex items-center justify-center gap-6 text-sm text-gray-500">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              <span>Secure payment</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4" />
              <span>Cancel anytime</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Feature item component for the benefits list
 */
interface FeatureProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

function Feature({ icon, title, description }: FeatureProps) {
  return (
    <div className="flex items-start gap-4">
      <div className="flex-shrink-0 p-2 bg-indigo-100 text-indigo-600 rounded-lg">
        {icon}
      </div>
      <div>
        <h4 className="font-semibold text-gray-900 mb-1">{title}</h4>
        <p className="text-sm text-gray-600">{description}</p>
      </div>
    </div>
  );
}
