export type DevOpsProviderId = "all" | "github" | "azure" | "gitlab" | "forge";

export type DevOpsEventType =
  | "commit"
  | "pull_request"
  | "merge_request"
  | "issue_closed"
  | "work_item"
  | "pipeline_build"
  | "code_review";

export interface DevOpsActivityEvent {
  id: string;
  provider: "github" | "azure" | "gitlab" | "forge";
  type: DevOpsEventType;
  title: string;
  repoOrProject: string;
  branchOrRef?: string;
  identifier?: string; // e.g., "PR #42", "AB#1290", "MR !18", "c9f1a2e"
  author: string;
  authorAvatar?: string;
  timestamp: number;
  timeAgo: string;
  url?: string;
  status?: "merged" | "completed" | "success" | "pushed" | "closed";
}

export interface ProviderConnectionConfig {
  connected: boolean;
  username: string;
  repoOrProject: string;
  orgName?: string;
  token?: string;
  apiEndpoint?: string;
  lastSyncedAt?: number;
  mode: "simulation" | "live";
}

export interface DevOpsDayActivity {
  dayLabel: "M" | "T" | "W" | "T" | "F" | "S" | "S";
  dateStr: string;
  dayOfMonth: number;
  commitsCount: number;
  prsCount: number;
  workItemsCount: number;
  totalEvents: number;
  isToday: boolean;
  isCompleted: boolean;
  displayBadge: string;
}

export interface ContributionCell {
  dateStr: string;
  count: number;
  level: 0 | 1 | 2 | 3 | 4; // GitHub heatmap intensity
  dayOfWeek: number; // 0-6
}

export interface DevOpsProjectMetric {
  id: string;
  name: string;
  provider: "github" | "azure" | "gitlab";
  tasksDone: number;
  totalTasks: number;
  progressPercent: number;
  url?: string;
}

export interface DevOpsCategoryMetric {
  key: string;
  name: string;
  delta: string;
  percent: number;
  color: string;
  isPrimary: boolean;
}

export interface DevOpsStatsResult {
  provider: DevOpsProviderId;
  providerLabel: string;
  currentMonthName: string;
  consecutiveStreakDays: number;
  daysCompletedThisMonth: number;
  weeklyDays: DevOpsDayActivity[];
  sparklineSvgPath: string;
  sparklinePeak: { x: number; y: number };
  tasksDoneCount: number;
  totalTasksCount: number;
  improvementPercent: number;
  totalProgressPercent: number;
  projectsData: DevOpsProjectMetric[];
  averageScore: number;
  categoryBars: DevOpsCategoryMetric[];
  contributionGrid: ContributionCell[];
  recentEvents: DevOpsActivityEvent[];
}
