import { useAuth } from "@/_core/hooks/useAuth";
import Navigation from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { Bell, BellOff, Loader2, Save, Upload } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function Settings() {
  const { user, loading: authLoading } = useAuth();
  const [companyName, setCompanyName] = useState("");
  const [companyLogoUrl, setCompanyLogoUrl] = useState("");
  const [namecheapApiKey, setNamecheapApiKey] = useState("");
  const [namecheapUsername, setNamecheapUsername] = useState("");
  const [godaddyApiKey, setGodaddyApiKey] = useState("");
  const [godaddyApiSecret, setGodaddyApiSecret] = useState("");
  const [porkbunApiKey, setPorkbunApiKey] = useState("");
  const [porkbunSecretKey, setPorkbunSecretKey] = useState("");
  const [hostingerApiKey, setHostingerApiKey] = useState("");
  const [namecheapAffiliateId, setNamecheapAffiliateId] = useState("");
  const [godaddyAffiliateId, setGodaddyAffiliateId] = useState("");
  const [porkbunAffiliateId, setPorkbunAffiliateId] = useState("");
  const [hostingerAffiliateId, setHostingerAffiliateId] = useState("");
  const [priceAlertsEnabled, setPriceAlertsEnabled] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  const { data: settings, isLoading } = trpc.settings.get.useQuery(undefined, {
    enabled: !!user,
  });

  const updateSettings = trpc.settings.update.useMutation({
    onSuccess: () => {
      toast.success("Settings saved successfully");
    },
    onError: (error) => {
      toast.error(`Failed to save settings: ${error.message}`);
    },
  });

  useEffect(() => {
    if (settings) {
      setCompanyName(settings.companyName || "");
      setCompanyLogoUrl(settings.companyLogoUrl || "");
      setNamecheapApiKey(settings.namecheapApiKey || "");
      setNamecheapUsername(settings.namecheapUsername || "");
      setGodaddyApiKey(settings.godaddyApiKey || "");
      setGodaddyApiSecret(settings.godaddyApiSecret || "");
      setPorkbunApiKey(settings.porkbunApiKey || "");
      setPorkbunSecretKey(settings.porkbunSecretKey || "");
      setHostingerApiKey(settings.hostingerApiKey || "");
      setNamecheapAffiliateId(settings.namecheapAffiliateId || "");
      setGodaddyAffiliateId(settings.godaddyAffiliateId || "");
      setPorkbunAffiliateId(settings.porkbunAffiliateId || "");
      setHostingerAffiliateId(settings.hostingerAffiliateId || "");
      setPriceAlertsEnabled(settings.priceAlertsEnabled !== 0);
      setNotificationsEnabled(settings.notificationsEnabled !== 0);
    }
  }, [settings]);

  const handleSaveBranding = () => {
    updateSettings.mutate({
      companyName,
      companyLogoUrl,
    });
  };

  const handleSaveNamecheap = () => {
    updateSettings.mutate({
      namecheapApiKey,
      namecheapUsername,
      namecheapAffiliateId,
    });
  };

  const handleSaveGoDaddy = () => {
    updateSettings.mutate({
      godaddyApiKey,
      godaddyApiSecret,
      godaddyAffiliateId,
    });
  };

  const handleSavePorkbun = () => {
    updateSettings.mutate({
      porkbunApiKey,
      porkbunSecretKey,
      porkbunAffiliateId,
    });
  };

  const handleSaveHostinger = () => {
    updateSettings.mutate({
      hostingerApiKey,
      hostingerAffiliateId,
    });
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-96">
          <CardHeader>
            <CardTitle>Authentication Required</CardTitle>
            <CardDescription>Please log in to access settings</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50">
      <Navigation />
      
      <div className="container py-12">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-purple-900 mb-2">Settings</h1>
            <p className="text-gray-600">Manage your account settings and API integrations</p>
          </div>

          <Tabs defaultValue="branding" className="space-y-6">
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="branding">Branding</TabsTrigger>
              <TabsTrigger value="namecheap">Namecheap</TabsTrigger>
              <TabsTrigger value="godaddy">GoDaddy</TabsTrigger>
              <TabsTrigger value="porkbun">Porkbun</TabsTrigger>
              <TabsTrigger value="hostinger">Hostinger</TabsTrigger>
              <TabsTrigger value="notifications">Notifications</TabsTrigger>
            </TabsList>

            <TabsContent value="branding">
              <Card>
                <CardHeader>
                  <CardTitle>Company Branding</CardTitle>
                  <CardDescription>
                    Customize your company name and logo for PDF exports
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="companyName">Company Name</Label>
                    <Input
                      id="companyName"
                      placeholder="Your Company Name"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="companyLogoUrl">Company Logo URL</Label>
                    <div className="flex gap-2">
                      <Input
                        id="companyLogoUrl"
                        placeholder="https://example.com/logo.png"
                        value={companyLogoUrl}
                        onChange={(e) => setCompanyLogoUrl(e.target.value)}
                      />
                      <Button variant="outline" size="icon">
                        <Upload className="w-4 h-4" />
                      </Button>
                    </div>
                    <p className="text-sm text-gray-500">
                      Enter a URL to your company logo or upload an image
                    </p>
                  </div>

                  {companyLogoUrl && (
                    <div className="mt-4">
                      <Label>Logo Preview</Label>
                      <div className="mt-2 p-4 border rounded-lg bg-gray-50">
                        <img
                          src={companyLogoUrl}
                          alt="Company Logo"
                          className="max-h-20 object-contain"
                          onError={() => toast.error("Failed to load logo image")}
                        />
                      </div>
                    </div>
                  )}

                  <Button
                    onClick={handleSaveBranding}
                    disabled={updateSettings.isPending}
                    className="w-full"
                  >
                    {updateSettings.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        Save Branding
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="namecheap">
              <Card>
                <CardHeader>
                  <CardTitle>Namecheap API Configuration</CardTitle>
                  <CardDescription>
                    Connect your Namecheap account to check domain availability and pricing
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="namecheapUsername">Namecheap Username</Label>
                    <Input
                      id="namecheapUsername"
                      placeholder="your-username"
                      value={namecheapUsername}
                      onChange={(e) => setNamecheapUsername(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="namecheapApiKey">API Key</Label>
                    <Input
                      id="namecheapApiKey"
                      type="password"
                      placeholder="••••••••••••••••"
                      value={namecheapApiKey}
                      onChange={(e) => setNamecheapApiKey(e.target.value)}
                    />
                    <p className="text-sm text-gray-500">
                      Get your API key from{" "}
                      <a
                        href="https://ap.www.namecheap.com/settings/tools/apiaccess/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-purple-600 hover:underline"
                      >
                        Namecheap API Access
                      </a>
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="namecheapAffiliateId">Affiliate ID (Optional)</Label>
                    <Input
                      id="namecheapAffiliateId"
                      placeholder="your-affiliate-id"
                      value={namecheapAffiliateId}
                      onChange={(e) => setNamecheapAffiliateId(e.target.value)}
                    />
                    <p className="text-sm text-gray-500">
                      Add your Namecheap affiliate ID to earn commission on domain purchases
                    </p>
                  </div>

                  <Button
                    onClick={handleSaveNamecheap}
                    disabled={updateSettings.isPending}
                    className="w-full"
                  >
                    {updateSettings.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        Save Namecheap Settings
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="godaddy">
              <Card>
                <CardHeader>
                  <CardTitle>GoDaddy API Configuration</CardTitle>
                  <CardDescription>
                    Connect your GoDaddy account to check domain availability and pricing
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="godaddyApiKey">API Key</Label>
                    <Input
                      id="godaddyApiKey"
                      type="password"
                      placeholder="••••••••••••••••"
                      value={godaddyApiKey}
                      onChange={(e) => setGodaddyApiKey(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="godaddyApiSecret">API Secret</Label>
                    <Input
                      id="godaddyApiSecret"
                      type="password"
                      placeholder="••••••••••••••••"
                      value={godaddyApiSecret}
                      onChange={(e) => setGodaddyApiSecret(e.target.value)}
                    />
                    <p className="text-sm text-gray-500">
                      Get your API credentials from{" "}
                      <a
                        href="https://developer.godaddy.com/keys"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-purple-600 hover:underline"
                      >
                        GoDaddy Developer Portal
                      </a>
                    </p>
                  </div>

                  <Button
                    onClick={handleSaveGoDaddy}
                    disabled={updateSettings.isPending}
                    className="w-full"
                  >
                    {updateSettings.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        Save GoDaddy Settings
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="porkbun">
              <Card>
                <CardHeader>
                  <CardTitle>Porkbun API Configuration</CardTitle>
                  <CardDescription>
                    Connect your Porkbun account to check domain availability with full pricing information
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="porkbunApiKey">API Key</Label>
                    <Input
                      id="porkbunApiKey"
                      type="password"
                      placeholder="pk1_••••••••••••••••"
                      value={porkbunApiKey}
                      onChange={(e) => setPorkbunApiKey(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="porkbunSecretKey">Secret API Key</Label>
                    <Input
                      id="porkbunSecretKey"
                      type="password"
                      placeholder="sk1_••••••••••••••••"
                      value={porkbunSecretKey}
                      onChange={(e) => setPorkbunSecretKey(e.target.value)}
                    />
                    <p className="text-sm text-gray-500">
                      Get your API credentials from{" "}
                      <a
                        href="https://porkbun.com/account/api"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-purple-600 hover:underline"
                      >
                        Porkbun API Access
                      </a>
                    </p>
                  </div>

                  <Button
                    onClick={handleSavePorkbun}
                    disabled={updateSettings.isPending}
                    className="w-full"
                  >
                    {updateSettings.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        Save Porkbun Settings
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="hostinger">
              <Card>
                <CardHeader>
                  <CardTitle>Hostinger API Configuration</CardTitle>
                  <CardDescription>
                    Connect your Hostinger account to check domain availability (availability only, no pricing)
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="hostingerApiKey">API Token</Label>
                    <Input
                      id="hostingerApiKey"
                      type="password"
                      placeholder="••••••••••••••••"
                      value={hostingerApiKey}
                      onChange={(e) => setHostingerApiKey(e.target.value)}
                    />
                    <p className="text-sm text-gray-500">
                      Get your API token from{" "}
                      <a
                        href="https://hpanel.hostinger.com/account/api"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-purple-600 hover:underline"
                      >
                        Hostinger Account Page
                      </a>
                      {" "}(requires IP whitelisting)
                    </p>
                  </div>

                  <Button
                    onClick={handleSaveHostinger}
                    disabled={updateSettings.isPending}
                    className="w-full"
                  >
                    {updateSettings.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        Save Hostinger Settings
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="notifications">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bell className="w-5 h-5" />
                    Alerts &amp; Notifications
                  </CardTitle>
                  <CardDescription>
                    Control which alerts and notifications are active for your account
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Price Monitoring Toggle */}
                  <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/30">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        {priceAlertsEnabled ? (
                          <Bell className="w-4 h-4 text-primary" />
                        ) : (
                          <BellOff className="w-4 h-4 text-muted-foreground" />
                        )}
                        <Label className="text-base font-semibold cursor-pointer">
                          Price Monitoring
                        </Label>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Automatically monitor domain prices and trigger alerts when your target price is reached.
                        Turning this off pauses all active price alerts.
                      </p>
                    </div>
                    <Switch
                      checked={priceAlertsEnabled}
                      onCheckedChange={(checked) => {
                        setPriceAlertsEnabled(checked);
                        updateSettings.mutate({ priceAlertsEnabled: checked ? 1 : 0 });
                      }}
                    />
                  </div>

                  <Separator />

                  {/* Notifications Toggle */}
                  <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/30">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        {notificationsEnabled ? (
                          <Bell className="w-4 h-4 text-primary" />
                        ) : (
                          <BellOff className="w-4 h-4 text-muted-foreground" />
                        )}
                        <Label className="text-base font-semibold cursor-pointer">
                          Email &amp; In-App Notifications
                        </Label>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Receive email and in-app notifications for triggered price alerts, weekly pulse reports,
                        and important account updates. Turning this off mutes all outbound notifications.
                      </p>
                    </div>
                    <Switch
                      checked={notificationsEnabled}
                      onCheckedChange={(checked) => {
                        setNotificationsEnabled(checked);
                        updateSettings.mutate({ notificationsEnabled: checked ? 1 : 0 });
                      }}
                    />
                  </div>

                  <Separator />

                  {/* Status summary */}
                  <div className="rounded-lg border p-4 bg-muted/10 space-y-2">
                    <p className="text-sm font-medium">Current Status</p>
                    <div className="flex flex-wrap gap-3">
                      <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium ${
                        priceAlertsEnabled
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-500"
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          priceAlertsEnabled ? "bg-green-500" : "bg-gray-400"
                        }`} />
                        Price Monitoring {priceAlertsEnabled ? "On" : "Off"}
                      </span>
                      <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium ${
                        notificationsEnabled
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-500"
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          notificationsEnabled ? "bg-green-500" : "bg-gray-400"
                        }`} />
                        Notifications {notificationsEnabled ? "On" : "Off"}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
