/**
 * PremiumLock Component
 * 
 * Displays a lock icon or blurred content for premium features.
 * Opens upgrade modal when clicked.
 */

import { Lock } from "lucide-react";
import { useState } from "react";
import { UpgradeModal } from "./UpgradeModal";

interface PremiumLockProps {
  /** Feature name for analytics tracking */
  feature: string;
  /** Display mode: 'icon' shows lock icon, 'blur' shows blurred placeholder */
  mode?: "icon" | "blur";
  /** Custom blur text (default: "*****") */
  blurText?: string;
  /** Custom className for styling */
  className?: string;
  /** Inline mode (no button wrapper) */
  inline?: boolean;
}

export function PremiumLock({
  feature,
  mode = "icon",
  blurText = "*****",
  className = "",
  inline = false,
}: PremiumLockProps) {
  const [showModal, setShowModal] = useState(false);

  const handleClick = () => {
    setShowModal(true);
    // Track which feature triggered the upgrade modal
    console.log(`[Premium Lock] User clicked on: ${feature}`);
  };

  if (mode === "blur") {
    return (
      <>
        <button
          onClick={handleClick}
          className={`relative cursor-pointer transition-all hover:opacity-80 ${className}`}
          title="Upgrade to PRO to unlock"
        >
          <span className="blur-sm select-none text-gray-400">
            {blurText}
          </span>
          <Lock className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 text-indigo-600" />
        </button>
        <UpgradeModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          feature={feature}
        />
      </>
    );
  }

  // Icon mode
  if (inline) {
    return (
      <>
        <button
          onClick={handleClick}
          className={`inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-700 transition-colors ${className}`}
          title="Upgrade to PRO to unlock"
        >
          <Lock className="w-4 h-4" />
        </button>
        <UpgradeModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          feature={feature}
        />
      </>
    );
  }

  return (
    <>
      <button
        onClick={handleClick}
        className={`flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors ${className}`}
        title="Upgrade to PRO to unlock"
      >
        <Lock className="w-4 h-4" />
        <span className="text-sm font-medium">PRO</span>
      </button>
      <UpgradeModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        feature={feature}
      />
    </>
  );
}

/**
 * Locked Value Component
 * 
 * Shows a blurred value with lock icon overlay
 */
interface LockedValueProps {
  feature: string;
  placeholder?: string;
  className?: string;
}

export function LockedValue({
  feature,
  placeholder = "••••",
  className = "",
}: LockedValueProps) {
  return (
    <PremiumLock
      feature={feature}
      mode="blur"
      blurText={placeholder}
      className={className}
    />
  );
}

/**
 * Locked Badge Component
 * 
 * Small lock icon badge for inline use
 */
interface LockedBadgeProps {
  feature: string;
  className?: string;
}

export function LockedBadge({ feature, className = "" }: LockedBadgeProps) {
  return (
    <PremiumLock
      feature={feature}
      mode="icon"
      inline
      className={className}
    />
  );
}
