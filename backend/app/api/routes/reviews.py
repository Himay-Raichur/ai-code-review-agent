from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.db.database import get_db
from app.models.user import User
from app.models.repository import Repository
from app.models.pull_request import PullRequest, Review
from app.models.chat import ChatMessage
from app.schemas.review import (
    ReviewResponse, ManualReviewRequest, ChatMessageCreate, ChatMessageResponse, AnalyticsResponse
)
from app.core.security import get_current_user
from app.services import review_service, llm_service, embedding_service

router = APIRouter(prefix="/reviews", tags=["Reviews"])


@router.post("/trigger", status_code=202)
async def trigger_review(
    payload: ManualReviewRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    repo = db.query(Repository).filter(
        Repository.full_name == payload.repo_full_name,
        Repository.owner_id == current_user.id,
    ).first()
    if not repo:
        raise HTTPException(404, "Repository not found. Add it first.")
    if not current_user.github_access_token:
        raise HTTPException(400, "GitHub account not connected")

    background_tasks.add_task(
        review_service.run_review, db, current_user, repo, payload.pr_number
    )
    return {"message": "Review started", "repo": payload.repo_full_name, "pr": payload.pr_number}


@router.get("/", response_model=list[ReviewResponse])
async def list_reviews(
    skip: int = 0,
    limit: int = 20,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    reviews = (
        db.query(Review)
        .filter(Review.user_id == current_user.id)
        .order_by(Review.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    return reviews


@router.get("/analytics", response_model=AnalyticsResponse)
async def get_analytics(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    reviews = db.query(Review).filter(
        Review.user_id == current_user.id, Review.status == "completed"
    ).all()

    total = len(reviews)
    total_issues = sum(len(r.issues or []) for r in reviews)
    total_security = sum(len(r.security_flags or []) for r in reviews)
    avg_score = sum(r.overall_score or 0 for r in reviews) / max(total, 1)

    from collections import Counter, defaultdict
    from datetime import datetime, timedelta

    # Issues by type and severity
    type_counter = Counter()
    sev_counter = Counter()
    for r in reviews:
        for issue in (r.issues or []):
            type_counter[issue.get("type", "unknown")] += 1
            sev_counter[issue.get("severity", "unknown")] += 1

    # Reviews by day (last 30 days)
    day_counter = defaultdict(int)
    cutoff = datetime.utcnow() - timedelta(days=30)
    for r in reviews:
        if r.created_at >= cutoff:
            day_counter[r.created_at.strftime("%Y-%m-%d")] += 1

    reviews_by_day = [{"date": k, "count": v} for k, v in sorted(day_counter.items())]

    # Top repos
    repo_counter = Counter()
    for r in reviews:
        if r.pull_request and r.pull_request.repository:
            repo_counter[r.pull_request.repository.name] += 1
    top_repos = [{"name": k, "reviews": v} for k, v in repo_counter.most_common(5)]

    return AnalyticsResponse(
        total_reviews=total,
        total_issues_found=total_issues,
        total_security_flags=total_security,
        avg_score=round(avg_score, 1),
        reviews_by_day=reviews_by_day,
        issues_by_type=dict(type_counter),
        issues_by_severity=dict(sev_counter),
        top_repos=top_repos,
    )


@router.get("/{review_id}", response_model=ReviewResponse)
async def get_review(
    review_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    review = db.query(Review).filter(
        Review.id == review_id, Review.user_id == current_user.id
    ).first()
    if not review:
        raise HTTPException(404, "Review not found")
    return review


@router.get("/{review_id}/chat", response_model=list[ChatMessageResponse])
async def get_chat_history(
    review_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    review = db.query(Review).filter(
        Review.id == review_id, Review.user_id == current_user.id
    ).first()
    if not review:
        raise HTTPException(404, "Review not found")
    return db.query(ChatMessage).filter(ChatMessage.review_id == review_id).order_by(ChatMessage.created_at).all()


@router.post("/{review_id}/chat")
async def chat_about_review(
    review_id: int,
    payload: ChatMessageCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    review = db.query(Review).filter(
        Review.id == review_id, Review.user_id == current_user.id
    ).first()
    if not review:
        raise HTTPException(404, "Review not found")

    # Save user message
    user_msg = ChatMessage(review_id=review_id, role="user", content=payload.content)
    db.add(user_msg)
    db.commit()

    # Build conversation history
    history = db.query(ChatMessage).filter(
        ChatMessage.review_id == review_id
    ).order_by(ChatMessage.created_at).all()

    messages = [{"role": m.role, "content": m.content} for m in history]

    # Stream response
    full_response = []

    async def stream_and_save():
        async for chunk in llm_service.chat_with_review(
            messages=messages,
            diff=review.raw_diff or "",
            review_summary=review.summary or "",
        ):
            full_response.append(chunk)
            yield f"data: {chunk}\n\n"

        # Save assistant response after streaming
        assistant_msg = ChatMessage(
            review_id=review_id,
            role="assistant",
            content="".join(full_response),
        )
        db.add(assistant_msg)
        db.commit()
        yield "data: [DONE]\n\n"

    return StreamingResponse(stream_and_save(), media_type="text/event-stream")


@router.get("/search/semantic")
async def semantic_search(
    q: str,
    repo: str = None,
    current_user: User = Depends(get_current_user),
):
    results = embedding_service.search_similar_reviews(q, repo=repo)
    return {"query": q, "results": results}
