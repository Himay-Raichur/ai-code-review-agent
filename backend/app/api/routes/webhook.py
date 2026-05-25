import hashlib
import hmac
from fastapi import APIRouter, Request, HTTPException, BackgroundTasks, Depends
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.repository import Repository
from app.models.user import User
from app.services import review_service
from app.core.config import settings

router = APIRouter(prefix="/webhook", tags=["Webhooks"])


def verify_signature(payload: bytes, signature: str) -> bool:
    if not settings.GITHUB_WEBHOOK_SECRET:
        return True
    expected = "sha256=" + hmac.new(
        settings.GITHUB_WEBHOOK_SECRET.encode(), payload, hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(expected, signature)


@router.post("/github")
async def github_webhook(
    request: Request,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    body = await request.body()
    sig = request.headers.get("X-Hub-Signature-256", "")

    if not verify_signature(body, sig):
        raise HTTPException(401, "Invalid webhook signature")

    event = request.headers.get("X-GitHub-Event")
    if event != "pull_request":
        return {"message": "Event ignored"}

    payload = await request.json()
    action = payload.get("action")

    if action not in ("opened", "synchronize", "reopened"):
        return {"message": f"Action '{action}' ignored"}

    repo_data = payload.get("repository", {})
    github_repo_id = str(repo_data.get("id"))
    pr_number = payload.get("number")

    repo = db.query(Repository).filter(
        Repository.github_repo_id == github_repo_id
    ).first()
    if not repo:
        return {"message": "Repository not configured"}

    user = db.query(User).filter(User.id == repo.owner_id).first()
    if not user or not user.github_access_token:
        return {"message": "User has no GitHub token"}

    background_tasks.add_task(review_service.run_review, db, user, repo, pr_number)
    return {"message": "Review queued", "pr": pr_number}
