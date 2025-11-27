"""
Case Studies Tests
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session


@pytest.mark.api
class TestCaseStudies:
    """Test case study endpoints"""
    
    def test_create_case_study(self, client: TestClient, auth_headers):
        """Test creating a new case study"""
        case_study_data = {
            "title": "Test Case Study",
            "client_name": "Test Client",
            "industry": "Technology",
            "challenge": "Test challenge",
            "solution": "Test solution",
            "results": "Test results"
        }
        
        response = client.post(
            "/case-studies/",
            json=case_study_data,
            headers=auth_headers
        )
        
        assert response.status_code in [200, 201]
        data = response.json()
        assert data["title"] == case_study_data["title"]
        assert "id" in data
    
    def test_list_case_studies(self, client: TestClient, auth_headers, test_case_study):
        """Test listing all case studies"""
        response = client.get("/case-studies/", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 1
    
    def test_get_case_study(self, client: TestClient, auth_headers, test_case_study):
        """Test getting specific case study"""
        response = client.get(
            f"/case-studies/{test_case_study.id}",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == test_case_study.id
    
    def test_update_case_study(self, client: TestClient, auth_headers, test_case_study):
        """Test updating a case study"""
        update_data = {
            "title": "Updated Case Study",
            "results": "Updated results"
        }
        
        response = client.put(
            f"/case-studies/{test_case_study.id}",
            json=update_data,
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["title"] == update_data["title"]
    
    def test_delete_case_study(self, client: TestClient, auth_headers, test_case_study):
        """Test deleting a case study"""
        response = client.delete(
            f"/case-studies/{test_case_study.id}",
            headers=auth_headers
        )
        
        assert response.status_code in [200, 204]
    
    def test_filter_by_industry(
        self, client: TestClient, auth_headers, test_case_study
    ):
        """Test filtering case studies by industry"""
        response = client.get(
            f"/case-studies/?industry={test_case_study.industry}",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert all(cs["industry"] == test_case_study.industry for cs in data)
    
    def test_match_case_studies(
        self, client: TestClient, auth_headers, test_project
    ):
        """Test matching case studies to project"""
        response = client.get(
            f"/case-studies/match/{test_project.id}",
            headers=auth_headers
        )
        
        assert response.status_code in [200, 404]

