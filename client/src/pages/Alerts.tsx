import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import Navigation from "@/components/Navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { Bell, BellOff, Loader2, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function Alerts() {
  const { user, loading: authLoading } = useAuth();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedDomainId, setSelectedDomainId] = useState("");
  const [targetPrice, setTargetPrice] = useState("");

  const utils = trpc.useUtils();
  const { data: domains } = trpc.domains.list.useQuery(undefined, {
    enabled: !!user,
  });
  const { data: alerts, isLoading } = trpc.alerts.list.useQuery(undefined, {
    enabled: !!user,
  });
  const { data: userSettings } = trpc.settings.get.useQuery(undefined, {
    enabled: !!user,
  });
  const updateSettings = trpc.settings.update.useMutation({
    onSuccess: () => utils.settings.get.invalidate(),
  });
  const priceAlertsEnabled = userSettings?.priceAlertsEnabled !== 0;

  const createAlert = trpc.alerts.create.useMutation({
    onSuccess: () => {
      utils.alerts.list.invalidate();
      toast.success("Price alert created successfully");
      setIsAddDialogOpen(false);
      setSelectedDomainId("");
      setTargetPrice("");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create alert");
    },
  });

  const toggleAlert = trpc.alerts.toggle.useMutation({
    onSuccess: () => {
      utils.alerts.list.invalidate();
      toast.success("Alert status updated");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update alert");
    },
  });

  const deleteAlert = trpc.alerts.delete.useMutation({
    onSuccess: () => {
      utils.alerts.list.invalidate();
      toast.success("Alert deleted successfully");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete alert");
    },
  });

  const handleCreateAlert = () => {
    const priceInCents = Math.round(parseFloat(targetPrice) * 100);
    if (!selectedDomainId || isNaN(priceInCents) || priceInCents <= 0) {
      toast.error("Please select a domain and enter a valid target price");
      return;
    }
    createAlert.mutate({ domainId: parseInt(selectedDomainId), targetPrice: priceInCents });
  };

  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container py-8 max-w-6xl">
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>
              Price Alerts
            </h1>
            <p className="text-muted-foreground">
              Get notified when domain prices reach your target
            </p>
          </div>
          <div className="flex items-center gap-3 mt-2 p-3 rounded-lg border bg-muted/30">
            {priceAlertsEnabled ? (
              <Bell className="w-4 h-4 text-primary" />
            ) : (
              <BellOff className="w-4 h-4 text-muted-foreground" />
            )}
            <div>
              <p className="text-sm font-medium leading-none">Price Monitoring</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {priceAlertsEnabled ? "Active — alerts are running" : "Paused — alerts are off"}
              </p>
            </div>
            <Switch
              checked={priceAlertsEnabled}
              onCheckedChange={(checked) =>
                updateSettings.mutate({ priceAlertsEnabled: checked ? 1 : 0 })
              }
            />
          </div>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Active Alerts</CardTitle>
                <CardDescription>Manage your price monitoring alerts</CardDescription>
              </div>
              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button disabled={!domains || domains.length === 0}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Alert
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create Price Alert</DialogTitle>
                    <DialogDescription>
                      Set a target price to receive notifications when reached
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="domain-select">Select Domain</Label>
                      <Select value={selectedDomainId} onValueChange={setSelectedDomainId}>
                        <SelectTrigger id="domain-select">
                          <SelectValue placeholder="Choose a domain" />
                        </SelectTrigger>
                        <SelectContent>
                          {domains?.map((domain) => (
                            <SelectItem key={domain.id} value={domain.id.toString()}>
                              {domain.name} (${(domain.currentPrice / 100).toFixed(2)})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="target-price">Target Price ($)</Label>
                      <Input
                        id="target-price"
                        type="number"
                        step="0.01"
                        placeholder="800.00"
                        value={targetPrice}
                        onChange={(e) => setTargetPrice(e.target.value)}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      onClick={handleCreateAlert}
                      disabled={createAlert.isPending}
                    >
                      {createAlert.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      Create Alert
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            {!domains || domains.length === 0 ? (
              <div className="text-center py-12">
                <Bell className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-2">No domains available</p>
                <p className="text-sm text-muted-foreground">Add domains first to create price alerts</p>
              </div>
            ) : !alerts || alerts.length === 0 ? (
              <div className="text-center py-12">
                <Bell className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-4">No alerts created yet</p>
                <Button onClick={() => setIsAddDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Your First Alert
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Domain</TableHead>
                    <TableHead>Current Price</TableHead>
                    <TableHead>Target Price</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Checked</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {alerts.map((item) => {
                    const { alert, domain } = item;
                    if (!domain) return null;
                    
                    const isTriggered = domain.currentPrice <= alert.targetPrice;
                    
                    return (
                      <TableRow key={alert.id}>
                        <TableCell className="font-medium">{domain.name}</TableCell>
                        <TableCell>
                          <span className={isTriggered ? "text-green-600 font-semibold" : ""}>
                            ${(domain.currentPrice / 100).toFixed(2)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="font-semibold">
                            ${(alert.targetPrice / 100).toFixed(2)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={alert.isActive === 1}
                              onCheckedChange={(checked) =>
                                toggleAlert.mutate({ id: alert.id, isActive: checked ? 1 : 0 })
                              }
                            />
                            <Badge variant={alert.isActive === 1 ? "default" : "secondary"}>
                              {alert.isActive === 1 ? (
                                <>
                                  <Bell className="w-3 h-3 mr-1" />
                                  Active
                                </>
                              ) : (
                                <>
                                  <BellOff className="w-3 h-3 mr-1" />
                                  Paused
                                </>
                              )}
                            </Badge>
                            {isTriggered && alert.isActive === 1 && (
                              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                Triggered
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {alert.lastChecked ? new Date(alert.lastChecked).toLocaleString() : "Never"}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteAlert.mutate({ id: alert.id })}
                            disabled={deleteAlert.isPending}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
