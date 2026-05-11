import { useParams, Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, ExternalLink, TrendingUp, History, Tag, Search, Sparkles, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { Separator } from "@/components/ui/separator";
import { LockedValue } from "@/components/PremiumLock";

export function DomainDetail() {
  const params = useParams();
  const domainName = params.domainName as string;
  const [isGeneratingKeywords, setIsGeneratingKeywords] = useState(false);
  const [isGeneratingLongTail, setIsGeneratingLongTail] = useState(false);
  const [isAnalyzingOpportunity, setIsAnalyzingOpportunity] = useState(false);
  const [opportunityScores, setOpportunityScores] = useState<Map<string, any>>(new Map());
  const utils = trpc.useUtils();

  const { data: domainData, isLoading } = trpc.domains.getDetails.useQuery(
    { domainName },
    { enabled: !!domainName }
  );

  // Check user tier for feature gating
  const { data: userTier } = trpc.user.getTier.useQuery();
  const isProUser = userTier?.tier === "PRO";

  // Auto-load real metrics for PRO users
  const { data: enrichedMetrics, isLoading: isLoadingMetrics } = trpc.enrichment.getDomainMetrics.useQuery(
    { domain: domainName },
    { 
      enabled: isProUser && !!domainName,
      staleTime: 1000 * 60 * 60, // Cache for 1 hour
    }
  );

  const generateKeywords = trpc.domains.generateKeywords.useMutation({
    onSuccess: (data) => {
      if (data.keywords && data.keywords.length > 0) {
        toast.success(`Generated ${data.keywords.length} keywords successfully!`);
      } else {
        toast.error("No keywords found. Try a different approach or check the domain.");
      }
      utils.domains.getDetails.invalidate({ domainName });
      setIsGeneratingKeywords(false);
    },
    onError: (error) => {
      toast.error(`Failed to generate keywords: ${error.message}`);
      setIsGeneratingKeywords(false);
    },
  });

  const generateLongTail = trpc.domains.generateLongTailKeywords.useMutation({
    onSuccess: (data) => {
      if (data.longTailKeywords && data.longTailKeywords.length > 0) {
        toast.success(`Generated ${data.longTailKeywords.length} long-tail keywords successfully!`);
      } else {
        toast.error("No long-tail keywords found. Ensure primary keywords are generated first.");
      }
      utils.domains.getDetails.invalidate({ domainName });
      setIsGeneratingLongTail(false);
    },
    onError: (error) => {
      toast.error(`Failed to generate long-tail keywords: ${error.message}`);
      setIsGeneratingLongTail(false);
    },
  });

  const generateKeywordsFromArchive = trpc.domains.generateKeywordsFromArchive.useMutation({
    onSuccess: (data) => {
      if (data.keywords && data.keywords.length > 0) {
        toast.success(`Extracted ${data.keywords.length} keywords from Archive.org!`);
      } else {
        toast.error("No historical content found in Archive.org for this domain.");
      }
      utils.domains.getDetails.invalidate({ domainName });
      setIsGeneratingKeywords(false);
    },
    onError: (error) => {
      toast.error(`Failed to extract keywords: ${error.message}`);
      setIsGeneratingKeywords(false);
    },
  });

  const analyzeOpportunity = trpc.keywords.analyzeOpportunity.useMutation({
    onSuccess: (scores) => {
      const scoresMap = new Map();
      scores.forEach((score: any) => {
        scoresMap.set(score.keyword, score);
      });
      setOpportunityScores(scoresMap);
      toast.success(`Analyzed ${scores.length} keywords for opportunity!`);
      setIsAnalyzingOpportunity(false);
    },
    onError: (error) => {
      toast.error(`Failed to analyze opportunity: ${error.message}`);
      setIsAnalyzingOpportunity(false);
    },
  });

  const handleGenerateKeywords = () => {
    setIsGeneratingKeywords(true);
    generateKeywords.mutate({
      domainName,
      existingTopics: domainData?.keywords || undefined,
    });
  };

  const handleGenerateFromArchive = () => {
    setIsGeneratingKeywords(true);
    generateKeywordsFromArchive.mutate({ domainName });
  };

  const handleGenerateLongTail = () => {
    const primaryKeywords = domainData?.keywords
      ? domainData.keywords.split(',').map((k: string) => k.trim())
      : [];
    
    if (primaryKeywords.length === 0) {
      toast.error("Please generate primary keywords first");
      return;
    }

    setIsGeneratingLongTail(true);
    generateLongTail.mutate({
      domainName,
      primaryKeywords,
    });
  };

  const handleAnalyzeOpportunity = () => {
    const allKeywords: string[] = [];
    
    // Collect primary keywords
    if (domainData?.keywords) {
      const primary = domainData.keywords.split(',').map((k: string) => {
        try {
          const parsed = JSON.parse(k.trim());
          return parsed.keyword || k.trim();
        } catch {
          return k.trim();
        }
      });
      allKeywords.push(...primary);
    }
    
    // Collect long-tail keywords
    if (domainData?.longTailKeywords && Array.isArray(domainData.longTailKeywords)) {
      const longTail = domainData.longTailKeywords.map((k: any) => {
        if (typeof k === 'string') {
          try {
            const parsed = JSON.parse(k);
            return parsed.keyword || k;
          } catch {
            return k;
          }
        }
        return k.keyword || k;
      });
      allKeywords.push(...longTail);
    }
    
    if (allKeywords.length === 0) {
      toast.error("No keywords available to analyze. Generate keywords first.");
      return;
    }
    
    setIsAnalyzingOpportunity(true);
    analyzeOpportunity.mutate({ keywords: allKeywords });
  };

  // Helper to format search volume
  const formatVolume = (volume: number) => {
    if (volume >= 1000000) return `${(volume / 1000000).toFixed(1)}M`;
    if (volume >= 1000) return `${(volume / 1000).toFixed(1)}K`;
    return volume.toString();
  };

  // Helper to get difficulty badge color
  const getDifficultyColor = (level: string) => {
    switch (level) {
      case 'Easy': return 'bg-green-100 text-green-800 border-green-300';
      case 'Medium': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'Hard': return 'bg-red-100 text-red-800 border-red-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!domainData) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Domain Not Found</h1>
          <p className="text-muted-foreground mb-6">
            The domain "{domainName}" could not be found in your saved domains.
          </p>
          <Link href="/projects">
            <Button>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Projects
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const keywords = domainData.keywords ? domainData.keywords.split(',').map((k: string) => k.trim()) : [];
  const longTailKeywords = domainData.longTailKeywords || [];

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header with breadcrumb */}
      <div className="flex items-center gap-4">
        <Link href="/projects">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Projects
          </Button>
        </Link>
      </div>

      {/* Domain Name Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold">{domainName}</h1>
          <p className="text-muted-foreground mt-2">
            Comprehensive domain analysis and metrics
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => {
              const searchUrl = `https://www.namecheap.com/domains/registration/results/?domain=${encodeURIComponent(domainName)}`;
              window.open(searchUrl, '_blank');
            }}
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            Check Availability
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              // Copy domain to clipboard
              navigator.clipboard.writeText(domainName);
              // Open SpamZilla in new tab
              window.open('https://www.spamzilla.io/', '_blank');
              // Show toast notification
              toast.success('Domain copied!', {
                description: `${domainName} copied to clipboard. Paste it in SpamZilla search.`,
              });
            }}
          >
            <Search className="w-4 h-4 mr-2" />
            Copy & Check SpamZilla
          </Button>
        </div>
      </div>

      <Separator />

      {/* Keywords Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Tag className="w-5 h-5" />
              Keywords
            </CardTitle>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleGenerateKeywords}
                disabled={isGeneratingKeywords}
              >
                {isGeneratingKeywords ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4 mr-2" />
                )}
                Generate Keywords
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleGenerateFromArchive}
                disabled={isGeneratingKeywords}
              >
                {isGeneratingKeywords ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4 mr-2" />
                )}
                Extract from Archive
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={handleAnalyzeOpportunity}
                disabled={isAnalyzingOpportunity || keywords.length === 0}
              >
                {isAnalyzingOpportunity ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <TrendingUp className="w-4 h-4 mr-2" />
                )}
                Analyze Opportunity
              </Button>
            </div>
          </div>
          <CardDescription>
            Primary keywords associated with this domain
          </CardDescription>
        </CardHeader>
        <CardContent>
          {keywords.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-3 font-medium">#</th>
                    <th className="text-left py-2 px-3 font-medium">Keyword</th>
                    <th className="text-left py-2 px-3 font-medium">Difficulty</th>
                    <th className="text-left py-2 px-3 font-medium">Volume</th>
                    <th className="text-left py-2 px-3 font-medium">Opportunity</th>
                  </tr>
                </thead>
                <tbody>
                  {keywords.map((keyword: string, index: number) => {
                    // Parse keyword if it's a JSON object with metrics
                    let keywordText = keyword;
                    let difficulty = null;
                    let difficultyLevel = null;
                    let volume = null;
                    
                    try {
                      const parsed = JSON.parse(keyword);
                      if (parsed.keyword) {
                        keywordText = parsed.keyword;
                        difficulty = parsed.difficulty;
                        difficultyLevel = parsed.difficultyLevel;
                        volume = parsed.searchVolume;
                      }
                    } catch {
                      // Not JSON, use as-is
                    }
                    
                    return (
                      <tr key={index} className="border-b hover:bg-muted/50">
                        <td className="py-2 px-3 text-sm text-muted-foreground">{index + 1}</td>
                        <td className="py-2 px-3 text-sm font-medium">{keywordText}</td>
                        <td className="py-2 px-3">
                          {difficultyLevel ? (
                            <Badge variant="outline" className={`text-xs ${getDifficultyColor(difficultyLevel)}`}>
                              {difficultyLevel} ({difficulty})
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-sm">
                          {volume ? formatVolume(volume) : '-'}
                        </td>
                        <td className="py-2 px-3">
                          {opportunityScores.has(keywordText) ? (
                            <div className="flex items-center gap-2">
                              <span className="text-lg">{opportunityScores.get(keywordText).verdictIcon}</span>
                              <div>
                                <div className="text-sm font-medium">{opportunityScores.get(keywordText).winProbability}%</div>
                                <div className="text-xs text-muted-foreground">{opportunityScores.get(keywordText).verdict.replace('_', ' ')}</div>
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No keywords available</p>
          )}
        </CardContent>
      </Card>

      {/* Long-tail Keywords Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Long-tail Keyword Suggestions
              </CardTitle>
              <CardDescription>
                Extended keyword phrases for better SEO targeting
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleGenerateLongTail}
              disabled={isGeneratingLongTail}
            >
              {isGeneratingLongTail ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4 mr-2" />
              )}
              Generate Long-tail
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {longTailKeywords.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-3 font-medium">#</th>
                    <th className="text-left py-2 px-3 font-medium">Long-tail Keyword</th>
                    <th className="text-left py-2 px-3 font-medium">Difficulty</th>
                    <th className="text-left py-2 px-3 font-medium">Volume</th>
                    <th className="text-left py-2 px-3 font-medium">Opportunity</th>
                  </tr>
                </thead>
                <tbody>
                  {longTailKeywords.map((keyword: any, index: number) => {
                    // Handle both string and object formats
                    const keywordText = typeof keyword === 'string' ? keyword : keyword.keyword;
                    const difficulty = typeof keyword === 'object' ? keyword.difficulty : null;
                    const difficultyLevel = typeof keyword === 'object' ? keyword.difficultyLevel : null;
                    const volume = typeof keyword === 'object' ? keyword.searchVolume : null;
                    
                    return (
                      <tr key={index} className="border-b hover:bg-muted/50">
                        <td className="py-2 px-3 text-sm text-muted-foreground">{index + 1}</td>
                        <td className="py-2 px-3 text-sm">{keywordText}</td>
                        <td className="py-2 px-3">
                          {difficultyLevel ? (
                            <Badge variant="outline" className={`text-xs ${getDifficultyColor(difficultyLevel)}`}>
                              {difficultyLevel} ({difficulty})
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-sm">
                          {volume ? formatVolume(volume) : '-'}
                        </td>
                        <td className="py-2 px-3">
                          {opportunityScores.has(keywordText) ? (
                            <div className="flex items-center gap-2">
                              <span className="text-lg">{opportunityScores.get(keywordText).verdictIcon}</span>
                              <div>
                                <div className="text-sm font-medium">{opportunityScores.get(keywordText).winProbability}%</div>
                                <div className="text-xs text-muted-foreground">{opportunityScores.get(keywordText).verdict.replace('_', ' ')}</div>
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No long-tail keywords available. Generate them using the button above.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Domain History Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="w-5 h-5" />
            Domain History
          </CardTitle>
          <CardDescription>
            Historical information and backlink profile
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Domain Age</p>
              <p className="text-2xl font-bold">
                {domainData.domainAge || 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Backlinks</p>
              <p className="text-2xl font-bold">
                {isProUser ? (
                  isLoadingMetrics ? (
                    <Loader2 className="w-6 h-6 animate-spin" />
                  ) : enrichedMetrics?.success && enrichedMetrics.metrics ? (
                    enrichedMetrics.metrics.backlinks?.toLocaleString() || '0'
                  ) : (
                    domainData.backlinks || 'N/A'
                  )
                ) : (
                  <LockedValue feature="backlink_count" placeholder="•••••" />
                )}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Referring Domains</p>
              <p className="text-2xl font-bold">
                {isProUser ? (
                  isLoadingMetrics ? (
                    <Loader2 className="w-6 h-6 animate-spin" />
                  ) : enrichedMetrics?.success && enrichedMetrics.metrics ? (
                    enrichedMetrics.metrics.referringDomains?.toLocaleString() || '0'
                  ) : (
                    domainData.referringDomains || 'N/A'
                  )
                ) : (
                  <LockedValue feature="backlink_count" placeholder="•••••" />
                )}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Trust Flow</p>
              <p className="text-2xl font-bold">
                {isProUser ? (
                  domainData.trustFlow || 'N/A'
                ) : (
                  <LockedValue feature="trust_flow" placeholder="••" />
                )}
              </p>
            </div>
          </div>

          {domainData.previousOwners && (
            <div>
              <p className="text-sm font-medium mb-2">Previous Owners</p>
              <p className="text-sm text-muted-foreground">
                {domainData.previousOwners}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* SEO Metrics Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            SEO Metrics
          </CardTitle>
          <CardDescription>
            Search engine optimization indicators
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Domain Authority</p>
              <div className="flex items-baseline gap-2">
                {isProUser ? (
                  isLoadingMetrics ? (
                    <Loader2 className="w-6 h-6 animate-spin" />
                  ) : enrichedMetrics?.success && enrichedMetrics.metrics?.domainAuthority ? (
                    <>
                      <p className="text-3xl font-bold">{enrichedMetrics.metrics.domainAuthority}</p>
                      <span className="text-sm text-muted-foreground">/100</span>
                    </>
                  ) : (
                    <p className="text-3xl font-bold">{domainData.domainAuthority || 'N/A'}</p>
                  )
                ) : (
                  <LockedValue feature="domain_authority" placeholder="••" className="text-3xl" />
                )}
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Page Authority</p>
              <div className="flex items-baseline gap-2">
                {isProUser ? (
                  <>
                    <p className="text-3xl font-bold">{domainData.pageAuthority || 'N/A'}</p>
                    {domainData.pageAuthority && (
                      <span className="text-sm text-muted-foreground">/100</span>
                    )}
                  </>
                ) : (
                  <LockedValue feature="domain_authority" placeholder="••" className="text-3xl" />
                )}
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Spam Score</p>
              <div className="flex items-baseline gap-2">
                <p className="text-3xl font-bold">{domainData.spamScore || 'N/A'}</p>
                {domainData.spamScore && (
                  <span className="text-sm text-muted-foreground">%</span>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* SpamZilla Data Section */}
      {domainData.spamzillaScreenshot && (
        <Card>
          <CardHeader>
            <CardTitle>SpamZilla Analysis</CardTitle>
            <CardDescription>
              Screenshot from SpamZilla domain marketplace
            </CardDescription>
          </CardHeader>
          <CardContent>
            <img
              src={domainData.spamzillaScreenshot}
              alt={`SpamZilla analysis for ${domainName}`}
              className="w-full rounded-lg border"
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
