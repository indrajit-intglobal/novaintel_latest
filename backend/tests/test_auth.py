"""
Authentication Tests
Test user registration, login, token management
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session


@pytest.mark.auth
class TestAuthentication:
    """Test authentication endpoints"""
    
    def test_health_check(self, client: TestClient):
        """Test health check endpoint"""
        response = client.get("/health")
        assert response.status_code == 200
        assert response.json() == {"status": "healthy"}
    
    def test_register_user(self, client: TestClient):
        """Test user registration"""
        user_data = {
            "email": "newuser@example.com",
            "password": "NewUser123!",
            "full_name": "New User"
        }
        response = client.post("/auth/register", json=user_data)
        assert response.status_code == 201
        data = response.json()
        assert data["email"] == user_data["email"]
        assert data["full_name"] == user_data["full_name"]
        assert "id" in data
        assert "hashed_password" not in data
    
    def test_register_duplicate_email(self, client: TestClient, test_user):
        """Test registration with duplicate email fails"""
        user_data = {
            "email": test_user.email,
            "password": "Password123!",
            "full_name": "Duplicate User"
        }
        response = client.post("/auth/register", json=user_data)
        assert response.status_code == 400
        assert "already registered" in response.json()["detail"].lower()
    
    def test_register_invalid_email(self, client: TestClient):
        """Test registration with invalid email format"""
        user_data = {
            "email": "invalid-email",
            "password": "Password123!",
            "full_name": "Test User"
        }
        response = client.post("/auth/register", json=user_data)
        assert response.status_code == 422
    
    def test_register_weak_password(self, client: TestClient):
        """Test registration with weak password"""
        user_data = {
            "email": "user@example.com",
            "password": "weak",
            "full_name": "Test User"
        }
        response = client.post("/auth/register", json=user_data)
        # Should fail validation (weak password)
        assert response.status_code in [400, 422]
    
    def test_login_success(self, client: TestClient, test_user):
        """Test successful login"""
        login_data = {
            "username": test_user.email,
            "password": "Test123456!"
        }
        response = client.post("/auth/login", data=login_data)
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"
    
    def test_login_wrong_password(self, client: TestClient, test_user):
        """Test login with incorrect password"""
        login_data = {
            "username": test_user.email,
            "password": "WrongPassword123!"
        }
        response = client.post("/auth/login", data=login_data)
        assert response.status_code == 401
    
    def test_login_nonexistent_user(self, client: TestClient):
        """Test login with non-existent user"""
        login_data = {
            "username": "nonexistent@example.com",
            "password": "Password123!"
        }
        response = client.post("/auth/login", data=login_data)
        assert response.status_code == 401
    
    def test_get_current_user(self, client: TestClient, auth_headers, test_user):
        """Test getting current user info"""
        response = client.get("/auth/me", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == test_user.email
        assert data["id"] == test_user.id
    
    def test_get_current_user_no_auth(self, client: TestClient):
        """Test getting current user without authentication"""
        response = client.get("/auth/me")
        assert response.status_code == 401
    
    def test_get_current_user_invalid_token(self, client: TestClient):
        """Test getting current user with invalid token"""
        headers = {"Authorization": "Bearer invalid-token"}
        response = client.get("/auth/me", headers=headers)
        assert response.status_code == 401
    
    def test_token_refresh(self, client: TestClient, auth_token):
        """Test token refresh endpoint"""
        # This depends on your implementation
        # Adjust according to your auth router
        pass
    
    @pytest.mark.slow
    def test_password_reset_flow(self, client: TestClient, test_user):
        """Test password reset workflow"""
        # Request password reset
        response = client.post(
            "/auth/forgot-password",
            json={"email": test_user.email}
        )
        # May return 200 even if user doesn't exist (security best practice)
        assert response.status_code in [200, 404]


@pytest.mark.auth
class TestAuthorization:
    """Test role-based access control"""
    
    def test_user_role_access(self, client: TestClient, auth_headers):
        """Test regular user can access user endpoints"""
        response = client.get("/projects/", headers=auth_headers)
        assert response.status_code == 200
    
    def test_admin_role_access(self, client: TestClient, admin_headers):
        """Test admin can access admin endpoints"""
        # Assuming you have admin-only endpoints
        response = client.get("/auth/me", headers=admin_headers)
        assert response.status_code == 200
    
    def test_analyst_role_access(self, client: TestClient, analyst_headers):
        """Test analyst role permissions"""
        response = client.get("/projects/", headers=analyst_headers)
        assert response.status_code == 200


@pytest.mark.auth
@pytest.mark.unit
class TestPasswordValidation:
    """Test password validation logic"""
    
    def test_password_hash_verification(self):
        """Test password hashing and verification"""
        from utils.auth import verify_password, get_password_hash
        
        password = "TestPassword123!"
        hashed = get_password_hash(password)
        
        assert verify_password(password, hashed)
        assert not verify_password("WrongPassword", hashed)
    
    def test_token_creation_and_decode(self):
        """Test JWT token creation and decoding"""
        from utils.auth import create_access_token, decode_access_token
        
        data = {"sub": "test@example.com"}
        token = create_access_token(data)
        
        decoded = decode_access_token(token)
        assert decoded["sub"] == data["sub"]

