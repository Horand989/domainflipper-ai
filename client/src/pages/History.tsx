import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import Navigation from "@/components/Navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { trpc } from "@/lib/trpc";
import { 
  Loader2, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Eye,
  Trash2,
  AlertCircle
} from "lucide-react";
import { getLoginUrl } from "@/const";
import { Link } from "wouter";
import { toast } from "sonner";

export default function History() {
  const { user, loading: authLoading } = useAuth();
  const utils = trpc.useUtils();

  const { data: sessions, isLoading } = trpc.analysis.listSessions.useQuery(undefined, {
    enabled: !!user,
  });

  const deleteSession = trpc.analysis.deleteSession.useMutation({
    onSuccess: () => {
      toast.success("Analysis session deleted");
      utils.analysis.listSessions.invalidate();
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to delete session");
    },
  });

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
            <CardDescription>Please sign in to view analysis history</CardDescription>
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="w-5 h-5 text-green-600" />;
      case "failed":
        return <XCircle className="w-5 h-5 text-red-600" />;
      case "processing":
        return <Loader2 className="w-5 h-5 animate-spin text-blue-600" />;
      default:
        return <Clock className="w-5 h-5 text-gray-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge variant="default">Completed</Badge>;
      case "failed":
        return <Badge variant="destructive">Failed</Badge>;
      case "processing":
        return <Badge variant="secondary">Processing</Badge>;
      default:
        return <Badge variant="outline">Pending</Badge>;
    }
  };

  const handleDelete = (sessionId: number) => {
    if (confirm("Are you sure you want to delete this analysis session?")) {
      deleteSession.mutate({ sessionId });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container py-8 max-w-6xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>
            Analysis History
          </h1>
          <p className="text-muted-foreground text-lg">
            View and manage your past domain analysis sessions
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : sessions && sessions.length > 0 ? (
          <div className="grid gap-6">
            {sessions.map((session) => (
              <Card key={session.id} className="overflow-hidden">
                <div className="flex flex-col md:flex-row">
                  {/* Thumbnail */}
                  {session.uploadedImageUrl && (
                    <div className="md:w-64 flex-shrink-0">
                      <img
                        src={session.uploadedImageUrl}
                        alt="Analysis screenshot"
                        className="w-full h-48 md:h-full object-cover"
                      />
                    </div>
                  )}

                  {/* Content */}
                  <div className="flex-1">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            {getStatusIcon(session.status)}
                            <CardTitle className="text-xl">
                              Analysis #{session.id}
                            </CardTitle>
                            {getStatusBadge(session.status)}
                          </div>
                          <CardDescription className="flex items-center gap-4">
                            <span className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              {new Date(session.createdAt).toLocaleString()}
                            </span>
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent>
                      <div className="flex items-center gap-3">
                        {session.status === "completed" && (
                          <Button asChild variant="default">
                            <Link href={`/analysis/${session.id}`}>
                              <Eye className="w-4 h-4 mr-2" />
                              View Results
                            </Link>
                          </Button>
                        )}
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(session.id)}
                          disabled={deleteSession.isPending}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </Button>
                      </div>
                    </CardContent>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Alert>
            <AlertCircle className="w-4 h-4" />
            <AlertDescription>
              No analysis sessions yet. <Link href="/analysis" className="underline">Start your first analysis</Link>
            </AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  );
}
