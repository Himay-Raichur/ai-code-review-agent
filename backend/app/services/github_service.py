import httpx
from typing import Optional
from app.core.config import settings


async def exchange_code_for_token(code: str) -> str:
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            "https://github.com/login/oauth/access_token",
            data={
                "client_id": settings.GITHUB_CLIENT_ID,
                "client_secret": settings.GITHUB_CLIENT_SECRET,
                "code": code,
            },
            headers={"Accept": "application/json"},
        )
        data = resp.json()
        return data.get("access_token", "")


async def get_github_user(access_token: str) -> dict:
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            "https://api.github.com/user",
            headers={"Authorization": f"Bearer {access_token}", "Accept": "application/vnd.github+json"},
        )
        return resp.json()


async def get_user_repos(access_token: str, page: int = 1) -> list[dict]:
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"https://api.github.com/user/repos?sort=updated&per_page=50&page={page}",
            headers={"Authorization": f"Bearer {access_token}"},
        )
        return resp.json()


async def get_pr_diff(access_token: str, repo_full_name: str, pr_number: int) -> str:
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"https://api.github.com/repos/{repo_full_name}/pulls/{pr_number}",
            headers={
                "Authorization": f"Bearer {access_token}",
                "Accept": "application/vnd.github.diff",
            },
        )
        return resp.text


async def get_pr_details(access_token: str, repo_full_name: str, pr_number: int) -> dict:
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"https://api.github.com/repos/{repo_full_name}/pulls/{pr_number}",
            headers={
                "Authorization": f"Bearer {access_token}",
                "Accept": "application/vnd.github+json",
            },
        )
        return resp.json()


async def get_repo_prs(access_token: str, repo_full_name: str, state: str = "open") -> list[dict]:
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"https://api.github.com/repos/{repo_full_name}/pulls?state={state}&per_page=20",
            headers={"Authorization": f"Bearer {access_token}"},
        )
        return resp.json()


async def post_pr_comment(access_token: str, repo_full_name: str, pr_number: int, body: str):
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"https://api.github.com/repos/{repo_full_name}/issues/{pr_number}/comments",
            json={"body": body},
            headers={
                "Authorization": f"Bearer {access_token}",
                "Accept": "application/vnd.github+json",
            },
        )
        return resp.json()


async def create_webhook(access_token: str, repo_full_name: str, webhook_url: str, secret: str) -> dict:
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"https://api.github.com/repos/{repo_full_name}/hooks",
            json={
                "name": "web",
                "active": True,
                "events": ["pull_request"],
                "config": {
                    "url": webhook_url,
                    "content_type": "json",
                    "secret": secret,
                    "insecure_ssl": "0",
                },
            },
            headers={
                "Authorization": f"Bearer {access_token}",
                "Accept": "application/vnd.github+json",
            },
        )
        return resp.json()


def format_review_comment(review: dict, pr_title: str) -> str:
    score = review.get("overall_score", 0)
    score_emoji = "🟢" if score >= 7 else "🟡" if score >= 4 else "🔴"

    issues = review.get("issues", [])
    critical = [i for i in issues if i.get("severity") == "critical"]
    high = [i for i in issues if i.get("severity") == "high"]
    security = review.get("security_flags", [])

    comment = f"""## 🤖 AI Code Review — {pr_title}

{score_emoji} **Overall Score: {score:.1f}/10**

### Summary
{review.get('summary', 'No summary available.')}

---

### Issues Found ({len(issues)} total)
"""
    if critical:
        comment += "\n#### 🔴 Critical\n"
        for i in critical[:3]:
            comment += f"- **{i['file']}** (line {i.get('line','?')}): {i['message']}\n"

    if high:
        comment += "\n#### 🟠 High\n"
        for i in high[:3]:
            comment += f"- **{i['file']}**: {i['message']}\n"

    if security:
        comment += f"\n### 🔒 Security Flags ({len(security)})\n"
        for s in security[:3]:
            comment += f"- **{s['vulnerability']}** in `{s['file']}`: {s['description']}\n"

    suggestions = review.get("suggestions", [])
    if suggestions:
        comment += "\n### 💡 Suggestions\n"
        for s in suggestions[:4]:
            comment += f"- {s}\n"

    positives = review.get("positive_notes", [])
    if positives:
        comment += "\n### ✅ Looks Good\n"
        for p in positives[:3]:
            comment += f"- {p}\n"

    comment += "\n\n---\n*Reviewed by AI Code Review Agent (Llama 3.1 70B via Groq)*"
    return comment
