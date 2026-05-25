export interface User {
  id: number
  email: string
  username: string
  full_name?: string
  avatar_url?: string
  github_id?: string
  is_active: boolean
  is_admin: boolean
  created_at: string
}

export interface Repository {
  id: number
  github_repo_id: string
  name: string
  full_name: string
  description?: string
  language?: string
  is_private: boolean
  webhook_active: boolean
  review_style: 'strict' | 'balanced' | 'friendly'
  custom_rules?: string
  created_at: string
}

export interface GitHubRepo {
  id: number
  name: string
  full_name: string
  description?: string
  language?: string
  private: boolean
  stargazers_count: number
  updated_at: string
}

export interface PullRequest {
  id: number
  github_pr_number: number
  title: string
  description?: string
  author: string
  author_avatar?: string
  base_branch: string
  head_branch: string
  state: string
  additions: number
  deletions: number
  changed_files: number
  github_url?: string
  created_at: string
}

export interface ReviewIssue {
  type: 'bug' | 'security' | 'style' | 'performance' | 'documentation'
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info'
  file: string
  line?: number
  message: string
  suggestion?: string
}

export interface SecurityFlag {
  vulnerability: string
  file: string
  line?: number
  description: string
  fix: string
}

export interface Review {
  id: number
  overall_score?: number
  summary?: string
  issues: ReviewIssue[]
  security_flags: SecurityFlag[]
  suggestions: string[]
  positive_notes: string[]
  model_used: string
  processing_time_ms?: number
  status: 'pending' | 'processing' | 'completed' | 'failed'
  created_at: string
  pull_request?: PullRequest
}

export interface ChatMessage {
  id: number
  role: 'user' | 'assistant'
  content: string
  created_at: string
}

export interface Analytics {
  total_reviews: number
  total_issues_found: number
  total_security_flags: number
  avg_score: number
  reviews_by_day: { date: string; count: number }[]
  issues_by_type: Record<string, number>
  issues_by_severity: Record<string, number>
  top_repos: { name: string; reviews: number }[]
}
