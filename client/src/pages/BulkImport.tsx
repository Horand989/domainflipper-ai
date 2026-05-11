import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import Navigation from "@/components/Navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { trpc } from "@/lib/trpc";
import { Download, FileUp, Loader2, Upload, AlertCircle, CheckCircle2 } from "lucide-react";
import { useState, useRef } from "react";
import { toast } from "sonner";

export default function BulkImport() {
  const { user, loading: authLoading } = useAuth();
  const [domainsFile, setDomainsFile] = useState<File | null>(null);
  const [alertsFile, setAlertsFile] = useState<File | null>(null);
  const [importResults, setImportResults] = useState<{
    success: number;
    failed: number;
    errors: string[];
  } | null>(null);
  
  const domainsInputRef = useRef<HTMLInputElement>(null);
  const alertsInputRef = useRef<HTMLInputElement>(null);

  const utils = trpc.useUtils();

  const importDomains = trpc.bulkImport.domains.useMutation({
    onSuccess: (data) => {
      utils.domains.list.invalidate();
      setImportResults(data);
      toast.success(`Imported ${data.success} domains successfully`);
      setDomainsFile(null);
      if (domainsInputRef.current) domainsInputRef.current.value = "";
    },
    onError: (error) => {
      toast.error(error.message || "Failed to import domains");
    },
  });

  const importAlerts = trpc.bulkImport.alerts.useMutation({
    onSuccess: (data) => {
      utils.alerts.list.invalidate();
      setImportResults(data);
      toast.success(`Imported ${data.success} alerts successfully`);
      setAlertsFile(null);
      if (alertsInputRef.current) alertsInputRef.current.value = "";
    },
    onError: (error) => {
      toast.error(error.message || "Failed to import alerts");
    },
  });

  const parseDomainsCsv = async (file: File) => {
    const text = await file.text();
    const lines = text.split("\n").filter((line) => line.trim());
    const domains = [];

    // Skip header if present
    const startIndex = lines[0]?.toLowerCase().includes("name") ? 1 : 0;

    for (let i = startIndex; i < lines.length; i++) {
      const [name, price] = lines[i].split(",").map((s) => s.trim());
      if (name && price) {
        const priceNum = parseFloat(price);
        if (!isNaN(priceNum)) {
          domains.push({
            name,
            currentPrice: Math.round(priceNum * 100), // Convert to cents
          });
        }
      }
    }

    return domains;
  };

  const parseAlertsCsv = async (file: File) => {
    const text = await file.text();
    const lines = text.split("\n").filter((line) => line.trim());
    const alerts = [];

    // Skip header if present
    const startIndex = lines[0]?.toLowerCase().includes("domain") ? 1 : 0;

    for (let i = startIndex; i < lines.length; i++) {
      const [domainName, targetPrice] = lines[i].split(",").map((s) => s.trim());
      if (domainName && targetPrice) {
        const priceNum = parseFloat(targetPrice);
        if (!isNaN(priceNum)) {
          alerts.push({
            domainName,
            targetPrice: Math.round(priceNum * 100), // Convert to cents
          });
        }
      }
    }

    return alerts;
  };

  const handleDomainsImport = async () => {
    if (!domainsFile) return;
    setImportResults(null);

    try {
      const domains = await parseDomainsCsv(domainsFile);
      if (domains.length === 0) {
        toast.error("No valid domains found in CSV file");
        return;
      }
      importDomains.mutate({ domains });
    } catch (error: any) {
      toast.error(error.message || "Failed to parse CSV file");
    }
  };

  const handleAlertsImport = async () => {
    if (!alertsFile) return;
    setImportResults(null);

    try {
      const alerts = await parseAlertsCsv(alertsFile);
      if (alerts.length === 0) {
        toast.error("No valid alerts found in CSV file");
        return;
      }
      importAlerts.mutate({ alerts });
    } catch (error: any) {
      toast.error(error.message || "Failed to parse CSV file");
    }
  };

  const downloadDomainsTemplate = () => {
    const csv = "name,price\nexample.com,1000.00\nanother-domain.com,500.00";
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "domains-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadAlertsTemplate = () => {
    const csv = "domainName,targetPrice\nexample.com,800.00\nanother-domain.com,400.00";
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "alerts-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container py-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>
            Bulk Import
          </h1>
          <p className="text-muted-foreground">
            Import multiple domains and alerts from CSV files
          </p>
        </div>

        <Tabs defaultValue="domains" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="domains">Import Domains</TabsTrigger>
            <TabsTrigger value="alerts">Import Alerts</TabsTrigger>
          </TabsList>

          <TabsContent value="domains">
            <Card>
              <CardHeader>
                <CardTitle>Import Domains from CSV</CardTitle>
                <CardDescription>
                  Upload a CSV file with domain names and prices
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert>
                  <AlertCircle className="w-4 h-4" />
                  <AlertDescription>
                    CSV format: <code className="font-mono">name,price</code>
                    <br />
                    Example: <code className="font-mono">example.com,1000.00</code>
                  </AlertDescription>
                </Alert>

                <div className="flex items-center gap-4">
                  <Button variant="outline" onClick={downloadDomainsTemplate}>
                    <Download className="w-4 h-4 mr-2" />
                    Download Template
                  </Button>
                </div>

                <div className="border-2 border-dashed rounded-lg p-8 text-center">
                  <input
                    ref={domainsInputRef}
                    type="file"
                    accept=".csv"
                    onChange={(e) => setDomainsFile(e.target.files?.[0] || null)}
                    className="hidden"
                    id="domains-file"
                  />
                  <label htmlFor="domains-file" className="cursor-pointer">
                    <FileUp className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-sm text-muted-foreground mb-2">
                      {domainsFile ? domainsFile.name : "Click to select CSV file"}
                    </p>
                  </label>
                </div>

                <Button
                  onClick={handleDomainsImport}
                  disabled={!domainsFile || importDomains.isPending}
                  className="w-full"
                >
                  {importDomains.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Import Domains
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="alerts">
            <Card>
              <CardHeader>
                <CardTitle>Import Alerts from CSV</CardTitle>
                <CardDescription>
                  Upload a CSV file with domain names and target prices
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert>
                  <AlertCircle className="w-4 h-4" />
                  <AlertDescription>
                    CSV format: <code className="font-mono">domainName,targetPrice</code>
                    <br />
                    Example: <code className="font-mono">example.com,800.00</code>
                    <br />
                    <strong>Note:</strong> Domains must exist before importing alerts
                  </AlertDescription>
                </Alert>

                <div className="flex items-center gap-4">
                  <Button variant="outline" onClick={downloadAlertsTemplate}>
                    <Download className="w-4 h-4 mr-2" />
                    Download Template
                  </Button>
                </div>

                <div className="border-2 border-dashed rounded-lg p-8 text-center">
                  <input
                    ref={alertsInputRef}
                    type="file"
                    accept=".csv"
                    onChange={(e) => setAlertsFile(e.target.files?.[0] || null)}
                    className="hidden"
                    id="alerts-file"
                  />
                  <label htmlFor="alerts-file" className="cursor-pointer">
                    <FileUp className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-sm text-muted-foreground mb-2">
                      {alertsFile ? alertsFile.name : "Click to select CSV file"}
                    </p>
                  </label>
                </div>

                <Button
                  onClick={handleAlertsImport}
                  disabled={!alertsFile || importAlerts.isPending}
                  className="w-full"
                >
                  {importAlerts.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Import Alerts
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {importResults && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Import Results</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  <span className="font-semibold">{importResults.success} successful</span>
                </div>
                {importResults.failed > 0 && (
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-destructive" />
                    <span className="font-semibold">{importResults.failed} failed</span>
                  </div>
                )}
              </div>

              {importResults.errors.length > 0 && (
                <div>
                  <p className="font-semibold mb-2">Errors:</p>
                  <div className="space-y-1 max-h-48 overflow-y-auto">
                    {importResults.errors.map((error, idx) => (
                      <p key={idx} className="text-sm text-destructive">
                        • {error}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
