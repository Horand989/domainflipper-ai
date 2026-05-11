import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import Navigation from "@/components/Navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { Loader2, Sparkles, ExternalLink, TrendingUp, Target, Users, Lightbulb, Search } from "lucide-react";
import { DomainSuggestionCard } from "@/components/DomainSuggestionCard";
import { getLoginUrl } from "@/const";
import { useParams } from "wouter";
import { toast } from "sonner";
import { useState, useMemo, useEffect } from "react";
import { SuggestionFilterBar, FilterState } from "@/components/SuggestionFilterBar";
import { ForensicHistoryModal } from "@/components/ForensicHistoryModal";
import { MissionChecklist } from "@/components/MissionChecklist";

export default function ProjectDetail() {
  const { user, loading: authLoading } = useAuth();
  const params = useParams<{ id: string }>();
  const projectId = parseInt(params.id || "0");
  const [generatingTab, setGeneratingTab] = useState<"suggestions" | null>(null);
  const [selectedDomainForAvailability, setSelectedDomainForAvailability] = useState<string | null>(null);
  const [availabilityModalOpen, setAvailabilityModalOpen] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    extensions: [],
    maxLength: 50,
    availableOnly: true, // default ON: only show confirmed-available domains
    sortBy: 'none',
  });
  const [availabilityMap, setAvailabilityMap] = useState<Record<string, boolean>>({});
  const [checkingBulkAvailability, setCheckingBulkAvailability] = useState(false);
  const [forensicHistoryModalOpen, setForensicHistoryModalOpen] = useState(false);
  const [selectedDomainForHistory, setSelectedDomainForHistory] = useState<string | null>(null);
  const [forensicResult, setForensicResult] = useState<any>(null);
  const [generatingLaunchStrategy, setGeneratingLaunchStrategy] = useState(false);
  const [activeLaunchPlanId, setActiveLaunchPlanId] = useState<number | null>(null);
  const [customDomain, setCustomDomain] = useState("");

  const utils = trpc.useUtils();

  const { data: project, isLoading: projectLoading } = trpc.projects.get.useQuery(
    { projectId },
    { enabled: !!user && projectId > 0 }
  );

  const { data: suggestionsData, isLoading: suggestionsLoading } = trpc.projects.getSuggestions.useQuery(
    { projectId },
    { enabled: !!user && projectId > 0 }
  );

  // Load existing launch plans
  const { data: existingPlans } = trpc.launchStrategy.listByProject.useQuery(
    { projectId },
    { enabled: !!user && projectId > 0 }
  );

  // Auto-load the most recent active plan
  useEffect(() => {
    if (existingPlans && existingPlans.length > 0 && !activeLaunchPlanId) {
      const activePlan = existingPlans.find((p: any) => p.status === 'active');
      if (activePlan) {
        setActiveLaunchPlanId(activePlan.id);
      }
    }
  }, [existingPlans, activeLaunchPlanId]);

  // All mutations must be defined before any conditional logic
  const generateSuggestions = trpc.projects.generateSuggestions.useMutation({
    onSuccess: () => {
      toast.success("Domain suggestions generated!");
      setGeneratingTab(null);
      utils.projects.getSuggestions.invalidate({ projectId });
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to generate suggestions");
      setGeneratingTab(null);
    },
  });

  const addDomainToProject = trpc.projects.addDomain.useMutation({
    onSuccess: () => {
      toast.success("Domain added to project!");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to add domain");
    },
  });

  const addToWatchlist = trpc.watchlist.addByName.useMutation({
    onSuccess: () => {
      toast.success("Domain added to watchlist!");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to add to watchlist");
    },
  });

  const chooseDomain = trpc.projects.chooseDomain.useMutation({
    onSuccess: () => {
      toast.success("Domain marked as chosen!");
      utils.projects.getDomains.invalidate({ projectId });
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to choose domain");
    },
  });

  const updateTlds = trpc.projects.updateTlds.useMutation({
    onSuccess: () => {
      toast.success("TLD options updated!");
      utils.projects.getDomains.invalidate({ projectId });
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update TLDs");
    },
  });

  const analyzeCompetitor = trpc.projects.analyzeCompetitor.useMutation({
    onSuccess: (data) => {
      toast.success(`Added ${data.gapCount} keywords from competitor analysis!`);
      utils.projects.get.invalidate({ projectId });
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to analyze competitor");
    },
  });

  const { data: availabilityData, isLoading: checkingSingleAvailability } = trpc.domainAvailability.check.useQuery(
    { domain: selectedDomainForAvailability || "" },
    { enabled: !!selectedDomainForAvailability && availabilityModalOpen }
  );

  // Filter and sort suggestions - MUST be before early returns
  const filteredSuggestions = useMemo(() => {
    if (!suggestionsData?.suggestions) return [];
    
    let filtered = suggestionsData.suggestions;

    // Filter by extensions
    if (filters.extensions.length > 0) {
      filtered = filtered.filter((s: any) =>
        filters.extensions.some((ext) => s.suggestedDomain.endsWith(ext))
      );
    }

    // Filter by max length
    if (filters.maxLength < 50) {
      filtered = filtered.filter((s: any) => s.suggestedDomain.length <= filters.maxLength);
    }

    // Filter by availability using real WHOIS data
    if (filters.availableOnly) {
      if (Object.keys(availabilityMap).length > 0) {
        // We have real availability data — filter strictly
        filtered = filtered.filter((s: any) => availabilityMap[s.suggestedDomain] === true);
      }
      // If availability data not yet loaded, show all while checking (spinner shown separately)
    }

    // Sort by selected criteria
    if (filters.sortBy === 'brandScore') {
      filtered = [...filtered].sort((a: any, b: any) => {
        const scoreA = a.brandScore || 0;
        const scoreB = b.brandScore || 0;
        return scoreB - scoreA; // High to low
      });
    } else if (filters.sortBy === 'confidence') {
      filtered = [...filtered].sort((a: any, b: any) => {
        const confA = a.confidence || 0;
        const confB = b.confidence || 0;
        return confB - confA; // High to low
      });
    }

    return filtered;
  }, [suggestionsData?.suggestions, filters, availabilityMap]);

  // Manual bulk availability check function
  const checkBulkAvailability = async () => {
    if (!suggestionsData?.suggestions || suggestionsData.suggestions.length === 0) {
      return;
    }
    
    setCheckingBulkAvailability(true);
    try {
      const domains = suggestionsData.suggestions.map((s: any) => s.suggestedDomain);
      const result = await utils.client.domainAvailability.checkBulk.query({ domains });
      
      const map: Record<string, boolean> = {};
      result.forEach((item: any) => {
        map[item.domain] = item.available;
      });
      setAvailabilityMap(map);
      toast.success(`Checked availability for ${result.length} domains`);
    } catch (error) {
      toast.error("Failed to check domain availability");
    } finally {
      setCheckingBulkAvailability(false);
    }
  };

  // Auto-trigger availability check when suggestions load and filter is on
  useEffect(() => {
    if (filters.availableOnly && Object.keys(availabilityMap).length === 0 && suggestionsData?.suggestions?.length) {
      checkBulkAvailability();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [suggestionsData?.suggestions?.length]);

  // Trigger availability check when "Available Only" filter is enabled
  const handleAvailabilityFilterChange = (newFilters: FilterState) => {
    setFilters(newFilters);
    
    if (newFilters.availableOnly && Object.keys(availabilityMap).length === 0 && suggestionsData) {
      checkBulkAvailability();
    }
  };

  const handleAnalyzeCompetitor = () => {
    if (!project?.competitorUrl) {
      toast.error("No competitor URL provided in project settings");
      return;
    }
    analyzeCompetitor.mutate({ projectId });
  };

  const handleGenerateSuggestions = () => {
    setGeneratingTab("suggestions");
    generateSuggestions.mutate({ projectId });
  };

  const handleSpamZillaSearch = (domain: string, tld: string) => {
    const fullDomain = `${domain}${tld}`;
    // Copy domain to clipboard
    navigator.clipboard.writeText(fullDomain);
    // Open SpamZilla in new tab
    window.open('https://www.spamzilla.io/', '_blank');
    // Show toast notification
    toast.success('Domain copied!', {
      description: `${fullDomain} copied to clipboard. Paste it in SpamZilla search.`,
    });
  };

  if (authLoading || projectLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Sign In Required</CardTitle>
            <CardDescription>Please sign in to view project details</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <a href={getLoginUrl()}>Sign In</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container py-8">
          <Card>
            <CardContent className="py-12 text-center">
              <h3 className="text-lg font-semibold mb-2">Project Not Found</h3>
              <p className="text-muted-foreground">The project you're looking for doesn't exist.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const keywords = project.keywords?.split(",").map((k) => k.trim()) || [];
  const hasSuggestions = suggestionsData && suggestionsData.suggestions.length > 0;

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container py-8 max-w-7xl">
        {/* Project Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>
            {project.projectName}
          </h1>
          <p className="text-muted-foreground text-lg">{project.description}</p>
          <div className="flex flex-wrap gap-2 mt-4">
            {/* Show AI-detected industry if user selected 'All Niches' or 'All Industries' */}
            {(project.niche === 'All Niches' || !project.niche) && suggestionsData?.analysis?.detectedIndustry ? (
              <Badge variant="secondary" className="bg-purple-100 text-purple-800 border-purple-300">
                Detected Niche: {suggestionsData.analysis.detectedIndustry}
              </Badge>
            ) : (
              project.niche && project.niche !== 'All Niches' && <Badge variant="secondary">{project.niche}</Badge>
            )}
            {(project.industry === 'All Industries' || !project.industry) && suggestionsData?.analysis?.detectedIndustry ? (
              <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300">
                Detected Industry: {suggestionsData.analysis.detectedIndustry}
              </Badge>
            ) : (
              project.industry && project.industry !== 'All Industries' && <Badge variant="outline">{project.industry}</Badge>
            )}
          </div>
        </div>

        {/* Project Details */}
        <div className="grid gap-6 md:grid-cols-3 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Target className="w-5 h-5 text-primary" />
                Keywords
              </CardTitle>
              <CardDescription>
                {project.competitorUrl && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleAnalyzeCompetitor}
                    disabled={analyzeCompetitor.isPending}
                    className="mt-2"
                  >
                    {analyzeCompetitor.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Search className="w-4 h-4 mr-2" />
                        Analyze Competitor
                      </>
                    )}
                  </Button>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {keywords.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {keywords.map((keyword, i) => (
                    <Badge key={i} variant="secondary">
                      {keyword}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No keywords specified</p>
              )}
            </CardContent>
          </Card>

          {/* Buyer Persona Card */}
          <Card className="border-purple-200 dark:border-purple-900">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Users className="w-5 h-5 text-purple-600" />
                Buyer Persona
              </CardTitle>
              <CardDescription>Target customer profile</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {suggestionsData?.analysis?.buyerPersona ? (
                <>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="default" className="bg-purple-600">Role</Badge>
                    </div>
                    <p className="text-sm font-semibold">{suggestionsData.analysis.buyerPersona.role}</p>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline">Pain Point</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{suggestionsData.analysis.buyerPersona.painPoint}</p>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline">Trigger</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{suggestionsData.analysis.buyerPersona.trigger}</p>
                  </div>
                  <div className="pt-2 border-t">
                    <p className="text-xs text-muted-foreground mb-1">Willingness to Pay</p>
                    <p className="text-lg font-bold text-purple-600">{suggestionsData.analysis.buyerPersona.willingnessToPay}</p>
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">{project.targetAudience || "Generate domain suggestions to see buyer persona"}</p>
              )}
            </CardContent>
          </Card>

          {/* Monetization Roadmap Card */}
          <Card className="border-green-200 dark:border-green-900">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <TrendingUp className="w-5 h-5 text-green-600" />
                Monetization Roadmap
              </CardTitle>
              <CardDescription>Revenue model analysis</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {suggestionsData?.analysis?.monetization ? (
                <>
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="default" className="bg-green-600">Primary Model</Badge>
                    </div>
                    <p className="text-sm font-semibold">{suggestionsData.analysis.monetization.primaryModel}</p>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline">Secondary Model</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{suggestionsData.analysis.monetization.secondaryModel}</p>
                  </div>
                  <div className="pt-2 border-t">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-muted-foreground">Est. CPC</span>
                      <Badge variant="secondary">{suggestionsData.analysis.monetization.revenueType}</Badge>
                    </div>
                    <p className="text-lg font-bold text-green-600">{suggestionsData.analysis.monetization.estimatedCPC}</p>
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">{project.goals || "Generate domain suggestions to see monetization insights"}</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Launch Strategy Section */}
        {hasSuggestions && activeLaunchPlanId && (
          <div className="mb-8">
            <MissionChecklist planId={activeLaunchPlanId} />
          </div>
        )}

        {/* Manual Domain Analysis Section */}
        {!activeLaunchPlanId && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5 text-purple-600" />
                Analyze Your Domain
              </CardTitle>
              <CardDescription>
                Enter a domain you own or want to analyze. We'll generate a complete 30-day launch strategy with zombie pages and keyword opportunities.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                <div className="flex-1">
                  <input
                    type="text"
                    value={customDomain}
                    onChange={(e) => setCustomDomain(e.target.value)}
                    placeholder="e.g., domainmatchpro.com"
                    className="w-full px-4 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <Button
                  size="lg"
                  onClick={async () => {
                    if (!project) return;
                    if (!customDomain.trim()) {
                      toast.error('Please enter a domain name');
                      return;
                    }
                    
                    setGeneratingLaunchStrategy(true);
                    try {
                      const result = await utils.client.launchStrategy.generate.mutate({
                        domain: customDomain.trim(),
                        projectId,
                        keywords: keywords.length > 0 ? keywords : undefined,
                      });
                      
                      setActiveLaunchPlanId(result.planId);
                      toast.success('Launch strategy generated! Check out your action plan below.');
                    } catch (error: any) {
                      toast.error('Failed to generate launch strategy: ' + error.message);
                    } finally {
                      setGeneratingLaunchStrategy(false);
                    }
                  }}
                  disabled={generatingLaunchStrategy || !customDomain.trim()}
                >
                  {generatingLaunchStrategy ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Target className="w-5 h-5 mr-2" />
                      Generate Launch Plan
                    </>
                  )}
                </Button>
              </div>
              
              {hasSuggestions && (
                <div className="mt-4 pt-4 border-t">
                  <p className="text-sm text-muted-foreground mb-3">
                    Or choose a domain from your suggestions below and we'll analyze it automatically.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Generate Suggestions Button */}
        {!hasSuggestions && (
          <Card className="mb-8">
            <CardContent className="py-12 text-center">
              <Sparkles className="w-16 h-16 mx-auto mb-4 text-primary" />
              <h3 className="text-xl font-semibold mb-2">Ready to Find Your Perfect Domain?</h3>
              <p className="text-muted-foreground mb-6">
                Let AI analyze your project and suggest expired domains that match your niche
              </p>
              <Button
                size="lg"
                onClick={handleGenerateSuggestions}
                disabled={generateSuggestions.isPending}
              >
                {generateSuggestions.isPending ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Generating Suggestions...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5 mr-2" />
                    Generate Brand Names & Domains
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Market Research Insights */}
        {suggestionsData?.analysis && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-primary" />
                Market Insights
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h4 className="font-semibold mb-2">Market Analysis</h4>
                <p className="text-sm text-muted-foreground">{suggestionsData.analysis.marketInsights}</p>
              </div>

              <div>
                <h4 className="font-semibold mb-3">Recommended TLDs</h4>
                <div className="grid gap-4 md:grid-cols-2">
                  {suggestionsData.analysis.tldRecommendations.map((tld: any, i: number) => (
                    <Card key={i}>
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between mb-2">
                          <Badge variant="default" className="text-lg px-3 py-1">
                            {tld.tld}
                          </Badge>
                          <Badge variant="outline">{tld.confidence}% confidence</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{tld.reasoning}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Generated Brand Names & Domains */}
        {hasSuggestions && (
          <div>
            <SuggestionFilterBar
              filters={filters}
              onFiltersChange={handleAvailabilityFilterChange}
              onClearFilters={() => {
                setFilters({ extensions: [], maxLength: 50, availableOnly: false });
                setAvailabilityMap({});
              }}
            />

            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">Generated Brand Names & Domains</h2>
              <Button
                variant="outline"
                onClick={handleGenerateSuggestions}
                disabled={generateSuggestions.isPending}
              >
                {generateSuggestions.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Regenerating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Regenerate
                  </>
                )}
              </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredSuggestions.map((suggestion: any) => (
                <DomainSuggestionCard
                  key={suggestion.id}
                  suggestion={suggestion}
                  projectId={projectId}
                  onAddToProject={(domainName) => {
                    addDomainToProject.mutate({ projectId, domainName });
                  }}
                  onAddToWatchlist={(domainName) => {
                    addToWatchlist.mutate({ domainName });
                  }}
                  onCheckAvailability={(domainName) => {
                    setSelectedDomainForAvailability(domainName);
                    setAvailabilityModalOpen(true);
                  }}
                  onChooseDomain={(domainName) => {
                    chooseDomain.mutate({ projectId, domainName });
                  }}
                  onShowTLDs={(domainName) => {
                    // Generate common TLD alternatives
                    const tlds = ['.com', '.net', '.org', '.io', '.ai', '.co', '.app', '.dev'];
                    updateTlds.mutate({ projectId, tlds });
                  }}
                  onSpamZillaSearch={handleSpamZillaSearch}
                  onCheckHistory={async (domainName) => {
                    setSelectedDomainForHistory(domainName);
                    setForensicHistoryModalOpen(true);
                    
                    // Trigger forensic analysis
                    try {
                      const result = await utils.client.forensicAnalysis.analyze.mutate({ domainName });
                      setForensicResult(result);
                      toast.success('Forensic analysis complete!');
                    } catch (error: any) {
                      toast.error('Failed to analyze domain history: ' + error.message);
                      setForensicResult(null);
                    }
                  }}
                  isAddingToProject={addDomainToProject.isPending}
                  isAddingToWatchlist={addToWatchlist.isPending}
                  isChoosingDomain={chooseDomain.isPending}
                />
              ))}
            </div>
          </div>
        )}
      </div>
      
      <ForensicHistoryModal
        isOpen={forensicHistoryModalOpen}
        onClose={() => {
          setForensicHistoryModalOpen(false);
          setSelectedDomainForHistory(null);
          setForensicResult(null);
        }}
        result={forensicResult}
        domainName={selectedDomainForHistory || ''}
      />
    </div>
  );
}
