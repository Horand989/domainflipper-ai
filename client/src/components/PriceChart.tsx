import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { Loader2, TrendingDown, TrendingUp } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface PriceChartProps {
  domainId: number;
  domainName: string;
}

export default function PriceChart({ domainId, domainName }: PriceChartProps) {
  const { data: history, isLoading } = trpc.domains.priceHistory.useQuery({
    domainId,
    limit: 30,
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Price History</CardTitle>
          <CardDescription>Loading price data...</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (!history || history.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Price History</CardTitle>
          <CardDescription>No price history available yet</CardDescription>
        </CardHeader>
        <CardContent className="text-center py-8 text-muted-foreground">
          Price changes will be tracked automatically
        </CardContent>
      </Card>
    );
  }

  // Transform data for chart
  const chartData = history.map((record) => ({
    date: new Date(record.recordedAt).toLocaleDateString(),
    price: record.price / 100, // Convert cents to dollars
    timestamp: new Date(record.recordedAt).getTime(),
  }));

  // Calculate price trend
  const firstPrice = history[0]?.price || 0;
  const lastPrice = history[history.length - 1]?.price || 0;
  const priceChange = lastPrice - firstPrice;
  const percentChange = firstPrice > 0 ? ((priceChange / firstPrice) * 100).toFixed(1) : "0";
  const isPositive = priceChange >= 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Price History</CardTitle>
            <CardDescription>{domainName} - Last 30 records</CardDescription>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold">
              ${(lastPrice / 100).toFixed(2)}
            </div>
            <div className={`flex items-center gap-1 text-sm ${isPositive ? "text-red-600" : "text-green-600"}`}>
              {isPositive ? (
                <TrendingUp className="w-4 h-4" />
              ) : (
                <TrendingDown className="w-4 h-4" />
              )}
              <span>
                {isPositive ? "+" : ""}{percentChange}%
              </span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="date"
              className="text-xs"
              tick={{ fill: "hsl(var(--muted-foreground))" }}
            />
            <YAxis
              className="text-xs"
              tick={{ fill: "hsl(var(--muted-foreground))" }}
              tickFormatter={(value) => `$${value}`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--popover))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "var(--radius)",
              }}
              formatter={(value: number) => [`$${value.toFixed(2)}`, "Price"]}
            />
            <Line
              type="monotone"
              dataKey="price"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              dot={{ fill: "hsl(var(--primary))", r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
