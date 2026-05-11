import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import Navigation from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { Loader2, ArrowLeft, Shield, TrendingUp, Clock, ExternalLink, Save, FileDown } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getLoginUrl } from "@/const";
import { Link } from "wouter";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from "recharts";

function SaveComparisonDialog({ domainIds }: { domainIds: number[] }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  
  const saveComparison = trpc.savedComparisons.save.useMutation({
    onSuccess: () => {
      toast.success("Comparison saved successfully!");
      setOpen(false);
      setName("");
      setDescription("");
    },
    onError: (error) => {
      toast.error(`Failed to save comparison: ${error.message}`);
    },
  });

  const handleSave = () => {
    if (!name.trim()) {
      toast.error("Please enter a name for this comparison");
      return;
    }
    saveComparison.mutate({
      name: name.trim(),
      description: description.trim(),
      domainIds,
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Save className="w-4 h-4 mr-2" />
          Save Comparison
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Save Domain Comparison</DialogTitle>
          <DialogDescription>
            Bookmark this comparison for future reference
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Comparison Name *</Label>
            <Input
              id="name"
              placeholder="e.g., Top 3 Tech Domains"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              placeholder="Add notes about this comparison..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saveComparison.isPending}>
            {saveComparison.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function Compare() {
  const { user, loading: authLoading } = useAuth();
  
  // Get domain IDs from URL query params
  const urlParams = new URLSearchParams(window.location.search);
  const domainIds = urlParams.get("domains")?.split(",").map(Number) || [];

  const { data: domains, isLoading } = trpc.analysis.getDomainsById.useQuery(
    { domainIds },
    { enabled: !!user && domainIds.length > 0 }
  );

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

  if (domainIds.length < 2) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container py-8 max-w-6xl">
          <Card>
            <CardHeader>
              <CardTitle>Invalid Comparison</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">Please select at least 2 domains to compare.</p>
              <Button asChild>
                <Link href="/history">Back to History</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Prepare chart data
  const barChartData = domains?.map((d) => ({
    name: d.domainName.length > 20 ? d.domainName.substring(0, 20) + "..." : d.domainName,
    "Trust Flow": d.trustFlow || 0,
    "Citation Flow": d.citationFlow || 0,
    Age: d.age || 0,
  })) || [];

  const radarChartData = [
    {
      metric: "Trust Flow",
      ...Object.fromEntries(domains?.map((d, i) => [`Domain ${i + 1}`, d.trustFlow || 0]) || []),
    },
    {
      metric: "Citation Flow",
      ...Object.fromEntries(domains?.map((d, i) => [`Domain ${i + 1}`, d.citationFlow || 0]) || []),
    },
    {
      metric: "Age",
      ...Object.fromEntries(domains?.map((d, i) => [`Domain ${i + 1}`, (d.age || 0) * 2]) || []), // Scale age for visibility
    },
    {
      metric: "Link Quality",
      ...Object.fromEntries(
        domains?.map((d, i) => [
          `Domain ${i + 1}`,
          Math.max(0, 50 - ((d.outLinksExternal || 0) + (d.outLinksInternal || 0))),
        ]) || []
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container py-8 max-w-7xl">
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
              <h1 className="text-4xl font-bold mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>
                Domain Comparison
              </h1>
              <p className="text-muted-foreground text-lg">
                Side-by-side analysis of {domains?.length || 0} domains
              </p>
            </div>
            <div className="flex gap-2">
              <SaveComparisonDialog domainIds={domainIds} />
              <Button variant="outline" onClick={() => toast.info("PDF export coming soon!")}>
                <FileDown className="w-4 h-4 mr-2" />
                Export PDF
              </Button>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : domains && domains.length > 0 ? (
          <div className="space-y-8">
            {/* Comparison Table */}
            <Card>
              <CardHeader>
                <CardTitle>Detailed Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4 font-semibold">Metric</th>
                        {domains.map((d, i) => (
                          <th key={i} className="text-left py-3 px-4 font-semibold">
                            Domain {i + 1}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b">
                        <td className="py-3 px-4 font-medium">Domain Name</td>
                        {domains.map((d, i) => (
                          <td key={i} className="py-3 px-4">
                            {d.domainName}
                          </td>
                        ))}
                      </tr>
                      <tr className="border-b bg-muted/30">
                        <td className="py-3 px-4 font-medium flex items-center gap-2">
                          <Shield className="w-4 h-4 text-green-600" />
                          Trust Flow
                        </td>
                        {domains.map((d, i) => (
                          <td key={i} className="py-3 px-4">
                            <Badge variant={d.trustFlow && d.trustFlow > 30 ? "default" : "secondary"}>
                              {d.trustFlow || "N/A"}
                            </Badge>
                          </td>
                        ))}
                      </tr>
                      <tr className="border-b">
                        <td className="py-3 px-4 font-medium flex items-center gap-2">
                          <TrendingUp className="w-4 h-4 text-blue-600" />
                          Citation Flow
                        </td>
                        {domains.map((d, i) => (
                          <td key={i} className="py-3 px-4">
                            <Badge variant={d.citationFlow && d.citationFlow > 30 ? "default" : "secondary"}>
                              {d.citationFlow || "N/A"}
                            </Badge>
                          </td>
                        ))}
                      </tr>
                      <tr className="border-b bg-muted/30">
                        <td className="py-3 px-4 font-medium">Trust Ratio (TF/CF)</td>
                        {domains.map((d, i) => (
                          <td key={i} className="py-3 px-4">
                            {d.trustFlow && d.citationFlow
                              ? (d.trustFlow / d.citationFlow).toFixed(2)
                              : "N/A"}
                          </td>
                        ))}
                      </tr>
                      <tr className="border-b">
                        <td className="py-3 px-4 font-medium flex items-center gap-2">
                          <Clock className="w-4 h-4 text-purple-600" />
                          Age (years)
                        </td>
                        {domains.map((d, i) => (
                          <td key={i} className="py-3 px-4">
                            {d.age || "N/A"}
                          </td>
                        ))}
                      </tr>
                      <tr className="border-b bg-muted/30">
                        <td className="py-3 px-4 font-medium">Topics</td>
                        {domains.map((d, i) => (
                          <td key={i} className="py-3 px-4">
                            <div className="flex flex-wrap gap-1">
                              {d.majTopics?.split(",").slice(0, 2).map((topic, idx) => (
                                <Badge key={idx} variant="outline" className="text-xs">
                                  {topic.trim()}
                                </Badge>
                              ))}
                            </div>
                          </td>
                        ))}
                      </tr>
                      <tr className="border-b">
                        <td className="py-3 px-4 font-medium">Outbound Links</td>
                        {domains.map((d, i) => (
                          <td key={i} className="py-3 px-4">
                            {(d.outLinksExternal || 0) + (d.outLinksInternal || 0)}
                          </td>
                        ))}
                      </tr>
                      <tr className="border-b bg-muted/30">
                        <td className="py-3 px-4 font-medium">Quick Links</td>
                        {domains.map((d, i) => (
                          <td key={i} className="py-3 px-4">
                            <div className="flex gap-1">
                              <Button variant="ghost" size="sm" asChild>
                                <a
                                  href={`https://web.archive.org/web/*/${d.domainName}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  title="Archive.org"
                                >
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              </Button>
                              <Button variant="ghost" size="sm" asChild>
                                <a
                                  href={`https://www.google.com/search?q=site:${d.domainName}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  title="Google Index"
                                >
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              </Button>
                            </div>
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Bar Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Metrics Comparison</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={barChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="Trust Flow" fill="hsl(var(--primary))" />
                    <Bar dataKey="Citation Flow" fill="hsl(var(--chart-2))" />
                    <Bar dataKey="Age" fill="hsl(var(--chart-3))" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Radar Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Overall Profile</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <RadarChart data={radarChartData}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="metric" />
                    <PolarRadiusAxis />
                    <Tooltip />
                    <Legend />
                    {domains.map((_, i) => (
                      <Radar
                        key={i}
                        name={`Domain ${i + 1}`}
                        dataKey={`Domain ${i + 1}`}
                        stroke={`hsl(var(--chart-${(i % 5) + 1}))`}
                        fill={`hsl(var(--chart-${(i % 5) + 1}))`}
                        fillOpacity={0.3}
                      />
                    ))}
                  </RadarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">No domains found for comparison</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
