import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import Navigation from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { trpc } from "@/lib/trpc";
import { 
  Loader2, 
  Shield, 
  TrendingUp, 
  Clock, 
  ExternalLink,
  Sparkles,
  AlertCircle,
  ArrowLeft,
  GitCompare,
  Download,
  Search,
  Key,
  FolderPlus,
  Star,
  ShoppingCart,
  ChevronDown,
  Globe
} from "lucide-react";
import { getLoginUrl } from "@/const";
import { Link, useRoute } from "wouter";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function AnalysisResults() {
  const { user, loading: authLoading } = useAuth();
  const [, params] = useRoute("/analysis/:id");
  const sessionId = params?.id ? parseInt(params.id) : null;
  const [selectedDomains, setSelectedDomains] = useState<number[]>([]);
  const [availabilityModal, setAvailabilityModal] = useState<{ open: boolean; domain: string; data: any }>({ open: false, domain: "", data: null });
  const [keywordsModal, setKeywordsModal] = useState<{ open: boolean; domain: string; data: any }>({ open: false, domain: "", data: null });
  const [tldModal, setTldModal] = useState<{ open: boolean; domain: string; data: any }>({ open: false, domain: "", data: null });
  const [checkingDomain, setCheckingDomain] = useState<string | null>(null);
  const [extractingDomain, setExtractingDomain] = useState<string | null>(null);
  const [checkingTlds, setCheckingTlds] = useState<string | null>(null);

  const addToProject = trpc.projects.addDomain.useMutation({
    onSuccess: () => {
      toast.success("Domain added to project successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to add domain to project");
    },
  });

  const addToWatchlistMutation = trpc.watchlist.addByName.useMutation({
    onSuccess: () => {
      toast.success("Domain added to watchlist successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to add domain to watchlist");
    },
  });

  const { data: userProjects } = trpc.projects.list.useQuery();

  const extractKeywords = trpc.keywords.extract.useMutation({
    onSuccess: (data: any, variables: any) => {
      setKeywordsModal({ open: true, domain: variables.domain, data });
      setExtractingDomain(null);
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to extract keywords");
      setExtractingDomain(null);
    },
  });

  const { data: availabilityData, refetch: refetchAvailability, isLoading: isCheckingAvailability } = trpc.domainAvailability.check.useQuery(
    { domain: checkingDomain || "" },
    { enabled: !!checkingDomain }
  );

  useEffect(() => {
    if (availabilityData && checkingDomain) {
      setAvailabilityModal({ open: true, domain: checkingDomain, data: availabilityData });
      setCheckingDomain(null);
    }
  }, [availabilityData, checkingDomain]);

  const handleCheckAvailability = (domain: string) => {
    setCheckingDomain(domain);
  };

  const checkTlds = trpc.domainAvailability.checkTlds.useQuery(
    { baseDomain: checkingTlds?.split('.')[0] || '' },
    { enabled: !!checkingTlds }
  );

  useEffect(() => {
    if (checkTlds.data && checkingTlds) {
      setTldModal({ open: true, domain: checkingTlds, data: checkTlds.data });
      setCheckingTlds(null);
    }
  }, [checkTlds.data, checkingTlds]);

  const handleShowTlds = async (domain: string) => {
    setCheckingTlds(domain);
  };

  const { data: recommendations, isLoading } = trpc.analysis.getRecommendations.useQuery(
    { sessionId: sessionId! },
    { enabled: !!sessionId && !!user }
  );

  const handleSelectDomain = (domainId: number, checked: boolean) => {
    if (checked) {
      setSelectedDomains([...selectedDomains, domainId]);
    } else {
      setSelectedDomains(selectedDomains.filter(id => id !== domainId));
    }
  };

  const handleCompare = () => {
    if (selectedDomains.length < 2) {
      toast.error("Please select at least 2 domains to compare");
      return;
    }
    // Navigate to comparison page
    window.location.href = `/compare?domains=${selectedDomains.join(",")}`;
  };

  const exportPDF = trpc.analysis.exportPDF.useMutation({
    onSuccess: (data) => {
      const link = document.createElement("a");
      link.href = data.url;
      link.download = `domain-analysis-${sessionId}.pdf`;
      link.click();
      toast.success("PDF exported successfully!");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to export PDF");
    },
  });

  const handleExportPDF = () => {
    if (!sessionId) return;
    exportPDF.mutate({ sessionId });
  };

  const handleExportCSV = () => {
    if (!recommendations) return;

    const csvData = recommendations.map(rec => ({
      Rank: rec.rank,
      Domain: rec.domain.domainName,
      TrustFlow: rec.domain.trustFlow || "",
      CitationFlow: rec.domain.citationFlow || "",
      Topics: rec.domain.majTopics || "",
      Age: rec.domain.age || "",
      Score: rec.score,
      Reasoning: rec.reasoning.replace(/,/g, ";"),
    }));

    const headers = Object.keys(csvData[0] || {}).join(",");
    const rows = csvData.map(row => Object.values(row).join(","));
    const csv = [headers, ...rows].join("\\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `domain-analysis-${sessionId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exported successfully!");
  };

  if (authLoading) {
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

  if (!sessionId) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Alert>
          <AlertCircle className="w-4 h-4" />
          <AlertDescription>Invalid session ID</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container py-8 max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <Button variant="ghost" asChild className="mb-4">
            <Link href="/history">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to History
            </Link>
          </Button>
          
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-4xl font-bold mb-2 flex items-center gap-2" style={{ fontFamily: "'Playfair Display', serif" }}>
                <Sparkles className="w-8 h-8 text-primary" />
                Analysis Results
              </h1>
              <p className="text-muted-foreground text-lg">
                Session #{sessionId}
              </p>
            </div>
            
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleExportCSV}>
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
              <Button variant="outline" onClick={handleExportPDF}>
                <Download className="w-4 h-4 mr-2" />
                Export PDF
              </Button>
            </div>
          </div>
        </div>

        {/* Compare Button */}
        {selectedDomains.length > 0 && (
          <div className="mb-6">
            <Button onClick={handleCompare} size="lg" className="w-full">
              <GitCompare className="w-5 h-5 mr-2" />
              Compare Selected Domains ({selectedDomains.length})
            </Button>
          </div>
        )}

        {/* Results */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : recommendations && recommendations.length > 0 ? (
          <div className="space-y-6">
            {recommendations.map((rec) => (
              <Card key={rec.id} className="overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-primary/10 to-primary/5">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <Checkbox
                        checked={selectedDomains.includes(rec.domainId)}
                        onCheckedChange={(checked) => handleSelectDomain(rec.domainId, checked as boolean)}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <Badge variant="default" className="text-lg px-3 py-1">
                            #{rec.rank}
                          </Badge>
                          <CardTitle className="text-2xl">{rec.domain.domainName}</CardTitle>
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                          <div className="flex items-center gap-1">
                            <Shield className="w-4 h-4 text-green-600" />
                            <span>TF: {rec.domain.trustFlow || "N/A"}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <TrendingUp className="w-4 h-4 text-blue-600" />
                            <span>CF: {rec.domain.citationFlow || "N/A"}</span>
                          </div>
                          {rec.domain.age && (
                            <div className="flex items-center gap-1">
                              <Clock className="w-4 h-4 text-purple-600" />
                              <span>{rec.domain.age} years</span>
                            </div>
                          )}
                          <Badge variant="outline">Score: {rec.score}</Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-6 space-y-4">
                  {/* Topics */}
                  {rec.domain.majTopics && (
                    <div>
                      <p className="text-sm font-semibold mb-2">Topics:</p>
                      <div className="flex flex-wrap gap-2">
                        {rec.domain.majTopics.split(",").map((topic, i) => (
                          <Badge key={i} variant="secondary">
                            {topic.trim()}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  <Separator />

                  {/* AI Reasoning */}
                  <div>
                    <p className="text-sm font-semibold mb-2 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-primary" />
                      Why This Domain?
                    </p>
                    <p className="text-sm leading-relaxed">{rec.reasoning}</p>
                  </div>

                  <Separator />

                  {/* Sherlock Analysis */}
                  <div>
                    <p className="text-sm font-semibold mb-2">🔍 Sherlock Check:</p>
                    <p className="text-sm leading-relaxed">{rec.sherlockAnalysis}</p>
                  </div>

                  <Separator />

                  {/* Due Diligence Checklist */}
                  <div>
                    <p className="text-sm font-semibold mb-3">✅ Due Diligence Checklist:</p>
                    <div className="space-y-2">
                      {rec.dueDiligenceChecklist.map((item: string, i: number) => (
                        <Alert key={i}>
                          <AlertCircle className="w-4 h-4" />
                          <AlertDescription className="text-sm">{item}</AlertDescription>
                        </Alert>
                      ))}
                    </div>
                  </div>

                  {/* Quick Links */}
                  <div className="flex flex-wrap gap-2 pt-2">
                    <Button variant="outline" size="sm" asChild>
                      <a
                        href={`https://web.archive.org/web/*/${rec.domain.domainName}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="w-4 h-4 mr-1" />
                        Archive.org
                      </a>
                    </Button>
                    <Button variant="outline" size="sm" asChild>
                      <a
                        href={`https://www.google.com/search?q=site:${rec.domain.domainName}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="w-4 h-4 mr-1" />
                        Google Index
                      </a>
                    </Button>
                    <Button variant="outline" size="sm" asChild>
                      <a
                        href={`https://ahrefs.com/site-explorer/overview/v2/subdomains/live?target=${rec.domain.domainName}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="w-4 h-4 mr-1" />
                        Ahrefs
                      </a>
                    </Button>
                    <Button 
                      variant="default" 
                      size="sm"
                      disabled={!userProjects || userProjects.length === 0 || addToProject.isPending}
                      onClick={() => {
                        if (userProjects && userProjects.length > 0) {
                          // Use first project for now
                          addToProject.mutate({
                            projectId: userProjects[0].id,
                            domainName: rec.domain.domainName,
                          });
                        } else {
                          toast.error("Please create a project first");
                        }
                      }}
                    >
                      {addToProject.isPending ? (
                        <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                      ) : (
                        <FolderPlus className="w-4 h-4 mr-1" />
                      )}
                      Add to Project
                    </Button>
                    <Button 
                      variant="default" 
                      size="sm"
                      disabled={addToWatchlistMutation.isPending}
                      onClick={() => {
                        addToWatchlistMutation.mutate({
                          domainName: rec.domain.domainName,
                        });
                      }}
                    >
                      {addToWatchlistMutation.isPending ? (
                        <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                      ) : (
                        <Star className="w-4 h-4 mr-1" />
                      )}
                      Add to Watchlist
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="default" size="sm">
                          <ShoppingCart className="w-4 h-4 mr-1" />
                          Buy Now
                          <ChevronDown className="w-4 h-4 ml-1" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem asChild>
                          <a
                            href={`https://www.namecheap.com/domains/registration/results/?domain=${rec.domain.domainName}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="cursor-pointer"
                          >
                            Namecheap
                          </a>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <a
                            href={`https://www.godaddy.com/domainsearch/find?domainToCheck=${rec.domain.domainName}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="cursor-pointer"
                          >
                            GoDaddy
                          </a>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <a
                            href={`https://porkbun.com/checkout/search?q=${rec.domain.domainName}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="cursor-pointer"
                          >
                            Porkbun
                          </a>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <a
                            href={`https://www.hostinger.com/domain-name-search?domain=${rec.domain.domainName}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="cursor-pointer"
                          >
                            Hostinger
                          </a>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleCheckAvailability(rec.domain.domainName)}
                      disabled={checkingDomain === rec.domain.domainName}
                    >
                      {checkingDomain === rec.domain.domainName ? (
                        <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                      ) : (
                        <Search className="w-4 h-4 mr-1" />
                      )}
                      Check Availability
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => extractKeywords.mutate({ domain: rec.domain.domainName })}
                      disabled={extractingDomain === rec.domain.domainName}
                    >
                      {extractingDomain === rec.domain.domainName ? (
                        <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                      ) : (
                        <Key className="w-4 h-4 mr-1" />
                      )}
                      Extract Keywords
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleShowTlds(rec.domain.domainName)}
                      disabled={checkingTlds === rec.domain.domainName}
                    >
                      {checkingTlds === rec.domain.domainName ? (
                        <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                      ) : (
                        <Globe className="w-4 h-4 mr-1" />
                      )}
                      Show Alternative TLDs
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Alert>
            <AlertCircle className="w-4 h-4" />
            <AlertDescription>No recommendations found for this session.</AlertDescription>
          </Alert>
        )}

        {/* Availability Modal */}
        <Dialog open={availabilityModal.open} onOpenChange={(open) => setAvailabilityModal({ ...availabilityModal, open })}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Domain Availability: {availabilityModal.domain}</DialogTitle>
              <DialogDescription>
                Check domain availability across multiple registrars
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              {availabilityModal.data && availabilityModal.data.length > 0 ? (
                availabilityModal.data.map((result: any, index: number) => (
                  <Card key={index}>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center justify-between">
                        <span>{result.registrar}</span>
                        <Badge variant={result.available ? "default" : "secondary"}>
                          {result.available ? "Available" : "Taken"}
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {result.price && (
                        <p className="text-sm">
                          <strong>Price:</strong> ${result.price}
                        </p>
                      )}
                      {result.error && (
                        <Alert variant="destructive">
                          <AlertCircle className="w-4 h-4" />
                          <AlertDescription>{result.error}</AlertDescription>
                        </Alert>
                      )}
                    </CardContent>
                  </Card>
                ))
              ) : (
                <Alert>
                  <AlertCircle className="w-4 h-4" />
                  <AlertDescription>No availability data found</AlertDescription>
                </Alert>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Keywords Modal */}
        <Dialog open={keywordsModal.open} onOpenChange={(open) => setKeywordsModal({ ...keywordsModal, open })}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Extracted Keywords: {keywordsModal.domain}</DialogTitle>
              <DialogDescription>
                Keywords extracted from historical content via Archive.org
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6 mt-4">
              {keywordsModal.data ? (
                <>
                  {/* Regular Keywords */}
                  {keywordsModal.data.keywords && keywordsModal.data.keywords.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold mb-3">Top Keywords ({keywordsModal.data.keywords.length})</h3>
                      <div className="flex flex-wrap gap-2">
                        {keywordsModal.data.keywords.map((keyword: string, index: number) => (
                          <Badge key={index} variant="secondary">
                            {keyword}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  <Separator />

                  {/* Long-tail Keywords */}
                  {keywordsModal.data.longTailKeywords && keywordsModal.data.longTailKeywords.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold mb-3">Long-tail Keywords ({keywordsModal.data.longTailKeywords.length})</h3>
                      <div className="flex flex-wrap gap-2">
                        {keywordsModal.data.longTailKeywords.map((keyword: string, index: number) => (
                          <Badge key={index} variant="outline">
                            {keyword}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Export Buttons */}
                  <div className="flex gap-2 pt-4">
                    <Button
                      variant="outline"
                      onClick={() => {
                        const allKeywords = [
                          ...(keywordsModal.data.keywords || []),
                          ...(keywordsModal.data.longTailKeywords || [])
                        ];
                        const csv = "Keyword\\n" + allKeywords.join("\\n");
                        const blob = new Blob([csv], { type: "text/csv" });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = `keywords-${keywordsModal.domain}.csv`;
                        a.click();
                        URL.revokeObjectURL(url);
                        toast.success("Keywords exported to CSV");
                      }}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Export CSV
                    </Button>
                  </div>
                </>
              ) : (
                <Alert>
                  <AlertCircle className="w-4 h-4" />
                  <AlertDescription>No keywords found</AlertDescription>
                </Alert>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Alternative TLDs Modal */}
        <Dialog open={tldModal.open} onOpenChange={(open) => !open && setTldModal({ open: false, domain: "", data: null })}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Alternative TLDs for: {tldModal.domain}</DialogTitle>
              <DialogDescription>
                Explore different domain extensions with pricing and availability
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              {tldModal.data && tldModal.data.length > 0 ? (
                <div className="space-y-2">
                  {tldModal.data.map((item: any, index: number) => (
                    <Card key={index} className={item.available ? "border-green-500/50" : "border-red-500/50"}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Globe className="w-5 h-5 text-primary" />
                            <div>
                              <p className="font-semibold text-lg">{item.domain}</p>
                              <Badge variant={item.available ? "default" : "secondary"}>
                                {item.available ? "Available" : "Taken"}
                              </Badge>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            {item.available && (
                              <>
                                <span className="text-xl font-bold">${item.price}/yr</span>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button size="sm">
                                      <ShoppingCart className="w-4 h-4 mr-1" />
                                      Buy Now
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent>
                                    <DropdownMenuItem asChild>
                                      <a
                                        href={`https://www.namecheap.com/domains/registration/results/?domain=${item.domain}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="cursor-pointer"
                                      >
                                        Namecheap
                                      </a>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem asChild>
                                      <a
                                        href={`https://www.godaddy.com/domainsearch/find?domainToCheck=${item.domain}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="cursor-pointer"
                                      >
                                        GoDaddy
                                      </a>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem asChild>
                                      <a
                                        href={`https://porkbun.com/checkout/search?q=${item.domain}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="cursor-pointer"
                                      >
                                        Porkbun
                                      </a>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem asChild>
                                      <a
                                        href={`https://www.hostinger.com/domain-name-search?domain=${item.domain}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="cursor-pointer"
                                      >
                                        Hostinger
                                      </a>
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Alert>
                  <AlertCircle className="w-4 h-4" />
                  <AlertDescription>No TLD data available</AlertDescription>
                </Alert>
              )}
              {user?.plan === "free" && (
                <Alert>
                  <AlertCircle className="w-4 h-4" />
                  <AlertDescription>
                    Free plan shows 3 TLD alternatives. Upgrade to Pro to see all 10+ TLDs with real-time availability.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </DialogContent>
        </Dialog>

      </div>
    </div>
  );
}
