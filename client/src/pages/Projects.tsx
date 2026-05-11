import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import Navigation from "@/components/Navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { Loader2, Plus, FolderOpen, Sparkles, Trash2, Settings } from "lucide-react";
import { getLoginUrl } from "@/const";
import { Link } from "wouter";
import { useState } from "react";
import { toast } from "sonner";
import { ProjectDomainsTable } from "@/components/ProjectDomainsTable";

export default function Projects() {
  const { user, loading: authLoading } = useAuth();
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<any>(null);
  const [formData, setFormData] = useState({
    projectName: "",
    niche: "",
    industry: "",
    keywords: "",
    targetAudience: "",
    description: "",
    goals: "",
    preferredExtensions: [] as string[],
    namingStyle: "" as string,
    competitorUrl: "" as string,
  });

  const utils = trpc.useUtils();

  const { data: projects, isLoading } = trpc.projects.list.useQuery(undefined, {
    enabled: !!user,
  });

  const createProject = trpc.projects.create.useMutation({
    onSuccess: () => {
      toast.success("Project created successfully!");
      setOpen(false);
      setFormData({
        projectName: "",
        niche: "",
        industry: "",
        keywords: "",
        targetAudience: "",
        description: "",
        goals: "",
        preferredExtensions: [],
        namingStyle: "",
        competitorUrl: "",
      });
      utils.projects.list.invalidate();
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to create project");
    },
  });

  const deleteProject = trpc.projects.delete.useMutation({
    onSuccess: () => {
      toast.success("Project deleted");
      utils.projects.list.invalidate();
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to delete project");
    },
  });

  const updateProject = trpc.projects.update.useMutation({
    onSuccess: () => {
      toast.success("Project updated successfully!");
      setEditOpen(false);
      setEditingProject(null);
      utils.projects.list.invalidate();
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update project");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.projectName.trim()) {
      toast.error("Project name is required");
      return;
    }
    createProject.mutate(formData);
  };

  const handleDelete = (projectId: number) => {
    if (confirm("Are you sure you want to delete this project?")) {
      deleteProject.mutate({ projectId });
    }
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
            <CardDescription>Please sign in to manage projects</CardDescription>
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

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container py-8 max-w-6xl">
        {/* Header */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>
              My Projects
            </h1>
            <p className="text-muted-foreground text-lg">
              Define your objectives and get AI-powered domain suggestions
            </p>
          </div>

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="lg">
                <Plus className="w-5 h-5 mr-2" />
                New Project
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Project</DialogTitle>
                <DialogDescription>
                  Tell us about your website idea so we can suggest the perfect expired domain
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                <div>
                  <Label htmlFor="projectName">Project Name *</Label>
                  <Input
                    id="projectName"
                    value={formData.projectName}
                    onChange={(e) => setFormData({ ...formData, projectName: e.target.value })}
                    placeholder="My Awesome Website"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="niche">Niche</Label>
                    <Input
                      id="niche"
                      value={formData.niche}
                      onChange={(e) => setFormData({ ...formData, niche: e.target.value })}
                      placeholder="e.g., Health & Fitness"
                    />
                  </div>

                  <div>
                    <Label htmlFor="industry">Industry</Label>
                    <Input
                      id="industry"
                      value={formData.industry}
                      onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                      placeholder="e.g., E-commerce"
                    />
                  </div>
                </div>

                {/* Trending Niche Presets */}
                <div>
                  <Label>🔥 Load Trending Niche</Label>
                  <div className="flex gap-2 mt-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setFormData({ ...formData, keywords: "verify, human, authentic, shield, ethics, safety, audit, secure, compliance, transparent" })}
                      className="flex-1"
                    >
                      AI Comfort & Safety
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setFormData({ ...formData, keywords: "prompt, template, recipe, engineering, script, context, instruction, jailbreak, midjourney, gpt" })}
                      className="flex-1"
                    >
                      The Prompt Economy
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setFormData({ ...formData, keywords: "agent, copilot, api, plugin, workflow, automate, deploy, scale, vector, data" })}
                      className="flex-1"
                    >
                      SaaS Infrastructure
                    </Button>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setFormData({ ...formData, keywords: "" })}
                    className="mt-1 text-xs"
                  >
                    Clear
                  </Button>
                </div>

                <div>
                  <Label htmlFor="keywords">Keywords</Label>
                  <Input
                    id="keywords"
                    value={formData.keywords}
                    onChange={(e) => setFormData({ ...formData, keywords: e.target.value })}
                    placeholder="fitness, workout, nutrition (comma-separated)"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Enter relevant keywords separated by commas
                  </p>
                </div>

                <div>
                  <Label htmlFor="targetAudience">Target Audience</Label>
                  <Textarea
                    id="targetAudience"
                    value={formData.targetAudience}
                    onChange={(e) => setFormData({ ...formData, targetAudience: e.target.value })}
                    placeholder="Describe your ideal audience..."
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor="description">Project Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="What is your website about?"
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor="goals">Goals & Objectives</Label>
                  <Textarea
                    id="goals"
                    value={formData.goals}
                    onChange={(e) => setFormData({ ...formData, goals: e.target.value })}
                    placeholder="What do you want to achieve with this website?"
                    rows={3}
                  />
                </div>

                {/* New Domain Preference Fields */}
                <div className="border-t pt-4 mt-2">
                  <h3 className="text-sm font-semibold mb-3 text-primary">Domain Preferences (The Sniper Scope)</h3>
                  
                  <div className="space-y-4">
                    {/* Preferred Extensions */}
                    <div>
                      <Label>Preferred Extensions</Label>
                      <div className="grid grid-cols-4 gap-2 mt-2">
                        {['.com', '.net', '.io', '.ai', '.co', '.org', '.app', '.dev'].map((ext) => (
                          <label key={ext} className="flex items-center space-x-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={formData.preferredExtensions.includes(ext)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setFormData({
                                    ...formData,
                                    preferredExtensions: [...formData.preferredExtensions, ext],
                                  });
                                } else {
                                  setFormData({
                                    ...formData,
                                    preferredExtensions: formData.preferredExtensions.filter((x) => x !== ext),
                                  });
                                }
                              }}
                              className="rounded border-gray-300"
                            />
                            <span className="text-sm">{ext}</span>
                          </label>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Select your preferred domain extensions
                      </p>
                    </div>

                    {/* Naming Style */}
                    <div>
                      <Label htmlFor="namingStyle">Naming Style</Label>
                      <select
                        id="namingStyle"
                        value={formData.namingStyle}
                        onChange={(e) => setFormData({ ...formData, namingStyle: e.target.value })}
                        className="w-full mt-1 px-3 py-2 border border-input rounded-md bg-background text-sm"
                      >
                        <option value="">Select a style...</option>
                        <option value="keyword">Keyword Exact Match</option>
                        <option value="brandable">Brandable/Abstract</option>
                        <option value="action">Action Oriented</option>
                      </select>
                      <p className="text-xs text-muted-foreground mt-1">
                        Choose how you want your domain name to sound
                      </p>
                    </div>

                    {/* Competitor URL */}
                    <div>
                      <Label htmlFor="competitorUrl">Competitor URL (Optional)</Label>
                      <Input
                        id="competitorUrl"
                        type="url"
                        value={formData.competitorUrl}
                        onChange={(e) => setFormData({ ...formData, competitorUrl: e.target.value })}
                        placeholder="https://competitor.com"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        We'll analyze their site for keyword ideas
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 pt-4">
                  <Button type="submit" disabled={createProject.isPending} className="flex-1">
                    {createProject.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      "Create Project"
                    )}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                    Cancel
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Projects List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : projects && projects.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2">
            {projects.map((project) => (
              <Card key={project.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="flex items-center gap-2">
                        <FolderOpen className="w-5 h-5 text-primary" />
                        {project.projectName}
                      </CardTitle>
                      <CardDescription className="mt-2">
                        {project.description || "No description provided"}
                      </CardDescription>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingProject(project);
                          setEditOpen(true);
                        }}
                      >
                        <Settings className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(project.id)}
                        disabled={deleteProject.isPending}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Tags */}
                  <div className="flex flex-wrap gap-2">
                    {project.niche && (
                      <Badge variant="secondary">{project.niche}</Badge>
                    )}
                    {project.industry && (
                      <Badge variant="outline">{project.industry}</Badge>
                    )}
                  </div>

                  {/* Keywords */}
                  {project.keywords && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Keywords:</p>
                      <p className="text-sm">{project.keywords}</p>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 pt-2">
                    <Button asChild variant="default" className="flex-1">
                      <Link href={`/projects/${project.id}`}>
                        <Sparkles className="w-4 h-4 mr-2" />
                        View Suggestions
                      </Link>
                    </Button>
                  </div>

                  {/* Project Domains Table */}
                  <div className="mt-4 pt-4 border-t">
                    <h4 className="text-sm font-semibold mb-3">Saved Domains</h4>
                    <ProjectDomainsTable projectId={project.id} />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <FolderOpen className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No Projects Yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first project to get AI-powered domain suggestions
              </p>
              <Button onClick={() => setOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create Project
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Edit Project Modal */}
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Project</DialogTitle>
              <DialogDescription>
                Update your project name and keywords
              </DialogDescription>
            </DialogHeader>
            
            {editingProject && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  const projectName = formData.get('projectName') as string;
                  const keywords = formData.get('keywords') as string;
                  
                  if (!projectName.trim()) {
                    toast.error("Project name is required");
                    return;
                  }
                  
                  // Call update mutation
                  updateProject.mutate({
                    projectId: editingProject.id,
                    projectName,
                    keywords,
                  });
                }}
                className="space-y-4 mt-4"
              >
                <div>
                  <Label htmlFor="edit-projectName">Project Name *</Label>
                  <Input
                    id="edit-projectName"
                    name="projectName"
                    defaultValue={editingProject.projectName}
                    placeholder="My Awesome Website"
                    required
                  />
                </div>

                {/* Trending Niche Presets */}
                <div>
                  <Label>🔥 Load Trending Niche</Label>
                  <div className="flex gap-2 mt-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const input = document.getElementById('edit-keywords') as HTMLInputElement;
                        if (input) input.value = "verify, human, authentic, shield, ethics, safety, audit, secure, compliance, transparent";
                      }}
                      className="flex-1"
                    >
                      AI Comfort & Safety
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const input = document.getElementById('edit-keywords') as HTMLInputElement;
                        if (input) input.value = "prompt, template, recipe, engineering, script, context, instruction, jailbreak, midjourney, gpt";
                      }}
                      className="flex-1"
                    >
                      The Prompt Economy
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const input = document.getElementById('edit-keywords') as HTMLInputElement;
                        if (input) input.value = "agent, copilot, api, plugin, workflow, automate, deploy, scale, vector, data";
                      }}
                      className="flex-1"
                    >
                      SaaS Infrastructure
                    </Button>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const input = document.getElementById('edit-keywords') as HTMLInputElement;
                      if (input) input.value = "";
                    }}
                    className="mt-1 text-xs"
                  >
                    Clear
                  </Button>
                </div>

                <div>
                  <Label htmlFor="edit-keywords">Keywords</Label>
                  <Input
                    id="edit-keywords"
                    name="keywords"
                    defaultValue={editingProject.keywords || ""}
                    placeholder="fitness, workout, nutrition (comma-separated)"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Enter relevant keywords separated by commas
                  </p>
                </div>

                <div className="flex gap-2 pt-4">
                  <Button type="submit" disabled={updateProject.isPending} className="flex-1">
                    {updateProject.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Save Changes"
                    )}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>
                    Cancel
                  </Button>
                </div>
              </form>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
