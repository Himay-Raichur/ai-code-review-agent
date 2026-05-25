from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from app.db.database import Base


class Repository(Base):
    __tablename__ = "repositories"

    id = Column(Integer, primary_key=True, index=True)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    github_repo_id = Column(String(100), unique=True, nullable=False)
    name = Column(String(255), nullable=False)
    full_name = Column(String(500), nullable=False)
    description = Column(Text, nullable=True)
    language = Column(String(100), nullable=True)
    is_private = Column(Boolean, default=False)
    webhook_id = Column(String(100), nullable=True)
    webhook_active = Column(Boolean, default=False)
    review_style = Column(String(50), default="balanced")  # strict | balanced | friendly
    custom_rules = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    owner = relationship("User", back_populates="repositories")
    pull_requests = relationship("PullRequest", back_populates="repository", cascade="all, delete")
