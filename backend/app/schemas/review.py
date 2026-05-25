from pydantic import BaseModel
from typing import Optional, List, Any
from datetime import datetime


# ── Repository ──────────────────────────────────────────
class RepositoryCreate(BaseModel):
    github_repo_id: str
    name: str
    full_name: str
    description: Optional[str] = None
    language: Optional[str] = None
    is_private: bool = False


class RepositoryUpdate(BaseModel):
    review_style: Optional[str] = None
    custom_rules: Optional[str] = None


class RepositoryResponse(BaseModel):
    id: int
    github_repo_id: str
    name: str
    full_name: str
    description: Optional[str]
    language: Optional[str]
    is_private: bool
    webhook_active: bool
    review_style: str
    custom_rules: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


# ── Pull Request ─────────────────────────────────────────
class PullRequestResponse(BaseModel):
    id: int
    github_pr_number: int
    title: str
    description: Optional[str]
    author: str
    author_avatar: Optional[str]
    base_branch: str
    head_branch: str
    state: str
    additions: int
    deletions: int
    changed_files: int
    github_url: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


# ── Review ───────────────────────────────────────────────
class ReviewIssue(BaseModel):
    type: str          # bug | security | style | performance | documentation
    severity: str      # critical | high | medium | low | info
    file: str
    line: Optional[int]
    message: str
    suggestion: Optional[str]


class ReviewResponse(BaseModel):
    id: int
    overall_score: Optional[float]
    summary: Optional[str]
    issues: List[Any]
    security_flags: List[Any]
    suggestions: List[Any]
    positive_notes: List[Any]
    model_used: str
    processing_time_ms: Optional[int]
    status: str
    created_at: datetime
    pull_request: Optional[PullRequestResponse]

    class Config:
        from_attributes = True


# ── Chat ─────────────────────────────────────────────────
class ChatMessageCreate(BaseModel):
    content: str


class ChatMessageResponse(BaseModel):
    id: int
    role: str
    content: str
    created_at: datetime

    class Config:
        from_attributes = True


# ── Manual Review Request ────────────────────────────────
class ManualReviewRequest(BaseModel):
    repo_full_name: str
    pr_number: int


# ── Analytics ────────────────────────────────────────────
class AnalyticsResponse(BaseModel):
    total_reviews: int
    total_issues_found: int
    total_security_flags: int
    avg_score: float
    reviews_by_day: List[dict]
    issues_by_type: dict
    issues_by_severity: dict
    top_repos: List[dict]
