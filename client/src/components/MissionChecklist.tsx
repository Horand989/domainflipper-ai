import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Rocket, Target, Wrench, Megaphone, CheckCircle2, Circle, ChevronDown, ChevronRight } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';

interface Task {
  id: number;
  taskId: string;
  title: string;
  description: string;
  action: string;
  priority: 'high' | 'medium' | 'low';
  category: 'zombie_page' | 'keyword_content' | 'technical' | 'marketing';
  estimatedTime: string;
  url?: string | null;
  keyword?: string | null;
  targetWordCount?: number | null;
  completed: number;
  completedAt?: Date | null;
  notes?: string | null;
}

interface Plan {
  id: number;
  domain: string;
  summary: string;
  estimatedCompletionDays: number;
  completedTasksCount: number;
  totalTasksCount: number;
  status: 'active' | 'completed' | 'archived';
  generatedAt: Date;
}

interface MissionChecklistProps {
  planId: number;
}

export function MissionChecklist({ planId }: MissionChecklistProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(['zombie_page', 'keyword_content'])
  );

  const { data, isLoading, refetch } = trpc.launchStrategy.get.useQuery({ planId });
  const toggleTaskMutation = trpc.launchStrategy.toggleTask.useMutation({
    onSuccess: () => {
      refetch();
      toast.success('Task updated');
    },
    onError: (error) => {
      toast.error(`Failed to update task: ${error.message}`);
    },
  });

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3 mb-6"></div>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </Card>
    );
  }

  if (!data) {
    return null;
  }

  const { plan, tasks } = data as { plan: Plan; tasks: Task[] };

  const tasksByCategory = {
    zombie_page: tasks.filter(t => t.category === 'zombie_page'),
    keyword_content: tasks.filter(t => t.category === 'keyword_content'),
    technical: tasks.filter(t => t.category === 'technical'),
    marketing: tasks.filter(t => t.category === 'marketing'),
  };

  const categoryConfig = {
    zombie_page: {
      title: 'Zombie Page Recovery',
      icon: Target,
      description: 'Recreate high-value URLs with existing backlinks',
      color: 'text-red-600',
      bgColor: 'bg-red-50',
    },
    keyword_content: {
      title: 'Easy Win Keywords',
      icon: Rocket,
      description: 'Target high-probability ranking opportunities',
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    technical: {
      title: 'Technical Setup',
      icon: Wrench,
      description: 'Foundation and infrastructure tasks',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    marketing: {
      title: 'Marketing & Outreach',
      icon: Megaphone,
      description: 'Promotion and link building',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
  };

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const handleToggleTask = (taskId: number, currentStatus: number) => {
    toggleTaskMutation.mutate({
      taskId,
      completed: currentStatus === 0,
    });
  };

  const progressPercentage = Math.round((plan.completedTasksCount / plan.totalTasksCount) * 100);

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="p-6 bg-gradient-to-r from-purple-50 to-blue-50">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              🚀 30-Day Launch Strategy
            </h2>
            <p className="text-gray-600 mb-4">{plan.summary}</p>
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <span>📅 {plan.estimatedCompletionDays} days</span>
              <span>📋 {plan.totalTasksCount} tasks</span>
              <span>✅ {plan.completedTasksCount} completed</span>
            </div>
          </div>
          <Badge variant={plan.status === 'completed' ? 'default' : 'secondary'} className="text-lg px-4 py-2">
            {progressPercentage}% Complete
          </Badge>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
          <div
            className="bg-gradient-to-r from-green-500 to-blue-500 h-full transition-all duration-500"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </Card>

      {/* Task Categories */}
      {(Object.keys(tasksByCategory) as Array<keyof typeof tasksByCategory>).map(category => {
        const categoryTasks = tasksByCategory[category];
        if (categoryTasks.length === 0) return null;

        const config = categoryConfig[category];
        const Icon = config.icon;
        const isExpanded = expandedCategories.has(category);
        const completedCount = categoryTasks.filter(t => t.completed === 1).length;

        return (
          <Card key={category} className="overflow-hidden">
            {/* Category Header */}
            <button
              onClick={() => toggleCategory(category)}
              className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${config.bgColor}`}>
                  <Icon className={`w-5 h-5 ${config.color}`} />
                </div>
                <div className="text-left">
                  <h3 className="font-semibold text-gray-900">{config.title}</h3>
                  <p className="text-sm text-gray-600">{config.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="outline">
                  {completedCount}/{categoryTasks.length}
                </Badge>
                {isExpanded ? (
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                )}
              </div>
            </button>

            {/* Tasks List */}
            {isExpanded && (
              <div className="border-t divide-y">
                {categoryTasks.map(task => (
                  <div key={task.id} className="p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start gap-3">
                      {/* Checkbox */}
                      <Checkbox
                        checked={task.completed === 1}
                        onCheckedChange={() => handleToggleTask(task.id, task.completed)}
                        className="mt-1"
                      />

                      {/* Task Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <h4 className={`font-medium ${task.completed === 1 ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                            {task.title}
                          </h4>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <Badge variant={task.priority === 'high' ? 'destructive' : task.priority === 'medium' ? 'default' : 'secondary'}>
                              {task.priority}
                            </Badge>
                            <span className="text-xs text-gray-500">{task.estimatedTime}</span>
                          </div>
                        </div>

                        <p className="text-sm text-gray-600 mb-2">{task.description}</p>

                        {/* Action Details */}
                        <div className="bg-gray-50 rounded-lg p-3 mb-2">
                          <p className="text-sm text-gray-700 whitespace-pre-wrap">{task.action}</p>
                        </div>

                        {/* Metadata */}
                        <div className="flex flex-wrap gap-2 text-xs text-gray-500">
                          {task.url && (
                            <span className="flex items-center gap-1">
                              🔗 URL: <code className="bg-gray-100 px-1 rounded">{task.url}</code>
                            </span>
                          )}
                          {task.keyword && (
                            <span className="flex items-center gap-1">
                              🎯 Keyword: <code className="bg-gray-100 px-1 rounded">{task.keyword}</code>
                            </span>
                          )}
                          {task.targetWordCount && (
                            <span>📝 Target: {task.targetWordCount} words</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}
