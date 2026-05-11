import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import Navigation from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { getLoginUrl } from "@/const";
import {
  Flame,
  Globe,
  Search,
  Megaphone,
  DoorOpen,
  Loader2,
  Link,
  FileText,
  Copy,
  CheckCircle2,
  TrendingUp,
  Target,
  Lightbulb,
  Zap,
  ShoppingCart,
  Gavel,
  Clock,
  ExternalLink,
} from "lucide-react";

interface DomainIdea { name: string; tld: string; full: string; brandScore: number; rationale: string; available?: boolean; price?: number; currency?: string; availabilityChecked?: boolean; }
interface KeywordResult { keyword: string; searchVolume: number | null; difficulty: number | null; cpc: number | null; type: "primary" | "longtail"; }
interface FunnelOutline { hook: { headline: string; subheadline: string; angle: string; trafficSource: string; }; story: { narrative: string; painPoints: string[]; transformation: string; bridgePageIdea: string; }; offer: { callToAction: string; bonusIdeas: string[]; urgencyTrigger: string; affiliateAngle: string; }; }
interface BackdoorAngle { angle: string; targetAudience: string; searchIntent: string; exampleKeywords: string[]; contentIdea: string; whyItWorks: string; }
interface AffiliateIntelligenceResult { productName: string; niche: string; targetAudience: string; domainIdeas: DomainIdea[]; primaryKeywords: KeywordResult[]; longtailKeywords: KeywordResult[]; funnelOutline: FunnelOutline; backdoorAngles: BackdoorAngle[]; scrapedContent?: string; scrapedTitle?: string; }

interface AvailableDomain {
  domain: string;
  source: "godaddy_auctions" | "namecheap_marketplace" | "dataforseo" | "generated_available";
  available: boolean;
  price: number;
  currency: string;
  isPremium: boolean;
  isAuction: boolean;
  auctionEndDate?: string;
  buyNowUrl: string;
  brandScore: number;
  tld: string;
}

type InputMode = "url" | "text";

