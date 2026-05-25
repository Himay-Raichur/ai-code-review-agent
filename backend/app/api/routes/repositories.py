from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.user import User
from app.models.repository import Repository
from app.schemas.review import RepositoryCreate, RepositoryUpdate, RepositoryResponse
from app.core.security import get_current_user
from app.services import github_service
from app.core.config import settings

router = APIRouter(prefix="/repositories", tags=["Repositories"])


@router.get("/github", summary="List user's GitHub repos")
async def list_github_repos(current_user: User = Depends(get_current_user)):
    if not current_user.github_access_token:
        raise HTTPException(400, "No GitHub account connected")
    repos = await github_service.get_user_repos(current_user.github_access_token)
    return repos


@router.get("/", response_model=list[RepositoryResponse])
async def list_repositories(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return db.query(Repository).filter(Repository.owner_id == current_user.id).all()


@router.post("/", response_model=RepositoryResponse, status_code=201)
async def add_repository(
    payload: RepositoryCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    existing = db.query(Repository).filter(
        Repository.github_repo_id == payload.github_repo_id
    ).first()
    if existing:
        raise HTTPException(409, "Repository already added")

    repo = Repository(owner_id=current_user.id, **payload.model_dump())
    db.add(repo)
    db.commit()
    db.refresh(repo)
    return repo


@router.get("/{repo_id}", response_model=RepositoryResponse)
async def get_repository(
    repo_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    repo = db.query(Repository).filter(
        Repository.id == repo_id, Repository.owner_id == current_user.id
    ).first()
    if not repo:
        raise HTTPException(404, "Repository not found")
    return repo


@router.patch("/{repo_id}", response_model=RepositoryResponse)
async def update_repository(
    repo_id: int,
    payload: RepositoryUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    repo = db.query(Repository).filter(
        Repository.id == repo_id, Repository.owner_id == current_user.id
    ).first()
    if not repo:
        raise HTTPException(404, "Repository not found")
    if payload.review_style:
        repo.review_style = payload.review_style
    if payload.custom_rules is not None:
        repo.custom_rules = payload.custom_rules
    db.commit()
    db.refresh(repo)
    return repo


@router.post("/{repo_id}/webhook")
async def setup_webhook(
    repo_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    repo = db.query(Repository).filter(
        Repository.id == repo_id, Repository.owner_id == current_user.id
    ).first()
    if not repo:
        raise HTTPException(404, "Repository not found")
    if not current_user.github_access_token:
        raise HTTPException(400, "GitHub not connected")

    webhook_url = f"{settings.FRONTEND_URL.replace('5173', '8000')}/api/v1/webhook/github"
    result = await github_service.create_webhook(
        current_user.github_access_token,
        repo.full_name,
        webhook_url,
        settings.GITHUB_WEBHOOK_SECRET,
    )
    if "id" in result:
        repo.webhook_id = str(result["id"])
        repo.webhook_active = True
        db.commit()
        return {"message": "Webhook created", "webhook_id": result["id"]}
    raise HTTPException(400, f"Webhook failed: {result.get('message', 'unknown')}")


@router.delete("/{repo_id}")
async def remove_repository(
    repo_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    repo = db.query(Repository).filter(
        Repository.id == repo_id, Repository.owner_id == current_user.id
    ).first()
    if not repo:
        raise HTTPException(404, "Repository not found")
    db.delete(repo)
    db.commit()
    return {"message": "Repository removed"}
