import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import Navigation from "@/components/Navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import {
  Upload,
  Loader2,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Shield,
  Clock,
  ExternalLink,
  Sparkles,
  Zap,
  TriangleAlert,
  Globe,
  Filter,
  Target,
  Flame,
  Trophy,
} from "lucide-react";
import { useState, useRef } from "react";
import { toast } from "sonner";
import { getLoginUrl } from "@/const";
import { UsageLimitModal } from "@/components/UsageLimitModal";
import { CooldownTimer } from "@/components/CooldownTimer";

type IntakeGoal = "money_site" | "301_redirect" | "pbn";
type IntakeRisk = "premium" | "high_power";

export default function Analysis() {
  const { user, loading: authLoading } = useAuth();
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [nextAvailableAt, setNextAvailableAt] = useState<Date | undefined>();
  const [showCooldownTimer, setShowCooldownTimer] = useState(false);
  const [enOnly, setEnOnly] = useState(false);

  // Intake form state
  const [intakeStep, setIntakeStep] = useState<"intake" | "upload">("intake");
  const [intakeGoal, setIntakeGoal] = useState<IntakeGoal | null>(null);
  const [intakeNiche, setIntakeNiche] = useState("");
  const [intakeRisk, setIntakeRisk] = useState<IntakeRisk | null>(null);

  const createSession = trpc.analysis.createSession.useMutation({
    onSuccess: (data) => {
      setSessionId(data.sessionId);
      toast.success(`Analysis complete! Found ${data.recommendationCount} recommendations from ${data.domainCount} domains.`);
    },
    onError: (error) => {
      if ((error.data?.code === "FORBIDDEN" || error.data?.code === "TOO_MANY_REQUESTS") && error.message.includes("limit")) {
        const errorData = error.data as any;
        if (errorData?.cause?.nextAvailableAt) {
          const nextTime = new Date(errorData.cause.nextAvailableAt);
          setNextAvailableAt(nextTime);
          setShowCooldownTimer(true);
        }
        setShowLimitModal(true);
      } else {
        toast.error(error.message || "Failed to analyze domains");
      }
    },
  });

  const { data: recommendations, isLoading: loadingRecommendations } = trpc.analysis.getRecommendations.useQuery(
    { sessionId: sessionId! },
    { enabled: !!sessionId }
  );

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      setSessionId(null);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleAnalyze = async () => {
    if (!selectedImage || !imagePreview) return;
    createSession.mutate({
      imageData: imagePreview,
      intakeGoal: intakeGoal ?? undefined,
      intakeNiche: intakeNiche || undefined,
      intakeRiskTolerance: intakeRisk ?? undefined,
    });
  };

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) {
      setSelectedImage(file);
      setSessionId(null);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const intakeComplete = intakeGoal && intakeNiche.trim().length > 0 && intakeRisk;

  const getCategoryStyle = (category?: string) => {
    switch (category) {
      case "hidden_gem": return { border: "border-green-400", bg: "bg-green-50", icon: <Trophy className="w-5 h-5 text-green-600" />, label: "The Hidden Gem", labelClass: "text-green-700 bg-green-100 border-green-300" };
      case "power_play": return { border: "border-blue-400", bg: "bg-blue-50", icon: <Flame className="w-5 h-5 text-blue-600" />, label: "The Power Play", labelClass: "text-blue-700 bg-blue-100 border-blue-300" };
      case "trap": return { border: "border-red-400", bg: "bg-red-50", icon: <TriangleAlert className="w-5 h-5 text-red-600" />, label: "The Trap", labelClass: "text-red-700 bg-red-100 border-red-300" };
      default: return { border: "border-primary/30", bg: "bg-primary/5", icon: <Sparkles className="w-5 h-5 text-primary" />, label: "Recommendation", labelClass: "text-primary bg-primary/10 border-primary/30" };
    }
  };

  if (authLoading) {
    return <div className="flex items-center justify-center min-h-screen"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Sign In Required</CardTitle>
            <CardDescription>Please sign in to analyze domains</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full"><a href={getLoginUrl()}>Sign In</a></Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <UsageLimitModal open={showLimitModal} onClose={() => setShowLimitModal(false)} nextAvailableAt={nextAvailableAt} />

      <div className="container py-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 flex items-center gap-2" style={{ fontFamily: "'Playfair Display', serif" }}>
            <Sparkles className="w-8 h-8 text-primary" />
            Domain Analysis
          </h1>
          <p className="text-muted-foreground text-lg">Upload a SpamZilla screenshot and let your veteran Domain Strategist find the perfect expired domain</p>
        </div>

        {showCooldownTimer && nextAvailableAt && (
          <div className="mb-6">
            <CooldownTimer nextAvailableAt={nextAvailableAt} onExpire={() => { setShowCooldownTimer(false); setNextAvailableAt(undefined); }} />
          </div>
        )}

        {/* PHASE 1: INTAKE FORM */}
        {intakeStep === "intake" && (
          <Card className="mb-8 border-2 border-primary/20">
            <CardHeader className="bg-gradient-to-r from-primary/10 to-primary/5">
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5 text-primary" />
                Step 1: Tell Me About Your Goal
              </CardTitle>
              <CardDescription>
                Before I analyze any domains, I need to understand your objective. The perfect domain for a Money Site is completely different from a PBN burner.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              {/* Question 1: Goal */}
              <div>
                <p className="font-semibold mb-3">1. What are you building?</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { value: "money_site" as IntakeGoal, label: "Money Site", desc: "Clean history, topical relevance required" },
                    { value: "301_redirect" as IntakeGoal, label: "301 Redirect", desc: "Raw link power, topic less critical" },
                    { value: "pbn" as IntakeGoal, label: "PBN Domain", desc: "High metrics, history less critical" },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setIntakeGoal(opt.value)}
                      className={`p-4 rounded-lg border-2 text-left transition-all ${intakeGoal === opt.value ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"}`}
                    >
                      <p className="font-semibold text-sm">{opt.label}</p>
                      <p className="text-xs text-muted-foreground mt-1">{opt.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Question 2: Niche */}
              <div>
                <p className="font-semibold mb-3">2. What is your niche or industry?</p>
                <input
                  type="text"
                  value={intakeNiche}
                  onChange={(e) => setIntakeNiche(e.target.value)}
                  placeholder="e.g. Email Marketing, Pet Supplies, Crypto, Local Plumbing..."
                  className="w-full px-4 py-3 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
                />
              </div>

              {/* Question 3: Risk Tolerance */}
              <div>
                <p className="font-semibold mb-3">3. What is your risk tolerance?</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { value: "premium" as IntakeRisk, label: "Premium / Clean History", desc: "Safer, more expensive — ideal for Money Sites" },
                    { value: "high_power" as IntakeRisk, label: "High-Power Burner", desc: "Riskier, cheaper — acceptable for PBN/301" },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setIntakeRisk(opt.value)}
                      className={`p-4 rounded-lg border-2 text-left transition-all ${intakeRisk === opt.value ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"}`}
                    >
                      <p className="font-semibold text-sm">{opt.label}</p>
                      <p className="text-xs text-muted-foreground mt-1">{opt.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              <Button
                onClick={() => setIntakeStep("upload")}
                disabled={!intakeComplete}
                className="w-full"
                size="lg"
              >
                Continue to Upload
                <Sparkles className="w-4 h-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        )}

        {/* PHASE 2: UPLOAD */}
        {intakeStep === "upload" && (
          <>
            {/* Intake Summary Banner */}
            <div className="mb-4 p-4 bg-primary/5 border border-primary/20 rounded-lg flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3 flex-wrap">
                <Badge variant="outline" className="gap-1"><Target className="w-3 h-3" />{intakeGoal === "money_site" ? "Money Site" : intakeGoal === "301_redirect" ? "301 Redirect" : "PBN"}</Badge>
                <Badge variant="outline" className="gap-1"><Globe className="w-3 h-3" />{intakeNiche}</Badge>
                <Badge variant="outline" className="gap-1"><Shield className="w-3 h-3" />{intakeRisk === "premium" ? "Premium/Clean" : "High-Power Burner"}</Badge>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setIntakeStep("intake")}>Edit</Button>
            </div>

            <Card className="mb-8">
              <CardHeader>
                <CardTitle>Upload SpamZilla Screenshot</CardTitle>
                <CardDescription>Upload a screenshot from SpamZilla or any expired domain marketplace</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div
                  className="border-2 border-dashed rounded-lg p-12 text-center cursor-pointer hover:border-primary transition-colors"
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
                  {imagePreview ? (
                    <div className="space-y-4">
                      <img src={imagePreview} alt="Preview" className="max-h-64 mx-auto rounded border" />
                      <p className="text-sm text-muted-foreground">{selectedImage?.name}</p>
                    </div>
                  ) : (
                    <>
                      <Upload className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                      <p className="text-lg font-medium mb-2">Drop your screenshot here</p>
                      <p className="text-sm text-muted-foreground">or click to browse</p>
                    </>
                  )}
                </div>
                <Button onClick={handleAnalyze} disabled={!selectedImage || createSession.isPending} className="w-full" size="lg">
                  {createSession.isPending ? (
                    <><Loader2 className="w-5 h-5 mr-2 animate-spin" />Analyzing Domains...</>
                  ) : (
                    <><Sparkles className="w-5 h-5 mr-2" />Analyze Domains</>
                  )}
                </Button>
              </CardContent>
            </Card>
          </>
        )}

        {/* RESULTS */}
        {sessionId && (
          <div className="space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-6 h-6 text-green-600" />
                <h2 className="text-2xl font-bold" style={{ fontFamily: "'Playfair Display', serif" }}>
                  Domain Recommendations
                </h2>
              </div>
              {/* EN-Only Filter Toggle */}
              <div className="flex items-center gap-3 p-2 bg-muted/40 rounded-lg border">
                <Globe className="w-4 h-4 text-muted-foreground" />
                <Label htmlFor="en-filter" className="text-sm font-medium cursor-pointer">EN Only</Label>
                <Switch id="en-filter" checked={enOnly} onCheckedChange={setEnOnly} />
                {enOnly && <Badge variant="secondary" className="gap-1"><Filter className="w-3 h-3" />Active</Badge>}
              </div>
            </div>

            {loadingRecommendations ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : recommendations && recommendations.length > 0 ? (
              <div className="space-y-6">
                {recommendations
                  .filter((rec) => {
                    if (!enOnly) return true;
                    const lang = (rec.domain as any).majLang;
                    return !lang || lang.toUpperCase() === "EN";
                  })
                  .map((rec) => {
                    const category = (rec as any).category as string | undefined;
                    const categoryLabel = (rec as any).categoryLabel as string | undefined;
                    const style = getCategoryStyle(category);
                    const domain = rec.domain as any;
                    const isPumpAndDump = domain.drops && domain.drops > 2;

                    return (
                      <Card key={rec.id} className={`overflow-hidden border-2 ${style.border}`}>
                        <CardHeader className={style.bg}>
                          <div className="flex items-start justify-between gap-3 flex-wrap">
                            <div className="flex-1">
                              {/* Category Label */}
                              <div className="flex items-center gap-2 mb-3">
                                {style.icon}
                                <Badge className={`text-sm px-3 py-1 border ${style.labelClass}`}>
                                  {categoryLabel || style.label}
                                </Badge>
                                <Badge variant="outline">#{rec.rank}</Badge>
                              </div>
                              <CardTitle className="text-2xl mb-2">{rec.domain.domainName}</CardTitle>
                              {/* Metrics Row */}
                              <div className="flex items-center gap-3 flex-wrap text-sm">
                                <div className="flex items-center gap-1">
                                  <Shield className="w-4 h-4 text-green-600" />
                                  <span>TF: {rec.domain.trustFlow ?? "N/A"}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <TrendingUp className="w-4 h-4 text-blue-600" />
                                  <span>CF: {rec.domain.citationFlow ?? "N/A"}</span>
                                </div>
                                {rec.domain.age && (
                                  <div className="flex items-center gap-1">
                                    <Clock className="w-4 h-4 text-purple-600" />
                                    <span>{rec.domain.age} yrs</span>
                                  </div>
                                )}
                                <Badge variant="outline">Score: {rec.score}</Badge>

                                {/* TF > CF Quality Signal */}
                                {domain.qualitySignal === "quality" && (
                                  <Badge className="bg-green-100 text-green-800 border-green-300 gap-1 border">
                                    <Zap className="w-3 h-3" />Quality Signal
                                  </Badge>
                                )}
                                {/* Domain Trap badge */}
                                {(domain.qualitySignal === "trap" || category === "trap") && (
                                  <Badge className="bg-red-100 text-red-800 border-red-300 gap-1 border">
                                    <TriangleAlert className="w-3 h-3" />Domain Trap
                                  </Badge>
                                )}

                                {/* SZ Score with colour threshold */}
                                {rec.domain.szScore !== undefined && (
                                  <Badge
                                    variant="outline"
                                    className={
                                      domain.szScoreLevel === "safe"
                                        ? "border-green-400 text-green-700 bg-green-50"
                                        : domain.szScoreLevel === "caution"
                                        ? "border-amber-400 text-amber-700 bg-amber-50"
                                        : "border-red-400 text-red-700 bg-red-50"
                                    }
                                  >
                                    SZ: {rec.domain.szScore}
                                  </Badge>
                                )}

                                {/* Language badge */}
                                {domain.majLang && (
                                  <Badge variant="outline" className="gap-1">
                                    <Globe className="w-3 h-3" />{domain.majLang}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        </CardHeader>

                        <CardContent className="pt-6 space-y-4">
                          {/* Domain Trap Warning */}
                          {(domain.qualitySignal === "trap" || category === "trap") && (
                            <Alert className="border-red-300 bg-red-50">
                              <TriangleAlert className="w-4 h-4 text-red-600" />
                              <AlertDescription className="text-red-800 text-sm">
                                <strong>Domain Trap Detected:</strong> This domain has high surface metrics but dangerous underlying signals — likely a hollow building of junk links or a repurposed spam site. The AI has flagged this so you know what to avoid.
                              </AlertDescription>
                            </Alert>
                          )}

                          {/* Quality Signal explanation */}
                          {domain.qualitySignal === "quality" && category !== "trap" && (
                            <Alert className="border-green-300 bg-green-50">
                              <Zap className="w-4 h-4 text-green-600" />
                              <AlertDescription className="text-green-800 text-sm">
                                <strong>Quality Signal:</strong> Trust Flow exceeds Citation Flow — links are coming from reputable, editorially-given sources, not automated spam networks. This is a strong positive indicator.
                              </AlertDescription>
                            </Alert>
                          )}

                          {/* Pump and Dump Warning */}
                          {isPumpAndDump && (
                            <Alert className="border-amber-300 bg-amber-50">
                              <AlertCircle className="w-4 h-4 text-amber-600" />
                              <AlertDescription className="text-amber-800 text-sm">
                                <strong>Pump &amp; Dump History:</strong> This domain has dropped {domain.drops} times. Frequent drops suggest the domain was repeatedly built up and abandoned — a classic manipulation pattern. Verify carefully on Archive.org.
                              </AlertDescription>
                            </Alert>
                          )}

                          {/* Topics */}
                          {rec.domain.majTopics && (
                            <div>
                              <p className="text-sm font-semibold mb-2">Topics:</p>
                              <div className="flex flex-wrap gap-2">
                                {rec.domain.majTopics.split(",").map((topic, i) => (
                                  <Badge key={i} variant="secondary">{topic.trim()}</Badge>
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
                              <a href={`https://web.archive.org/web/*/${rec.domain.domainName}`} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="w-4 h-4 mr-1" />Archive.org
                              </a>
                            </Button>
                            <Button variant="outline" size="sm" asChild>
                              <a href={`https://www.google.com/search?q=site:${rec.domain.domainName}`} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="w-4 h-4 mr-1" />Google Index
                              </a>
                            </Button>
                            <Button variant="outline" size="sm" asChild>
                              <a href={`https://ahrefs.com/site-explorer/overview/v2/subdomains/live?target=${rec.domain.domainName}`} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="w-4 h-4 mr-1" />Ahrefs
                              </a>
                            </Button>
                            <Button variant="outline" size="sm" asChild>
                              <a href={`https://app.ahrefs.com/site-explorer/anchors/v2/subdomains/live?target=${rec.domain.domainName}`} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="w-4 h-4 mr-1" />Anchor Text
                              </a>
                            </Button>
                            <Button variant="outline" size="sm" asChild>
                              <a href={`https://www.semrush.com/analytics/backlinks/backlinks/?target=${rec.domain.domainName}&targetType=domain`} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="w-4 h-4 mr-1" />Backlink TLDs
                              </a>
                            </Button>
                            <Button variant="outline" size="sm" asChild>
                              <a href={`https://www.uspto.gov/trademarks/search?query=${rec.domain.domainName.split(".")[0]}`} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="w-4 h-4 mr-1" />USPTO Trademark
                              </a>
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
              </div>
            ) : (
              <Alert>
                <AlertCircle className="w-4 h-4" />
                <AlertDescription>
                  <div className="space-y-3">
                    <p className="font-semibold">No recommendations found. This could mean:</p>
                    <ul className="list-disc ml-6 space-y-1">
                      <li>The screenshot quality was too low to extract domain data</li>
                      <li>No domains with sufficient metrics were found in the image</li>
                      <li>Try uploading a clearer screenshot from SpamZilla or similar marketplace</li>
                    </ul>
                    <div className="pt-2 border-t">
                      <p className="text-sm">
                        💡 <strong>Tip:</strong> All your analysis results are automatically saved to the{" "}
                        <a href="/history" className="text-primary hover:underline font-semibold">History page</a>,
                        even if no recommendations were generated.
                      </p>
                    </div>
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
