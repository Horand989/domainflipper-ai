import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import Navigation from "@/components/Navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import { Activity, AlertCircle, Bell, CheckCircle2, Loader2, Play, TrendingDown } from "lucide-react";
import { toast } from "sonner";
import { CreditBalanceCard } from "@/components/CreditBalanceCard";

export default function Dashboard() {
  const { user, loading: authLoading } = useAuth();

  const utils = trpc.useUtils();
  const { data: alerts, isLoading: alertsLoading } = trpc.alerts.list.useQuery(undefined, {
    enabled: !!user,
  });
  const { data: logs, isLoading: logsLoading } = trpc.monitoring.logs.useQuery(
    { limit: 20 },
    { enabled: !!user }
  );
  const { data: triggeredLogs, isLoading: triggeredLogsLoading } = trpc.monitoring.triggeredLogs.useQuery(
    { limit: 10 },
    { enabled: !!user }
  );

  const checkPrices = trpc.monitoring.checkPrices.useMutation({
    onSuccess: (data) => {
      utils.alerts.list.invalidate();
      utils.monitoring.logs.invalidate();
      utils.monitoring.triggeredLogs.invalidate();
      if (data.triggered > 0) {
        toast.success(`Price check complete! ${data.triggered} alert(s) triggered out of ${data.checked} checked.`);
      } else {
        toast.success(`Price check complete! Checked ${data.checked} alert(s), none triggered.`);
      }
    },
    onError: (error) => {
      toast.error(error.message || "Failed to check prices");
    },
  });

  if (authLoading || alertsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const activeAlerts = alerts?.filter((item) => item.alert.isActive === 1) || [];
  const triggeredAlerts = activeAlerts.filter(
    (item) => item.domain && item.domain.currentPrice <= item.alert.targetPrice
  );

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container py-8 max-w-7xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>
            Monitoring Dashboard
          </h1>
          <p className="text-muted-foreground">
            Overview of your domain price monitoring activity
          </p>
        </div>

        {/* Pro User Credit Balance */}
        {user?.tier === "PRO" && (
          <div className="mb-8">
            <CreditBalanceCard />
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid gap-6 md:grid-cols-3 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Active Alerts</CardTitle>
              <Bell className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{activeAlerts.length}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Monitoring {activeAlerts.length} domain{activeAlerts.length !== 1 ? "s" : ""}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Triggered Alerts</CardTitle>
              <AlertCircle className="w-4 h-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">{triggeredAlerts.length}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Price targets reached
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Recent Activity</CardTitle>
              <Activity className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{logs?.length || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Monitoring logs recorded
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Manual Check Button */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Manual Price Check</CardTitle>
            <CardDescription>
              Run an immediate check on all active price alerts
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => checkPrices.mutate()}
              disabled={checkPrices.isPending || activeAlerts.length === 0}
              size="lg"
            >
              {checkPrices.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Checking Prices...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Check Prices Now
                </>
              )}
            </Button>
            {activeAlerts.length === 0 && (
              <p className="text-sm text-muted-foreground mt-2">
                No active alerts to check. Create some alerts first.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Triggered Alerts */}
        {triggeredAlerts.length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingDown className="w-5 h-5 text-green-600" />
                Currently Triggered Alerts
              </CardTitle>
              <CardDescription>
                These domains have reached or fallen below your target price
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Domain</TableHead>
                    <TableHead>Current Price</TableHead>
                    <TableHead>Target Price</TableHead>
                    <TableHead>Difference</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {triggeredAlerts.map((item) => {
                    const { alert, domain } = item;
                    if (!domain) return null;
                    const difference = domain.currentPrice - alert.targetPrice;
                    const percentDiff = ((difference / alert.targetPrice) * 100).toFixed(1);
                    
                    return (
                      <TableRow key={alert.id}>
                        <TableCell className="font-medium">{domain.name}</TableCell>
                        <TableCell>
                          <span className="text-green-600 font-semibold">
                            ${(domain.currentPrice / 100).toFixed(2)}
                          </span>
                        </TableCell>
                        <TableCell>
                          ${(alert.targetPrice / 100).toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                            {percentDiff}% below target
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Recent Triggered Logs */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Recent Triggered Alerts</CardTitle>
            <CardDescription>
              History of price alerts that have been triggered
            </CardDescription>
          </CardHeader>
          <CardContent>
            {triggeredLogsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : !triggeredLogs || triggeredLogs.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle2 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No triggered alerts yet</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Domain</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Target</TableHead>
                    <TableHead>Notification</TableHead>
                    <TableHead>Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {triggeredLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-medium">{log.domainName}</TableCell>
                      <TableCell>
                        <span className="text-green-600 font-semibold">
                          ${(log.currentPrice / 100).toFixed(2)}
                        </span>
                      </TableCell>
                      <TableCell>
                        ${(log.targetPrice / 100).toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={log.notificationSent === 1 ? "default" : "destructive"}>
                          {log.notificationSent === 1 ? "Sent" : "Failed"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(log.createdAt).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* All Monitoring Logs */}
        <Card>
          <CardHeader>
            <CardTitle>Monitoring History</CardTitle>
            <CardDescription>
              Complete log of all price monitoring checks
            </CardDescription>
          </CardHeader>
          <CardContent>
            {logsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : !logs || logs.length === 0 ? (
              <div className="text-center py-8">
                <Activity className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No monitoring activity yet</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Run a price check to start logging activity
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Domain</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Target</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Message</TableHead>
                    <TableHead>Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-medium">{log.domainName}</TableCell>
                      <TableCell>
                        <span className={log.triggered === 1 ? "text-green-600 font-semibold" : ""}>
                          ${(log.currentPrice / 100).toFixed(2)}
                        </span>
                      </TableCell>
                      <TableCell>
                        ${(log.targetPrice / 100).toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={log.triggered === 1 ? "default" : "secondary"}>
                          {log.triggered === 1 ? "Triggered" : "Not Triggered"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                        {log.message}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(log.createdAt).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
