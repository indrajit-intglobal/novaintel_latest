"""
Project Management Tests
Test CRUD operations for projects
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session


@pytest.mark.api
class TestProjects:
    """Test project endpoints"""
    
    def test_create_project(self, client: TestClient, auth_headers):
        """Test creating a new project"""
        project_data = {
            "title": "New Project",
            "description": "Project description",
            "client_name": "Acme Corp",
            "industry": "Technology",
            "region": "North America"
        }
        response = client.post(
            "/projects/",
            json=project_data,
            headers=auth_headers
        )
        assert response.status_code == 201
        data = response.json()
        assert data["title"] == project_data["title"]
        assert data["client_name"] == project_data["client_name"]
        assert "id" in data
    
    def test_create_project_no_auth(self, client: TestClient):
        """Test creating project without authentication fails"""
        project_data = {
            "title": "New Project",
            "client_name": "Test Client"
        }
        response = client.post("/projects/", json=project_data)
        assert response.status_code == 401
    
    def test_list_projects(self, client: TestClient, auth_headers, test_project):
        """Test listing all projects"""
        response = client.get("/projects/", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 1
    
    def test_get_project_by_id(self, client: TestClient, auth_headers, test_project):
        """Test getting specific project by ID"""
        response = client.get(
            f"/projects/{test_project.id}",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == test_project.id
        assert data["title"] == test_project.title
    
    def test_get_nonexistent_project(self, client: TestClient, auth_headers):
        """Test getting non-existent project returns 404"""
        response = client.get("/projects/99999", headers=auth_headers)
        assert response.status_code == 404
    
    def test_update_project(self, client: TestClient, auth_headers, test_project):
        """Test updating a project"""
        update_data = {
            "title": "Updated Project Title",
            "description": "Updated description"
        }
        response = client.put(
            f"/projects/{test_project.id}",
            json=update_data,
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["title"] == update_data["title"]
        assert data["description"] == update_data["description"]
    
    def test_update_project_ownership(
        self, client: TestClient, auth_headers, db: Session, test_admin
    ):
        """Test users can only update their own projects"""
        from models import Project
        
        # Create project owned by admin
        admin_project = Project(
            title="Admin Project",
            client_name="Admin Client",
            user_id=test_admin.id
        )
        db.add(admin_project)
        db.commit()
        db.refresh(admin_project)
        
        # Try to update as regular user (should fail)
        update_data = {"title": "Hacked Title"}
        response = client.put(
            f"/projects/{admin_project.id}",
            json=update_data,
            headers=auth_headers
        )
        assert response.status_code in [403, 404]
    
    def test_delete_project(self, client: TestClient, auth_headers, test_project):
        """Test deleting a project"""
        response = client.delete(
            f"/projects/{test_project.id}",
            headers=auth_headers
        )
        assert response.status_code == 204
        
        # Verify project is deleted
        response = client.get(
            f"/projects/{test_project.id}",
            headers=auth_headers
        )
        assert response.status_code == 404
    
    def test_delete_nonexistent_project(self, client: TestClient, auth_headers):
        """Test deleting non-existent project"""
        response = client.delete("/projects/99999", headers=auth_headers)
        assert response.status_code == 404
    
    def test_project_pagination(self, client: TestClient, auth_headers, db: Session, test_user):
        """Test project list pagination"""
        from models import Project
        
        # Create multiple projects
        for i in range(15):
            project = Project(
                title=f"Project {i}",
                client_name=f"Client {i}",
                user_id=test_user.id
            )
            db.add(project)
        db.commit()
        
        # Test with pagination params
        response = client.get(
            "/projects/?skip=0&limit=10",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert len(data) <= 10
    
    def test_project_search(self, client: TestClient, auth_headers, test_project):
        """Test project search functionality"""
        response = client.get(
            f"/projects/?search={test_project.title}",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert len(data) >= 1
        assert any(p["id"] == test_project.id for p in data)
    
    def test_project_filter_by_industry(
        self, client: TestClient, auth_headers, test_project
    ):
        """Test filtering projects by industry"""
        response = client.get(
            f"/projects/?industry={test_project.industry}",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert all(p["industry"] == test_project.industry for p in data)
    
    def test_project_performance(
        self, client: TestClient, auth_headers, performance_tracker
    ):
        """Test project list endpoint performance"""
        performance_tracker.start("project_list")
        response = client.get("/projects/", headers=auth_headers)
        performance_tracker.end("project_list")
        
        assert response.status_code == 200
        # Should respond within 1 second
        performance_tracker.assert_within_threshold("project_list", 1.0)

