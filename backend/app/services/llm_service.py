import json
import time
from typing import AsyncGenerator
from groq import AsyncGroq
from app.core.config import settings

client = AsyncGroq(api_key=settings.GROQ_API_KEY)

REVIEW_SYSTEM_PROMPT = """You are an expert senior software engineer performing a thorough code review.
Analyze the provided git diff carefully and return a structured JSON review.

Your review must cover:
1. Bugs and logical errors
2. Security vulnerabilities (XSS, SQLi, hardcoded secrets, insecure patterns)
3. Performance issues
4. Code style and best practices
5. Missing tests or documentation
6. Positive aspects worth recognizing

Return ONLY valid JSON with this exact structure:
{
  "overall_score": <float 0-10>,
  "summary": "<2-3 sentence executive summary>",
  "issues": [
    {
      "type": "<bug|security|style|performance|documentation>",
      "severity": "<critical|high|medium|low|info>",
      "file": "<filename>",
      "line": <line_number or null>,
      "message": "<clear description of the issue>",
      "suggestion": "<concrete fix suggestion>"
    }
  ],
  "security_flags": [
    {
      "vulnerability": "<vulnerability name>",
      "file": "<filename>",
      "line": <line_number or null>,
      "description": "<what it is>",
      "fix": "<how to fix it>"
    }
  ],
  "suggestions": ["<improvement suggestion 1>", "<improvement suggestion 2>"],
  "positive_notes": ["<what was done well 1>", "<what was done well 2>"]
}"""

CHAT_SYSTEM_PROMPT = """You are a helpful code review assistant. The user has questions about a pull request review.
You have access to the PR diff and the review results. Answer questions clearly and concisely.
When referencing specific code, mention the file name and approximate line number.
Be constructive and educational in your responses."""


async def generate_review(diff: str, pr_title: str, pr_description: str, custom_rules: str = "") -> dict:
    start = time.time()

    rules_section = f"\n\nAdditional team rules to enforce:\n{custom_rules}" if custom_rules else ""

    user_message = f"""PR Title: {pr_title}
PR Description: {pr_description or 'No description provided'}
{rules_section}

Git Diff:
```
{diff[:12000]}
```

Review this diff thoroughly and return the JSON review."""

    response = await client.chat.completions.create(
        model=settings.GROQ_MODEL,
        messages=[
            {"role": "system", "content": REVIEW_SYSTEM_PROMPT},
            {"role": "user", "content": user_message},
        ],
        max_tokens=settings.GROQ_MAX_TOKENS,
        temperature=0.1,
    )

    elapsed = int((time.time() - start) * 1000)
    raw = response.choices[0].message.content.strip()

    # Clean up markdown code fences if present
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
    raw = raw.strip()

    try:
        result = json.loads(raw)
    except json.JSONDecodeError:
        result = {
            "overall_score": 5.0,
            "summary": "Review completed but response parsing failed. Raw response stored.",
            "issues": [],
            "security_flags": [],
            "suggestions": [raw[:500]],
            "positive_notes": [],
        }

    result["processing_time_ms"] = elapsed
    return result


async def chat_with_review(
    messages: list,
    diff: str,
    review_summary: str,
) -> AsyncGenerator[str, None]:
    system = f"""{CHAT_SYSTEM_PROMPT}

PR Diff (truncated):
```
{diff[:4000]}
```

Review Summary: {review_summary}"""

    stream = await client.chat.completions.create(
        model=settings.GROQ_MODEL,
        messages=[{"role": "system", "content": system}] + messages,
        max_tokens=1024,
        temperature=0.3,
        stream=True,
    )

    async for chunk in stream:
        delta = chunk.choices[0].delta.content
        if delta:
            yield delta
