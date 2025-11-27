"""
Pytest configuration and fixtures for NovaIntel tests
"""
import pytest
import sys
from pathlib import Path
from typing import Generator, Dict, Any
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import StaticPool
import os

# Add backend directory to path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

from main import app
from db.database import Base, get_db
from models import User, Project, RFPDocument, Proposal, CaseStudy
from utils.auth import get_password_hash, create_access_token

# Test database URL (in-memory SQLite)
SQLALCHEMY_TEST_DATABASE_URL = "sqlite:///:memory:"

# Create test engine
engine = create_engine(
    SQLALCHEMY_TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)

TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="function")
def db() -> Generator[Session, None, None]:
    """Create a fresh database for each test"""
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def client(db: Session) -> Generator[TestClient, None, None]:
    """Create a test client with database dependency override"""
    def override_get_db():
        try:
            yield db
        finally:
            pass
    
    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture
def test_user(db: Session) -> User:
    """Create a test user"""
    user = User(
        email="test@example.com",
        full_name="Test User",
        hashed_password=get_password_hash("Test123456!"),
        is_active=True,
        is_verified=True,
        role="user"
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture
def test_admin(db: Session) -> User:
    """Create a test admin user"""
    admin = User(
        email="admin@example.com",
        full_name="Admin User",
        hashed_password=get_password_hash("Admin123456!"),
        is_active=True,
        is_verified=True,
        role="admin"
    )
    db.add(admin)
    db.commit()
    db.refresh(admin)
    return admin


@pytest.fixture
def test_analyst(db: Session) -> User:
    """Create a test analyst user"""
    analyst = User(
        email="analyst@example.com",
        full_name="Analyst User",
        hashed_password=get_password_hash("Analyst123456!"),
        is_active=True,
        is_verified=True,
        role="analyst"
    )
    db.add(analyst)
    db.commit()
    db.refresh(analyst)
    return analyst


@pytest.fixture
def auth_token(test_user: User) -> str:
    """Generate authentication token for test user"""
    return create_access_token(data={"sub": test_user.email})


@pytest.fixture
def admin_token(test_admin: User) -> str:
    """Generate authentication token for admin user"""
    return create_access_token(data={"sub": test_admin.email})


@pytest.fixture
def analyst_token(test_analyst: User) -> str:
    """Generate authentication token for analyst user"""
    return create_access_token(data={"sub": test_analyst.email})


@pytest.fixture
def auth_headers(auth_token: str) -> Dict[str, str]:
    """Get authentication headers"""
    return {"Authorization": f"Bearer {auth_token}"}


@pytest.fixture
def admin_headers(admin_token: str) -> Dict[str, str]:
    """Get admin authentication headers"""
    return {"Authorization": f"Bearer {admin_token}"}


@pytest.fixture
def analyst_headers(analyst_token: str) -> Dict[str, str]:
    """Get analyst authentication headers"""
    return {"Authorization": f"Bearer {analyst_token}"}


@pytest.fixture
def test_project(db: Session, test_user: User) -> Project:
    """Create a test project"""
    project = Project(
        title="Test Project",
        description="Test project description",
        client_name="Test Client",
        industry="Technology",
        region="North America",
        user_id=test_user.id,
        status="active"
    )
    db.add(project)
    db.commit()
    db.refresh(project)
    return project


@pytest.fixture
def test_case_study(db: Session, test_user: User) -> CaseStudy:
    """Create a test case study"""
    case_study = CaseStudy(
        title="Test Case Study",
        client_name="Test Client",
        industry="Technology",
        challenge="Test challenge",
        solution="Test solution",
        results="Test results",
        user_id=test_user.id
    )
    db.add(case_study)
    db.commit()
    db.refresh(case_study)
    return case_study


@pytest.fixture
def sample_rfp_content() -> str:
    """Sample RFP document content for testing"""
    return """
    REQUEST FOR PROPOSAL
    
    Project: Enterprise Cloud Migration
    Client: Acme Corporation
    Industry: Technology
    
    Requirements:
    1. Migrate on-premise infrastructure to cloud
    2. Implement security best practices
    3. Ensure high availability and disaster recovery
    4. Provide training and documentation
    
    Timeline: 6 months
    Budget: $500,000
    
    Evaluation Criteria:
    - Technical approach (40%)
    - Experience and qualifications (30%)
    - Cost (20%)
    - Timeline (10%)
    """


@pytest.fixture
def mock_env_vars(monkeypatch):
    """Mock environment variables for testing"""
    monkeypatch.setenv("DATABASE_URL", SQLALCHEMY_TEST_DATABASE_URL)
    monkeypatch.setenv("SECRET_KEY", "test-secret-key-do-not-use-in-production")
    monkeypatch.setenv("GEMINI_API_KEY", "test-gemini-key")
    monkeypatch.setenv("ENVIRONMENT", "test")


# Performance tracking fixtures
@pytest.fixture
def performance_tracker():
    """Track performance metrics during tests"""
    import time
    
    class PerformanceTracker:
        def __init__(self):
            self.metrics = {}
        
        def start(self, name: str):
            self.metrics[name] = {"start": time.time()}
        
        def end(self, name: str):
            if name in self.metrics:
                self.metrics[name]["end"] = time.time()
                self.metrics[name]["duration"] = (
                    self.metrics[name]["end"] - self.metrics[name]["start"]
                )
        
        def get_duration(self, name: str) -> float:
            return self.metrics.get(name, {}).get("duration", 0)
        
        def assert_within_threshold(self, name: str, threshold: float):
            duration = self.get_duration(name)
            assert duration <= threshold, (
                f"{name} took {duration:.3f}s, expected <= {threshold}s"
            )
    
    return PerformanceTracker()

