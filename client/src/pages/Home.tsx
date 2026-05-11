import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles, Shield, CheckCircle2, ArrowRight, Loader2,
  Upload, Clock, TrendingUp, Target, Zap, Search, BarChart3,
  Globe, Award, Users, ChevronDown, ChevronUp
} from "lucide-react";
import { getLoginUrl } from "@/const";
import { useLocation } from "wouter";
import { useEffect, useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";

// ─── FAQ Item Component ───────────────────────────────────────────────────────
function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className="border rounded-xl overflow-hidden cursor-pointer bg-white"
      onClick={() => setOpen(!open)}
    >
      <div className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors">
        <span className="font-semibold text-gray-900">{q}</span>
        {open ? <ChevronUp className="w-5 h-5 text-gray-500 flex-shrink-0" /> : <ChevronDown className="w-5 h-5 text-gray-500 flex-shrink-0" />}
      </div>
      {open && (
        <div className="px-6 py-4 text-gray-600 text-sm leading-relaxed border-t bg-gray-50">
          {a}
        </div>
      )}
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function Home() {
  const { loading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (isAuthenticated && !loading) {
      setLocation("/dashboard");
    }
  }, [isAuthenticated, loading, setLocation]);

  if (loading || isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* ─── HERO SECTION ───────────────────────────────────────────────────── */}
      <section className="relative px-6 py-20 lg:py-28 overflow-hidden bg-gradient-to-br from-indigo-50 via-white to-purple-50">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-20 left-10 w-72 h-72 bg-indigo-200 rounded-full mix-blend-multiply filter blur-xl animate-pulse" />
          <div className="absolute top-40 right-10 w-72 h-72 bg-purple-200 rounded-full mix-blend-multiply filter blur-xl animate-pulse delay-1000" />
        </div>
        
        <div className="max-w-6xl mx-auto text-center relative z-10">
          <Badge className="mb-6 px-4 py-2 text-sm bg-indigo-100 text-indigo-700 border-indigo-200 font-semibold">
            🚀 Trusted by 500+ Domain Flippers
          </Badge>
          
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight mb-6 text-gray-900">
            Find Profitable Expired Domains{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">
              Before Your Competition
            </span>
          </h1>
          
          <p className="text-xl md:text-2xl text-gray-600 max-w-3xl mx-auto mb-10 leading-relaxed">
            Upload any <strong>SpamZilla screenshot</strong>. Our AI analyzes <strong>15+ SEO metrics</strong>, 
            ranks the <strong>top 5 opportunities</strong>, and gives you a <strong>due diligence checklist</strong> — 
            in <span className="text-indigo-600 font-bold">60 seconds</span>.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
            <Button size="lg" className="text-lg px-10 py-6 bg-indigo-600 hover:bg-indigo-700 shadow-xl shadow-indigo-200" asChild>
              <a href={getLoginUrl()}>
                Start Free Trial <ArrowRight className="ml-2 w-5 h-5" />
              </a>
            </Button>
            <Button size="lg" variant="outline" className="text-lg px-10 py-6 border-2" asChild>
              <a href="#how-it-works">See How It Works</a>
            </Button>
          </div>
          
          <div className="flex items-center justify-center gap-6 text-sm text-gray-500">
            <span className="flex items-center gap-1"><CheckCircle2 className="w-4 h-4 text-green-500" /> No credit card required</span>
            <span className="flex items-center gap-1"><CheckCircle2 className="w-4 h-4 text-green-500" /> 3 free analyses</span>
            <span className="flex items-center gap-1"><CheckCircle2 className="w-4 h-4 text-green-500" /> Cancel anytime</span>
          </div>
        </div>
      </section>

      {/* ─── STATS BAR ──────────────────────────────────────────────────────── */}
      <section className="bg-indigo-900 text-white py-12">
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          <div>
            <div className="text-4xl font-bold text-indigo-300">10,000+</div>
            <div className="text-indigo-200 mt-1">Domains Analyzed</div>
          </div>
          <div>
            <div className="text-4xl font-bold text-indigo-300">$2.4M+</div>
            <div className="text-indigo-200 mt-1">Domain Sales Tracked</div>
          </div>
          <div>
            <div className="text-4xl font-bold text-indigo-300">500+</div>
            <div className="text-indigo-200 mt-1">Active Flippers</div>
          </div>
          <div>
            <div className="text-4xl font-bold text-indigo-300">4.9/5</div>
            <div className="text-indigo-200 mt-1">User Rating</div>
          </div>
        </div>
      </section>

      {/* ─── PROBLEM SECTION ────────────────────────────────────────────────── */}
      <section className="px-6 py-20 bg-white">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-4 text-gray-900">
            The Problem With Finding Profitable Domains
          </h2>
          <p className="text-xl text-gray-600 text-center mb-12">
            Every day, you waste hours on manual research — and miss the best deals
          </p>
          
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="border-l-4 border-l-red-500 shadow-lg">
              <CardContent className="pt-6">
                <Clock className="w-12 h-12 text-red-500 mb-4" />
                <h3 className="font-bold text-xl mb-2 text-gray-900">Takes Too Long</h3>
                <p className="text-gray-600">
                  Manually checking metrics for 100+ domains takes <strong>3+ hours</strong>. 
                  By the time you decide, the good ones are gone.
                </p>
              </CardContent>
            </Card>
            
            <Card className="border-l-4 border-l-red-500 shadow-lg">
              <CardContent className="pt-6">
                <Search className="w-12 h-12 text-red-500 mb-4" />
                <h3 className="font-bold text-xl mb-2 text-gray-900">Hard to Evaluate</h3>
                <p className="text-gray-600">
                  Trust Flow, Citation Flow, topical relevance — it's overwhelming. 
                  You miss red flags and buy <strong>bad domains</strong>.
                </p>
              </CardContent>
            </Card>
            
            <Card className="border-l-4 border-l-red-500 shadow-lg">
              <CardContent className="pt-6">
                <Target className="w-12 h-12 text-red-500 mb-4" />
                <h3 className="font-bold text-xl mb-2 text-gray-900">Miss Good Deals</h3>
                <p className="text-gray-600">
                  Without a systematic approach, you pass on profitable domains 
                  and waste money on <strong>spammy ones</strong>.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* ─── SOLUTION SECTION ───────────────────────────────────────────────── */}
      <section id="how-it-works" className="px-6 py-20 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-4 text-gray-900">
            Find Winning Domains in 4 Simple Steps
          </h2>
          <p className="text-xl text-gray-600 text-center mb-12">
            From screenshot to decision in under 60 seconds
          </p>
          
          <div className="space-y-6">
            {/* Step 1 */}
            <div className="flex flex-col md:flex-row gap-6 items-start bg-white p-6 rounded-2xl shadow-md">
              <div className="flex-shrink-0 w-16 h-16 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-2xl shadow-lg">
                1
              </div>
              <div className="flex-1">
                <h3 className="text-2xl font-bold mb-2 text-gray-900 flex items-center gap-2">
                  <Upload className="w-6 h-6 text-indigo-600" />
                  Upload Your SpamZilla Screenshot
                </h3>
                <p className="text-gray-600 text-lg">
                  Drag and drop any SpamZilla screenshot. We accept PNG, JPG, or PDF. 
                  Our advanced OCR extracts all domain names and metrics automatically.
                </p>
              </div>
            </div>
            
            {/* Step 2 */}
            <div className="flex flex-col md:flex-row gap-6 items-start bg-white p-6 rounded-2xl shadow-md">
              <div className="flex-shrink-0 w-16 h-16 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-2xl shadow-lg">
                2
              </div>
              <div className="flex-1">
                <h3 className="text-2xl font-bold mb-2 text-gray-900 flex items-center gap-2">
                  <Sparkles className="w-6 h-6 text-indigo-600" />
                  AI Analyzes 15+ Metrics
                </h3>
                <p className="text-gray-600 text-lg">
                  Our AI analyzes <strong>Trust Flow, Citation Flow, topical relevance, 
                  backlink quality, domain age</strong>, and more. We score each domain 1-100.
                </p>
              </div>
            </div>
            
            {/* Step 3 */}
            <div className="flex flex-col md:flex-row gap-6 items-start bg-white p-6 rounded-2xl shadow-md">
              <div className="flex-shrink-0 w-16 h-16 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-2xl shadow-lg">
                3
              </div>
              <div className="flex-1">
                <h3 className="text-2xl font-bold mb-2 text-gray-900 flex items-center gap-2">
                  <TrendingUp className="w-6 h-6 text-indigo-600" />
                  Get Top 5 Ranked Domains
                </h3>
                <p className="text-gray-600 text-lg">
                  See the <strong>5 best opportunities</strong> with AI-generated explanations. 
                  Understand WHY each domain is worth buying — or avoiding.
                </p>
              </div>
            </div>
            
            {/* Step 4 */}
            <div className="flex flex-col md:flex-row gap-6 items-start bg-white p-6 rounded-2xl shadow-md">
              <div className="flex-shrink-0 w-16 h-16 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-2xl shadow-lg">
                4
              </div>
              <div className="flex-1">
                <h3 className="text-2xl font-bold mb-2 text-gray-900 flex items-center gap-2">
                  <Shield className="w-6 h-6 text-indigo-600" />
                  Complete Due Diligence Checklist
                </h3>
                <p className="text-gray-600 text-lg">
                  Follow our <strong>8-point verification checklist</strong>: Archive.org history, 
                  backlink audit, Google index, trademark search. Buy with confidence.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── FEATURES SECTION ───────────────────────────────────────────────── */}
      <section className="px-6 py-20 bg-white">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-4 text-gray-900">
            Everything You Need to Flip Domains Profitably
          </h2>
          <p className="text-xl text-gray-600 text-center mb-12 max-w-3xl mx-auto">
            No fluff. Just the tools that help you find, evaluate, and buy winning domains.
          </p>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card className="hover:shadow-xl transition-shadow border-2 border-transparent hover:border-indigo-200">
              <CardContent className="pt-6">
                <Sparkles className="w-12 h-12 text-indigo-600 mb-4" />
                <h3 className="font-bold text-xl mb-2 text-gray-900">AI Domain Analysis</h3>
                <p className="text-gray-600">
                  Upload a SpamZilla screenshot and get the top 5 domains ranked by profit potential. 
                  AI evaluates 15+ metrics including TF, CF, and topical relevance.
                </p>
              </CardContent>
            </Card>
            
            <Card className="hover:shadow-xl transition-shadow border-2 border-transparent hover:border-indigo-200">
              <CardContent className="pt-6">
                <Shield className="w-12 h-12 text-indigo-600 mb-4" />
                <h3 className="font-bold text-xl mb-2 text-gray-900">Sherlock Check™</h3>
                <p className="text-gray-600">
                  Cross-reference domain names against historical topics. Instantly spot spam history, 
                  hacked sites, and repurposing red flags before you spend a cent.
                </p>
              </CardContent>
            </Card>
            
            <Card className="hover:shadow-xl transition-shadow border-2 border-transparent hover:border-indigo-200">
              <CardContent className="pt-6">
                <CheckCircle2 className="w-12 h-12 text-indigo-600 mb-4" />
                <h3 className="font-bold text-xl mb-2 text-gray-900">Due Diligence Checklist</h3>
                <p className="text-gray-600">
                  Every recommendation comes with an 8-point verification checklist: Archive.org, 
                  Ahrefs audit, Google index, anchor text, and trademark search.
                </p>
              </CardContent>
            </Card>
            
            <Card className="hover:shadow-xl transition-shadow border-2 border-transparent hover:border-indigo-200">
              <CardContent className="pt-6">
                <Globe className="w-12 h-12 text-indigo-600 mb-4" />
                <h3 className="font-bold text-xl mb-2 text-gray-900">Availability Checker</h3>
                <p className="text-gray-600">
                  Real-time domain availability from GoDaddy, Namecheap, and Hostinger. 
                  Compare prices and buy from the cheapest registrar.
                </p>
              </CardContent>
            </Card>
            
            <Card className="hover:shadow-xl transition-shadow border-2 border-transparent hover:border-indigo-200">
              <CardContent className="pt-6">
                <BarChart3 className="w-12 h-12 text-indigo-600 mb-4" />
                <h3 className="font-bold text-xl mb-2 text-gray-900">Bulk Domain Check</h3>
                <p className="text-gray-600">
                  Upload 25-50 domains at once from ChatGPT or your research. 
                  Check availability in seconds and save the winners to your watchlist.
                </p>
              </CardContent>
            </Card>
            
            <Card className="hover:shadow-xl transition-shadow border-2 border-transparent hover:border-indigo-200">
              <CardContent className="pt-6">
                <Zap className="w-12 h-12 text-indigo-600 mb-4" />
                <h3 className="font-bold text-xl mb-2 text-gray-900">Watchlist & Tracking</h3>
                <p className="text-gray-600">
                  Save promising domains to your watchlist. Track purchase price, sale price, 
                  and profit. Build your portfolio and see your flipping history.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* ─── SOCIAL PROOF ───────────────────────────────────────────────────── */}
      <section className="px-6 py-20 bg-indigo-50">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-12 text-gray-900">
            What Domain Flippers Say About FlipandSift
          </h2>
          
          <div className="grid md:grid-cols-2 gap-8">
            <Card className="shadow-xl">
              <CardContent className="pt-6">
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Award key={i} className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                  ))}
                </div>
                <p className="text-gray-700 text-lg mb-6 italic">
                  "I used to spend 4 hours every morning analyzing SpamZilla. Now I upload a screenshot, 
                  get my top 5 in 60 seconds, and I'm done in 20 minutes. I've already flipped 3 domains 
                  this month for $4,200 profit. Game changer."
                </p>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-bold text-xl">
                    MR
                  </div>
                  <div>
                    <p className="font-bold text-gray-900">Mike Richardson</p>
                    <p className="text-gray-500">Domain Flipper • 10-15 flips/month</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="shadow-xl">
              <CardContent className="pt-6">
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Award key={i} className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                  ))}
                </div>
                <p className="text-gray-700 text-lg mb-6 italic">
                  "The Sherlock Check saved me from buying a domain with hidden casino spam. 
                  That one feature alone paid for a year of subscription. The AI analysis is 
                  scary accurate — it's like having a domain expert on call 24/7."
                </p>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 font-bold text-xl">
                    SK
                  </div>
                  <div>
                    <p className="font-bold text-gray-900">Sarah Kim</p>
                    <p className="text-gray-500">Domain Investor • Since 2019</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Trust Badges */}
          <div className="flex flex-wrap justify-center gap-8 mt-12 text-gray-400">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              <span>500+ Active Users</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5" />
              <span>4.9/5 Average Rating</span>
            </div>
            <div className="flex items-center gap-2">
              <Globe className="w-5 h-5" />
              <span>Trusted in 30+ Countries</span>
            </div>
          </div>
        </div>
      </section>

      {/* ─── PRICING SECTION ────────────────────────────────────────────────── */}
      <section className="px-6 py-20 bg-white">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-4 text-gray-900">
            Simple Pricing for Serious Flippers
          </h2>
          <p className="text-xl text-gray-600 text-center mb-12 max-w-2xl mx-auto">
            One profitable domain flip pays for a year of FlipandSift. 
            Start free, upgrade when you're ready.
          </p>
          
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Free */}
            <Card className="border-2 border-gray-200">
              <CardContent className="pt-8 pb-8">
                <h3 className="text-lg font-semibold text-gray-500 mb-2">Free Trial</h3>
                <div className="text-5xl font-bold mb-4 text-gray-900">$0</div>
                <p className="text-gray-600 mb-6">
                  Try before you buy. No credit card required.
                </p>
                <ul className="space-y-3 mb-8">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                    <span>3 domain analyses (lifetime)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                    <span>Basic AI scoring</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                    <span>See top 5 ranked domains</span>
                  </li>
                  <li className="flex items-center gap-2 text-gray-400">
                    <span className="w-5 h-5 flex items-center justify-center">×</span>
                    <span>No Sherlock Check</span>
                  </li>
                  <li className="flex items-center gap-2 text-gray-400">
                    <span className="w-5 h-5 flex items-center justify-center">×</span>
                    <span>No watchlist</span>
                  </li>
                </ul>
                <Button variant="outline" className="w-full py-6 text-lg" asChild>
                  <a href={getLoginUrl()}>Get Started Free</a>
                </Button>
              </CardContent>
            </Card>
            
            {/* Pro */}
            <Card className="border-2 border-indigo-600 relative shadow-2xl shadow-indigo-100">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                <Badge className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-4 py-1 text-sm font-bold">
                  MOST POPULAR
                </Badge>
              </div>
              <CardContent className="pt-8 pb-8">
                <h3 className="text-lg font-semibold text-indigo-600 mb-2">Pro</h3>
                <div className="text-5xl font-bold mb-4 text-gray-900">$97<span className="text-xl text-gray-500">/mo</span></div>
                <p className="text-gray-600 mb-6">
                  For serious domain flippers who want an edge.
                </p>
                <ul className="space-y-3 mb-8">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                    <span className="font-semibold">Unlimited domain analyses</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                    <span className="font-semibold">Sherlock Check™ included</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                    <span className="font-semibold">Due diligence checklists</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                    <span className="font-semibold">Full watchlist</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                    <span>Bulk domain checker (50 domains)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                    <span>Export results (PDF/CSV)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                    <span>Priority support</span>
                  </li>
                </ul>
                <Button className="w-full py-6 text-lg bg-indigo-600 hover:bg-indigo-700" asChild>
                  <a href={getLoginUrl()}>Start Free Trial</a>
                </Button>
              </CardContent>
            </Card>
          </div>
          
          <p className="text-center text-gray-500 mt-8">
            30-day money-back guarantee. No questions asked.
          </p>
        </div>
      </section>

      {/* ─── FAQ SECTION ────────────────────────────────────────────────────── */}
      <section className="px-6 py-20 bg-gray-50">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-12 text-gray-900">
            Frequently Asked Questions
          </h2>
          
          <div className="space-y-4">
            <FaqItem 
              q="How is FlipandSift different from just using SpamZilla?"
              a="SpamZilla shows you raw data. FlipandSift analyzes that data with AI, ranks opportunities, and gives you a due diligence checklist. We turn 3 hours of manual work into 60 seconds. Think of us as the intelligence layer on top of SpamZilla."
            />
            <FaqItem 
              q="Do I need a SpamZilla account to use FlipandSift?"
              a="Yes. FlipandSift analyzes screenshots from SpamZilla (or similar marketplaces like ODYS, SerpNames, etc.). We don't replace SpamZilla — we make it 10x faster to use by doing the analysis for you."
            />
            <FaqItem 
              q="How accurate is the AI analysis?"
              a="The AI evaluates 15+ metrics including Trust Flow, Citation Flow, topical relevance, backlink quality, and domain age. It's designed to flag domains that look good on paper but have hidden issues. However, always do your own due diligence — no tool can guarantee success."
            />
            <FaqItem 
              q="Can I check domains in bulk?"
              a="Yes! Pro users can upload 25-50 domains at once (from ChatGPT, research, etc.) and check availability across GoDaddy, Namecheap, and Hostinger in seconds. Perfect for vetting domain ideas quickly."
            />
            <FaqItem 
              q="What is the Sherlock Check™?"
              a="Sherlock Check cross-references domain names against their historical topics using Archive.org. It spots inconsistencies — like a domain that was about 'casino' but now shows 'health' — which indicates potential spam history or hacked sites."
            />
            <FaqItem 
              q="Can I cancel my subscription anytime?"
              a="Yes. You can cancel anytime and keep access until the end of your billing period. We also offer a 30-day money-back guarantee — if FlipandSift doesn't save you time and help you find better domains, we'll refund your payment."
            />
          </div>
        </div>
      </section>

      {/* ─── FINAL CTA ──────────────────────────────────────────────────────── */}
      <section className="px-6 py-20 bg-gradient-to-br from-indigo-600 to-purple-700 text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Stop Wasting Hours on Manual Domain Analysis
          </h2>
          <p className="text-xl md:text-2xl opacity-90 mb-8 max-w-2xl mx-auto">
            Join 500+ domain flippers who find profitable opportunities in 60 seconds, not 3 hours.
          </p>
          <Button size="lg" className="text-xl px-12 py-8 bg-white text-indigo-600 hover:bg-gray-100 shadow-2xl" asChild>
            <a href={getLoginUrl()}>
              Start Your Free Trial <ArrowRight className="ml-3 w-6 h-6" />
            </a>
          </Button>
          <p className="text-sm opacity-75 mt-6">
            3 free analyses • No credit card required • 30-day money-back guarantee
          </p>
        </div>
      </section>

      {/* ─── FOOTER ─────────────────────────────────────────────────────────── */}
      <footer className="px-6 py-12 bg-gray-900 text-gray-400">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="font-bold text-2xl text-white mb-4">FlipandSift</div>
              <p className="text-sm">
                AI-powered domain intelligence for domain flippers. 
                Find profitable expired domains before your competition.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Product</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#features" className="hover:text-white">Features</a></li>
                <li><a href="#pricing" className="hover:text-white">Pricing</a></li>
                <li><a href="#faq" className="hover:text-white">FAQ</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Resources</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white">Blog</a></li>
                <li><a href="#" className="hover:text-white">Domain Flipping Guide</a></li>
                <li><a href="#" className="hover:text-white">Support</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Legal</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-white">Terms of Service</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8 text