import { useState, useEffect } from "react";
import { Joyride } from "react-joyride";
import { trpc } from "@/lib/trpc";

interface OnboardingProps {
  run?: boolean;
  onComplete?: () => void;
}

export default function Onboarding({ run = false, onComplete }: OnboardingProps) {
  const [runTour, setRunTour] = useState(run);
  
  const { data: settings } = trpc.settings.get.useQuery();
  const updateSettings = trpc.settings.update.useMutation();

  useEffect(() => {
    setRunTour(run);
  }, [run]);

  const steps: any[] = [
    {
      target: "body",
      content: (
        <div className="space-y-3">
          <h2 className="text-2xl font-bold text-purple-900">Welcome to FlipandSift! 🎉</h2>
          <p className="text-gray-700">
            Let me show you how to find the perfect expired domain for your website in just a few simple steps.
          </p>
          <p className="text-sm text-gray-600">
            This tour will take about 2 minutes. You can skip it anytime by pressing ESC.
          </p>
        </div>
      ),
      placement: "center",
    },
    {
      target: '[href="/projects"]',
      content: (
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-purple-900">Step 1: Create a Project</h3>
          <p className="text-gray-700">
            Start by creating a project that describes your website idea, niche, and target audience.
          </p>
          <p className="text-sm text-gray-600">
            Our AI will analyze your requirements and suggest relevant domain names to search for.
          </p>
        </div>
      ),
      placement: "right",
    },
    {
      target: '[href="/analysis"]',
      content: (
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-purple-900">Step 2: Upload SpamZilla Screenshot</h3>
          <p className="text-gray-700">
            Take a screenshot of SpamZilla search results and upload it here.
          </p>
          <p className="text-sm text-gray-600">
            Our OCR technology will automatically extract domain metrics like Trust Flow, Citation Flow, and more.
          </p>
        </div>
      ),
      placement: "right",
    },
    {
      target: "body",
      content: (
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-purple-900">Step 3: AI Analysis</h3>
          <p className="text-gray-700">
            Our AI will analyze all extracted domains and rank them based on:
          </p>
          <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
            <li>Trust Flow and Citation Flow ratio</li>
            <li>Domain age and authority</li>
            <li>Topical relevance (Sherlock Check)</li>
            <li>SEO potential and backlink quality</li>
          </ul>
          <p className="text-sm text-gray-600 mt-2">
            You'll get the top 5 domain recommendations with detailed explanations.
          </p>
        </div>
      ),
      placement: "center",
    },
    {
      target: "body",
      content: (
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-purple-900">Step 4: Check Availability</h3>
          <p className="text-gray-700">
            Click "Check Availability" on any domain card to see real-time pricing from multiple registrars:
          </p>
          <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
            <li>Namecheap</li>
            <li>GoDaddy</li>
            <li>Porkbun (with full pricing details)</li>
            <li>Hostinger</li>
          </ul>
          <p className="text-sm text-gray-600 mt-2">
            Compare prices and choose the best deal!
          </p>
        </div>
      ),
      placement: "center",
    },
    {
      target: "body",
      content: (
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-purple-900">Step 5: Extract Keywords</h3>
          <p className="text-gray-700">
            Click "Extract Keywords" to analyze the domain's historical content from Archive.org.
          </p>
          <p className="text-sm text-gray-600">
            Get 50 primary keywords and 50 long-tail keywords that you can use for your SEO strategy.
          </p>
          <p className="text-sm text-gray-600">
            Export keywords to CSV for easy integration with your content planning tools.
          </p>
        </div>
      ),
      placement: "center",
    },
    {
      target: '[href="/settings"]',
      content: (
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-purple-900">Configure API Keys</h3>
          <p className="text-gray-700">
            Before checking availability, add your registrar API keys in Settings.
          </p>
          <p className="text-sm text-gray-600">
            You can add keys for Namecheap, GoDaddy, Porkbun, and Hostinger to get real-time pricing.
          </p>
        </div>
      ),
      placement: "left",
    },
    {
      target: "body",
      content: (
        <div className="space-y-3">
          <h2 className="text-2xl font-bold text-purple-900">You're All Set! 🚀</h2>
          <p className="text-gray-700">
            You now know how to use FlipandSift to find the perfect expired domain.
          </p>
          <p className="text-sm text-gray-600">
            Start by creating a project or uploading a SpamZilla screenshot. Happy domain hunting!
          </p>
        </div>
      ),
      placement: "center",
    },
  ];

  const handleJoyrideCallback = (data: any) => {
    const { status } = data;
    if (status === "finished" || status === "skipped") {
      setRunTour(false);
      
      // Mark onboarding as completed
      if (settings && settings.onboardingCompleted === 0) {
        updateSettings.mutate({ onboardingCompleted: 1 });
      }
      
      if (onComplete) {
        onComplete();
      }
    }
  };

  const JoyrideAny = Joyride as any;
  return (
    <JoyrideAny
      steps={steps}
      run={runTour}
      continuous
      showProgress
      showSkipButton
      callback={handleJoyrideCallback}
      styles={{ options: { primaryColor: "#9333ea", zIndex: 10000 } }}
      locale={{
        back: "Back",
        close: "Close",
        last: "Finish",
        next: "Next",
        skip: "Skip Tour",
      }}
    />
  );
}