export default function AffiliateIntelligence() {
  const { user, loading: authLoading } = useAuth();
  const [inputMode, setInputMode] = useState<InputMode>("url");
  const [productName, setProductName] = useState("");
  const [productUrl, setProductUrl] = useState("");
  const [productDescription, setProductDescription] = useState("");
  const [result, setResult] = useState<AffiliateIntelligenceResult | null>(null);
  const [copiedDomain, setCopiedDomain] = useState<string | null>(null);
  const [availableDomains, setAvailableDomains] = useState<AvailableDomain[]>([]);

  const [savedProjectId, setSavedProjectId] = useState<number | null>(null);
  const [, setLocation] = useLocation();

  // Check if user is on Pro tier or is admin
  const isProUser = user?.tier === "PRO" || user?.role === "admin" || user?.email === "serfindah895@gmail.com";

  const saveToProject = trpc.affiliateIntelligence.saveToProject.useMutation({
    onSuccess: (data) => {
      setSavedProjectId(data.projectId);
      toast.success(data.message);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to save project. Please try again.");
    },
  });

  const findAvailable = trpc.affiliateIntelligence.findAvailable.useMutation({
    onSuccess: (data) => {
      setAvailableDomains(data.domains);
      if (data.total === 0) {
        toast.info("No available domains found for these keywords. Try different keywords.");
      } else {
        toast.success(`Found ${data.total} available domain${data.total !== 1 ? "s" : ""} ready to register!`);
      }
    },
    onError: (error) => {
      toast.error(error.message || "Domain search failed. Please try again.");
    },
  });

  const handleFindAvailable = () => {
    if (!result) return;
    const keywords = result.primaryKeywords.slice(0, 5).map((k) => k.keyword);
    if (keywords.length === 0) {
      toast.error("No keywords available. Run the analysis first.");
      return;
    }
    findAvailable.mutate({
      keywords,
      niche: result.niche,
      maxResults: 20,
    });
  };

  const handleSaveToProject = () => {
    if (!result) return;
    saveToProject.mutate({
      productName: result.productName,
      niche: result.niche,
      targetAudience: result.targetAudience,
      domainIdeas: result.domainIdeas,
      primaryKeywords: result.primaryKeywords,
      longtailKeywords: result.longtailKeywords,
      funnelHook: result.funnelOutline.hook.headline,
      backdoorAngles: result.backdoorAngles,
    });
  };

  const analyze = trpc.affiliateIntelligence.analyze.useMutation({
    onSuccess: (data) => {
      setResult(data);
      setAvailableDomains([]);
      toast.success("Analysis complete! Review your domain ideas, keywords, and funnel below.");
    },
    onError: (error) => {
      toast.error(error.message || "Analysis failed. Please try again.");
    },
  });

  const handleAnalyze = () => {
    if (!productName.trim()) {
      toast.error("Please enter a product name.");
      return;
    }
    if (inputMode === "url" && !productUrl.trim()) {
      toast.error("Please enter a product URL.");
      return;
    }
    if (inputMode === "text" && !productDescription.trim()) {
      toast.error("Please enter a product description.");
      return;
    }

    analyze.mutate({
      productName: productName.trim(),
      url: inputMode === "url" ? productUrl.trim() : undefined,
      description: inputMode === "text" ? productDescription.trim() : undefined,
    });
  };

  const copyDomain = (domain: string) => {
    navigator.clipboard.writeText(domain);
    setCopiedDomain(domain);
    setTimeout(() => setCopiedDomain(null), 2000);
  };

  const getDifficultyColor = (difficulty: number | null) => {
    if (difficulty === null) return "bg-muted text-muted-foreground";
    if (difficulty < 30) return "bg-green-100 text-green-800";
    if (difficulty < 60) return "bg-yellow-100 text-yellow-800";
    return "bg-red-100 text-red-800";
  };

  const getSourceBadge = (source: AvailableDomain["source"]) => {
    switch (source) {
      case "godaddy_auctions":
        return <Badge className="bg-green-100 text-green-800 border-green-300 text-xs">GoDaddy Auctions</Badge>;
      case "namecheap_marketplace":
        return <Badge className="bg-orange-100 text-orange-800 border-orange-300 text-xs">Namecheap Market</Badge>;
      case "dataforseo":
        return <Badge className="bg-purple-100 text-purple-800 border-purple-300 text-xs">DataForSEO</Badge>;
      case "generated_available":
        return <Badge className="bg-blue-100 text-blue-800 border-blue-300 text-xs">Fresh Registration</Badge>;
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
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
            <CardDescription>Please sign in to use Affiliate Intelligence</CardDescription>
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

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="container py-8 max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 flex items-center gap-2" style={{ fontFamily: "'Playfair Display', serif" }}>
            <Zap className="w-8 h-8 text-primary" />
            Affiliate Intelligence
          </h1>
          <p className="text-muted-foreground text-lg">
            Enter a product from ClickBank, JVZoo, or Digistore24 and get domain ideas, keywords, a Hook-Story-Offer funnel, and backdoor traffic angles.
          </p>
        </div>

        {/* Input Card */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Product Input</CardTitle>
            <CardDescription>
              Paste the product URL to auto-scrape, or enter the description manually
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Product Name */}
            <div>
              <label className="text-sm font-medium mb-1 block">Product Name</label>
              <Input
                placeholder="e.g. Flat Belly Fix, Commission Hero, Keto Hacks"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
              />
            </div>

            {/* Input Mode Toggle */}
            <div className="flex gap-2">
              <Button
                variant={inputMode === "url" ? "default" : "outline"}
                size="sm"
                onClick={() => setInputMode("url")}
                className="flex items-center gap-2"
              >
                <Link className="w-4 h-4" />
                Paste URL
              </Button>
              <Button
                variant={inputMode === "text" ? "default" : "outline"}
                size="sm"
                onClick={() => setInputMode("text")}
                className="flex items-center gap-2"
              >
                <FileText className="w-4 h-4" />
                Enter Description
              </Button>
            </div>

            {inputMode === "url" ? (
              <div>
                <label className="text-sm font-medium mb-1 block">Product Page URL</label>
                <Input
                  placeholder="https://www.clickbank.com/... or https://jvzoo.com/..."
                  value={productUrl}
                  onChange={(e) => setProductUrl(e.target.value)}
                  type="url"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  We will automatically scrape the product page to extract the description.
                </p>
              </div>
            ) : (
              <div>
                <label className="text-sm font-medium mb-1 block">Product Description</label>
                <Textarea
                  placeholder="Paste the product sales copy, description, or key benefits here..."
                  value={productDescription}
                  onChange={(e) => setProductDescription(e.target.value)}
                  rows={6}
                />
              </div>
            )}

            <Button
              onClick={handleAnalyze}
              disabled={analyze.isPending}
              className="w-full"
              size="lg"
            >
              {analyze.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Analyzing product... (this may take 30–60 seconds)
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 mr-2" />
                  Analyze Product
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Pro Gating Banner for free users */}
        {!isProUser && (
          <Card className="mb-8 border-amber-300 bg-amber-50">
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <p className="font-semibold text-amber-900 flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-600" />
                    Affiliate Intelligence is a Pro feature
                  </p>
                  <p className="text-sm text-amber-700 mt-1">
                    Upgrade to Pro to unlock unlimited analyses, full keyword data, and funnel generation.
                  </p>
                </div>
                <Button
                  className="bg-amber-500 hover:bg-amber-600 text-white shrink-0"
                  onClick={() => setLocation("/pricing")}
                >
                  Upgrade to Pro
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Results */}
        {result && (
          <div className="space-y-6">
            {/* Summary Banner */}
            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="pt-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex flex-wrap gap-4 items-start">
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Product</p>
                      <p className="font-semibold text-lg">{result.productName}</p>
                    </div>
                    <Separator orientation="vertical" className="h-12 hidden sm:block" />
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Niche</p>
                      <p className="font-semibold">{result.niche}</p>
                    </div>
                    <Separator orientation="vertical" className="h-12 hidden sm:block" />
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Target Audience</p>
                      <p className="font-semibold">{result.targetAudience}</p>
                    </div>
                  </div>
                  {/* Save to Project button */}
                  <div className="flex gap-2 shrink-0">
                    {savedProjectId ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-green-700 border-green-300"
                        onClick={() => setLocation(`/projects/${savedProjectId}`)}
                      >
                        <CheckCircle2 className="w-4 h-4 mr-2 text-green-500" />
                        View Project
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleSaveToProject}
                        disabled={saveToProject.isPending}
                      >
                        {saveToProject.isPending ? (
                          <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</>
                        ) : (
                          <><Target className="w-4 h-4 mr-2" />Save to Project</>
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tabbed Results */}
            <Tabs defaultValue="domains">
              <TabsList className="grid grid-cols-5 w-full">
                <TabsTrigger value="domains" className="flex items-center gap-1">
                  <Globe className="w-4 h-4" />
                  <span className="hidden sm:inline">Domains</span>
                  <Badge variant="secondary" className="ml-1">
                    {result.domainIdeas.filter((d) => d.available !== false).length}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="keywords" className="flex items-center gap-1">
                  <Search className="w-4 h-4" />
                  <span className="hidden sm:inline">Keywords</span>
                  <Badge variant="secondary" className="ml-1">{result.primaryKeywords.length + result.longtailKeywords.length}</Badge>
                </TabsTrigger>
                <TabsTrigger value="funnel" className="flex items-center gap-1">
                  <Megaphone className="w-4 h-4" />
                  <span className="hidden sm:inline">Funnel</span>
                </TabsTrigger>
                <TabsTrigger value="backdoor" className="flex items-center gap-1">
                  <DoorOpen className="w-4 h-4" />
                  <span className="hidden sm:inline">Backdoor</span>
                  <Badge variant="secondary" className="ml-1">{result.backdoorAngles.length}</Badge>
                </TabsTrigger>
                <TabsTrigger value="available" className="flex items-center gap-1">
                  <ShoppingCart className="w-4 h-4" />
                  <span className="hidden sm:inline">Buy Now</span>
                  {availableDomains.length > 0 && (
                    <Badge variant="secondary" className="ml-1">{availableDomains.length}</Badge>
                  )}
                </TabsTrigger>
              </TabsList>

              {/* Domains Tab */}
              <TabsContent value="domains" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Globe className="w-5 h-5 text-primary" />
                      Available Domain Ideas
                    </CardTitle>
                    <CardDescription>
                      Only confirmed-available domains at standard registration price (&lt;$50). 🔥 = Brand Score above 80
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {result.domainIdeas.filter((d) => d.available !== false).length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Globe className="w-10 h-10 mx-auto mb-3 opacity-30" />
                        <p className="font-medium">All generated domains are taken or premium-priced</p>
                        <p className="text-sm mt-1">Use the <strong>Buy Now</strong> tab to search auctions and marketplaces for verified-available alternatives.</p>
                      </div>
                    ) : null}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {result.domainIdeas.filter((d) => d.available !== false).map((domain, i) => (
                        <div
                          key={i}
                          className="flex items-start justify-between p-3 rounded-lg border hover:border-primary/50 transition-colors"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-mono font-semibold text-sm">{domain.full}</span>
                              {domain.brandScore >= 80 && (
                                <span title="High Brand Potential - Google Safe">
                                  <Flame className="w-4 h-4 text-orange-500" />
                                </span>
                              )}
                              <Badge variant="outline" className="text-xs">
                                {domain.brandScore}/100
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground leading-snug">{domain.rationale}</p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="ml-2 shrink-0"
                            onClick={() => copyDomain(domain.full)}
                          >
                            {copiedDomain === domain.full ? (
                              <CheckCircle2 className="w-4 h-4 text-green-500" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </Button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Keywords Tab */}
              <TabsContent value="keywords" className="mt-4">
                <div className="space-y-4">
                  {/* Primary Keywords */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-base">
                        <Target className="w-4 h-4 text-primary" />
                        Primary Keywords
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b text-muted-foreground">
                              <th className="text-left py-2 pr-4 font-medium">Keyword</th>
                              <th className="text-right py-2 pr-4 font-medium">Volume</th>
                              <th className="text-right py-2 pr-4 font-medium">Difficulty</th>
                              <th className="text-right py-2 font-medium">CPC</th>
                            </tr>
                          </thead>
                          <tbody>
                            {result.primaryKeywords.map((kw, i) => (
                              <tr key={i} className="border-b last:border-0 hover:bg-muted/30">
                                <td className="py-2 pr-4 font-medium">{kw.keyword}</td>
                                <td className="py-2 pr-4 text-right text-muted-foreground">
                                  {kw.searchVolume !== null ? kw.searchVolume.toLocaleString() : "—"}
                                </td>
                                <td className="py-2 pr-4 text-right">
                                  {kw.difficulty !== null ? (
                                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${getDifficultyColor(kw.difficulty)}`}>
                                      {kw.difficulty}
                                    </span>
                                  ) : "—"}
                                </td>
                                <td className="py-2 text-right text-muted-foreground">
                                  {kw.cpc !== null ? `$${kw.cpc.toFixed(2)}` : "—"}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Long-tail Keywords */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-base">
                        <TrendingUp className="w-4 h-4 text-primary" />
                        Long-tail Keywords
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b text-muted-foreground">
                              <th className="text-left py-2 pr-4 font-medium">Keyword</th>
                              <th className="text-right py-2 pr-4 font-medium">Volume</th>
                              <th className="text-right py-2 pr-4 font-medium">Difficulty</th>
                              <th className="text-right py-2 font-medium">CPC</th>
                            </tr>
                          </thead>
                          <tbody>
                            {result.longtailKeywords.map((kw, i) => (
                              <tr key={i} className="border-b last:border-0 hover:bg-muted/30">
                                <td className="py-2 pr-4 font-medium">{kw.keyword}</td>
                                <td className="py-2 pr-4 text-right text-muted-foreground">
                                  {kw.searchVolume !== null ? kw.searchVolume.toLocaleString() : "—"}
                                </td>
                                <td className="py-2 pr-4 text-right">
                                  {kw.difficulty !== null ? (
                                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${getDifficultyColor(kw.difficulty)}`}>
                                      {kw.difficulty}
                                    </span>
                                  ) : "—"}
                                </td>
                                <td className="py-2 text-right text-muted-foreground">
                                  {kw.cpc !== null ? `$${kw.cpc.toFixed(2)}` : "—"}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Funnel Tab */}
              <TabsContent value="funnel" className="mt-4">
                <div className="space-y-4">
                  {/* Hook */}
                  <Card className="border-l-4 border-l-red-400">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2">
                        <span className="w-7 h-7 rounded-full bg-red-100 text-red-700 flex items-center justify-center text-sm font-bold">1</span>
                        Hook
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-1">Headline</p>
                        <p className="font-semibold text-lg leading-snug">{result.funnelOutline.hook.headline}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-1">Subheadline</p>
                        <p className="text-muted-foreground">{result.funnelOutline.hook.subheadline}</p>
                      </div>
                      <div className="flex flex-wrap gap-3">
                        <div>
                          <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-1">Angle</p>
                          <Badge variant="outline">{result.funnelOutline.hook.angle}</Badge>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-1">Traffic Source</p>
                          <Badge variant="secondary">{result.funnelOutline.hook.trafficSource}</Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Story */}
                  <Card className="border-l-4 border-l-amber-400">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2">
                        <span className="w-7 h-7 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-sm font-bold">2</span>
                        Story
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-1">Narrative</p>
                        <p className="text-muted-foreground leading-relaxed">{result.funnelOutline.story.narrative}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-2">Pain Points to Address</p>
                        <ul className="space-y-1">
                          {result.funnelOutline.story.painPoints.map((p, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm">
                              <span className="text-amber-500 mt-0.5">•</span>
                              {p}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-1">Transformation</p>
                        <p className="text-sm">{result.funnelOutline.story.transformation}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-1">Bridge Page Idea</p>
                        <p className="text-sm font-medium text-amber-700 bg-amber-50 px-3 py-2 rounded">{result.funnelOutline.story.bridgePageIdea}</p>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Offer */}
                  <Card className="border-l-4 border-l-green-400">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2">
                        <span className="w-7 h-7 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-sm font-bold">3</span>
                        Offer
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-1">Call to Action</p>
                        <p className="font-semibold text-green-700">{result.funnelOutline.offer.callToAction}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-2">Bonus Ideas</p>
                        <ul className="space-y-1">
                          {result.funnelOutline.offer.bonusIdeas.map((b, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm">
                              <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                              {b}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-1">Urgency Trigger</p>
                        <p className="text-sm">{result.funnelOutline.offer.urgencyTrigger}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-1">Affiliate Angle</p>
                        <p className="text-sm font-medium">{result.funnelOutline.offer.affiliateAngle}</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Backdoor Angles Tab */}
              <TabsContent value="backdoor" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <DoorOpen className="w-5 h-5 text-primary" />
                      Backdoor Traffic Angles
                    </CardTitle>
                    <CardDescription>
                      Non-obvious approaches your competitors are likely ignoring. These target people who are problem-aware but not yet product-aware.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {result.backdoorAngles.map((angle, i) => (
                        <div key={i} className="p-4 rounded-lg border hover:border-primary/40 transition-colors">
                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold shrink-0">
                              {i + 1}
                            </div>
                            <div className="flex-1 space-y-2">
                              <div>
                                <p className="font-semibold">{angle.angle}</p>
                                <p className="text-sm text-muted-foreground">{angle.targetAudience}</p>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                <Badge variant="outline" className="text-xs">{angle.searchIntent}</Badge>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-1">Example Keywords</p>
                                <div className="flex flex-wrap gap-1">
                                  {angle.exampleKeywords.map((kw, j) => (
                                    <span key={j} className="text-xs bg-muted px-2 py-0.5 rounded font-mono">{kw}</span>
                                  ))}
                                </div>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-1">Content Idea</p>
                                <p className="text-sm flex items-start gap-1">
                                  <Lightbulb className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                                  {angle.contentIdea}
                                </p>
                              </div>
                              <div className="bg-muted/50 rounded p-2">
                                <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-1">Why It Works</p>
                                <p className="text-sm">{angle.whyItWorks}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Find Available Domains Tab */}
              <TabsContent value="available" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <ShoppingCart className="w-5 h-5 text-primary" />
                      Find Available Domains
                    </CardTitle>
                    <CardDescription>
                      Search GoDaddy Auctions, Namecheap Marketplace, and generate verified-available fresh registrations based on your niche keywords. All domains are confirmed available at standard registration price.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Trigger Button */}
                    <Button
                      onClick={handleFindAvailable}
                      disabled={findAvailable.isPending}
                      className="w-full sm:w-auto"
                    >
                      {findAvailable.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Searching for available domains... (30–60 seconds)
                        </>
                      ) : (
                        <>
                          <Search className="w-4 h-4 mr-2" />
                          {availableDomains.length > 0 ? "Search Again" : "Find Available Domains"}
                        </>
                      )}
                    </Button>

                    {/* Keywords being searched */}
                    <div className="flex flex-wrap gap-1 items-center">
                      <span className="text-xs text-muted-foreground mr-1">Searching with keywords:</span>
                      {result.primaryKeywords.slice(0, 5).map((k, i) => (
                        <span key={i} className="text-xs bg-muted px-2 py-0.5 rounded font-mono">{k.keyword}</span>
                      ))}
                    </div>

                    {/* Loading state */}
                    {findAvailable.isPending && (
                      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground space-y-3">
                        <Loader2 className="w-10 h-10 animate-spin text-primary" />
                        <p className="text-sm font-medium">Scanning GoDaddy Auctions, Namecheap Marketplace, and generating keyword variations...</p>
                        <p className="text-xs">This checks real availability for every domain — may take up to 60 seconds.</p>
                      </div>
                    )}

                    {/* Results table */}
                    {!findAvailable.isPending && availableDomains.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">
                          Found <strong>{availableDomains.length}</strong> available domain{availableDomains.length !== 1 ? "s" : ""} ready to register or purchase.
                        </p>
                        <div className="overflow-x-auto rounded-lg border">
                          <table className="w-full text-sm">
                            <thead className="bg-muted/50">
                              <tr className="border-b">
                                <th className="text-left py-3 px-4 font-medium">Domain</th>
                                <th className="text-left py-3 px-4 font-medium">Source</th>
                                <th className="text-right py-3 px-4 font-medium">Price</th>
                                <th className="text-center py-3 px-4 font-medium">Brand Score</th>
                                <th className="text-left py-3 px-4 font-medium">Auction Ends</th>
                                <th className="text-center py-3 px-4 font-medium">Action</th>
                              </tr>
                            </thead>
                            <tbody>
                              {availableDomains.map((d, i) => (
                                <tr key={i} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                                  <td className="py-3 px-4">
                                    <div className="flex items-center gap-2">
                                      <span className="font-mono font-semibold">{d.domain}</span>
                                      {d.brandScore >= 80 && (
                                        <span title="High Brand Potential">
                                          <Flame className="w-4 h-4 text-orange-500" />
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                  <td className="py-3 px-4">
                                    <div className="flex items-center gap-1">
                                      {d.isAuction && <Gavel className="w-3 h-3 text-muted-foreground" />}
                                      {getSourceBadge(d.source)}
                                    </div>
                                  </td>
                                  <td className="py-3 px-4 text-right font-medium">
                                    {d.price !== null ? (
                                      <span className={d.price < 20 ? "text-green-700" : d.price < 50 ? "text-amber-700" : "text-foreground"}>
                                        ${d.price.toFixed(2)}
                                      </span>
                                    ) : (
                                      <span className="text-muted-foreground">~$10–15</span>
                                    )}
                                  </td>
                                  <td className="py-3 px-4 text-center">
                                    <div className="flex items-center justify-center gap-1">
                                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${
                                        d.brandScore >= 80 ? "bg-green-100 text-green-800" :
                                        d.brandScore >= 60 ? "bg-yellow-100 text-yellow-800" :
                                        "bg-muted text-muted-foreground"
                                      }`}>
                                        {d.brandScore}/100
                                      </span>
                                    </div>
                                  </td>
                                  <td className="py-3 px-4">
                                    {d.auctionEndDate ? (
                                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                        <Clock className="w-3 h-3" />
                                        {new Date(d.auctionEndDate).toLocaleDateString()}
                                      </div>
                                    ) : (
                                      <span className="text-xs text-muted-foreground">—</span>
                                    )}
                                  </td>
                                  <td className="py-3 px-4 text-center">
                                    {d.buyNowUrl ? (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        asChild
                                        className="text-xs"
                                      >
                                        <a href={d.buyNowUrl} target="_blank" rel="noopener noreferrer">
                                          <ExternalLink className="w-3 h-3 mr-1" />
                                          {d.isAuction ? "Bid" : "Register"}
                                        </a>
                                      </Button>
                                    ) : (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        asChild
                                        className="text-xs"
                                      >
                                        <a
                                          href={`https://www.namecheap.com/domains/registration/results/?domain=${d.domain}`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                        >
                                          <ExternalLink className="w-3 h-3 mr-1" />
                                          Register
                                        </a>
                                      </Button>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* Empty state after search */}
                    {!findAvailable.isPending && availableDomains.length === 0 && findAvailable.isSuccess && (
                      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground space-y-2">
                        <Search className="w-10 h-10 opacity-30" />
                        <p className="font-medium">No available domains found</p>
                        <p className="text-xs text-center max-w-sm">
                          All generated variations were taken or premium-priced. Try running the analysis again with a different product or niche.
                        </p>
                      </div>
                    )}

                    {/* Initial state — not yet searched */}
                    {!findAvailable.isPending && !findAvailable.isSuccess && availableDomains.length === 0 && (
                      <div className="flex flex-col items-center justify-center py-10 text-muted-foreground space-y-2 border-2 border-dashed rounded-lg">
                        <ShoppingCart className="w-10 h-10 opacity-30" />
                        <p className="font-medium">Ready to find purchasable domains</p>
                        <p className="text-xs text-center max-w-sm">
                          Click "Find Available Domains" to search auctions, marketplaces, and generate fresh keyword-based variations — all verified available at standard price.
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </div>
    </div>
  );
}
