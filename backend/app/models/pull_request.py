from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Float, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
from app.db.database import Base


class PullRequest(Base):
    __tablename__ = "pull_requests"

    id = Column(Integer, primary_key=True, index=True)
    repository_id = Column(Integer, ForeignKey("repositories.id"), nullable=False)
    github_pr_number = Column(Integer, nullable=False)
    title = Column(String(500), nullable=False)
    description = Column(Text, nullable=True)
    author = Column(String(255), nullable=False)
    author_avatar = Column(String(500), nullable=True)
    base_branch = Column(String(255), nullable=False)
    head_branch = Column(String(255), nullable=False)
    state = Column(String(50), default="open")
    additions = Column(Integer, default=0)
    deletions = Column(Integer, default=0)
    changed_files = Column(Integer, default=0)
    github_url = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    repository = relationship("Repository", back_populates="pull_requests")
    reviews = relationship("Review", back_populates="pull_request", cascade="all, delete")


class Review(Base):
    __tablename__ = "reviews"

    id = Column(Integer, primary_key=True, index=True)
    pull_request_id = Column(Integer, ForeignKey("pull_requests.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    overall_score = Column(Float, nullable=True)
    summary = Column(Text, nullable=True)
    issues = Column(JSON, default=list)       # list of {type, severity, file, line, message, suggestion}
    security_flags = Column(JSON, default=list)
    suggestions = Column(JSON, default=list)
    positive_notes = Column(JSON, default=list)
    raw_diff = Column(Text, nullable=True)
    model_used = Column(String(100), default="llama-3.1-70b-versatile")
    processing_time_ms = Column(Integer, nullable=True)
    status = Column(String(50), default="pending")  # pending | processing | completed | failed
    created_at = Column(DateTime, default=datetime.utcnow)

    pull_request = relationship("PullRequest", back_populates="reviews")
    user = relationship("User", back_populates="reviews")
    chat_messages = relationship("ChatMessage", back_populates="review", cascade="all, delete")
