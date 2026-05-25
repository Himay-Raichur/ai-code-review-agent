from sqlalchemy.orm import Session
from app.models.pull_request import PullRequest, Review
from app.models.repository import Repository
from app.models.user import User
from app.services import llm_service, github_service


async def run_review(
    db: Session,
    user: User,
    repo: Repository,
    pr_number: int,
) -> Review:
    """Full pipeline: fetch diff → LLM review → store → embed → post comment."""

    # 1. Fetch PR details from GitHub
    pr_data = await github_service.get_pr_details(
        user.github_access_token, repo.full_name, pr_number
    )
    diff = await github_service.get_pr_diff(
        user.github_access_token, repo.full_name, pr_number
    )

    # 2. Upsert PR record
    pr = db.query(PullRequest).filter(
        PullRequest.repository_id == repo.id,
        PullRequest.github_pr_number == pr_number,
    ).first()

    if not pr:
        pr = PullRequest(
            repository_id=repo.id,
            github_pr_number=pr_number,
            title=pr_data.get("title", ""),
            description=pr_data.get("body", ""),
            author=pr_data.get("user", {}).get("login", "unknown"),
            author_avatar=pr_data.get("user", {}).get("avatar_url"),
            base_branch=pr_data.get("base", {}).get("ref", "main"),
            head_branch=pr_data.get("head", {}).get("ref", "feature"),
            state=pr_data.get("state", "open"),
            additions=pr_data.get("additions", 0),
            deletions=pr_data.get("deletions", 0),
            changed_files=pr_data.get("changed_files", 0),
            github_url=pr_data.get("html_url"),
        )
        db.add(pr)
        db.commit()
        db.refresh(pr)

    # 3. Create review record (pending)
    review = Review(
        pull_request_id=pr.id,
        user_id=user.id,
        status="processing",
        raw_diff=diff[:50000],
    )
    db.add(review)
    db.commit()
    db.refresh(review)

    try:
        # 4. Run LLM review
        result = await llm_service.generate_review(
            diff=diff,
            pr_title=pr.title,
            pr_description=pr.description or "",
            custom_rules=repo.custom_rules or "",
        )

        # 5. Update review with results
        review.overall_score = result.get("overall_score")
        review.summary = result.get("summary")
        review.issues = result.get("issues", [])
        review.security_flags = result.get("security_flags", [])
        review.suggestions = result.get("suggestions", [])
        review.positive_notes = result.get("positive_notes", [])
        review.processing_time_ms = result.get("processing_time_ms")
        review.status = "completed"
        db.commit()
        db.refresh(review)


        # 6. Post comment to GitHub PR
        comment_body = github_service.format_review_comment(result, pr.title)
        await github_service.post_pr_comment(
            user.github_access_token, repo.full_name, pr_number, comment_body
        )

    except Exception as e:
        review.status = "failed"
        review.summary = f"Review failed: {str(e)}"
        db.commit()

    return review
