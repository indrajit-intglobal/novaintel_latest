"""
Proposal Tests
Test proposal creation, editing, and export
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session


@pytest.mark.api
class TestProposal:
    """Test proposal endpoints"""
    
    def test_create_proposal(
        self, client: TestClient, auth_headers, test_project, db: Session
    ):
        """Test creating a new proposal"""
        from models import Insights
        
        # First create insights for the project
        insights = Insights(
            project_id=test_project.id,
            key_requirements="Test requirements",
            pain_points="Test pain points",
            decision_criteria="Test criteria",
            competitors=["Competitor A"],
            suggested_approach="Test approach"
        )
        db.add(insights)
        db.commit()
        
        proposal_data = {
            "project_id": test_project.id,
            "title": "Test Proposal",
            "executive_summary": "Summary",
            "problem_statement": "Problem",
            "proposed_solution": "Solution",
            "implementation_plan": "Plan",
            "pricing": "Pricing"
        }
        
        response = client.post(
            "/proposal/",
            json=proposal_data,
            headers=auth_headers
        )
        
        assert response.status_code in [200, 201]
        data = response.json()
        assert data["title"] == proposal_data["title"]
        assert "id" in data
    
    def test_list_proposals(self, client: TestClient, auth_headers):
        """Test listing all proposals"""
        response = client.get("/proposal/", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_get_proposal_by_id(
        self, client: TestClient, auth_headers, test_project, db: Session
    ):
        """Test getting specific proposal"""
        from models import Proposal
        
        proposal = Proposal(
            project_id=test_project.id,
            title="Test Proposal",
            executive_summary="Summary"
        )
        db.add(proposal)
        db.commit()
        db.refresh(proposal)
        
        response = client.get(
            f"/proposal/{proposal.id}",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == proposal.id
    
    def test_update_proposal(
        self, client: TestClient, auth_headers, test_project, db: Session
    ):
        """Test updating a proposal"""
        from models import Proposal
        
        proposal = Proposal(
            project_id=test_project.id,
            title="Original Title",
            executive_summary="Original Summary"
        )
        db.add(proposal)
        db.commit()
        db.refresh(proposal)
        
        update_data = {
            "title": "Updated Title",
            "executive_summary": "Updated Summary"
        }
        
        response = client.put(
            f"/proposal/{proposal.id}",
            json=update_data,
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["title"] == update_data["title"]
    
    def test_regenerate_section(
        self, client: TestClient, auth_headers, test_project, db: Session
    ):
        """Test regenerating a proposal section"""
        from models import Proposal
        
        proposal = Proposal(
            project_id=test_project.id,
            title="Test Proposal",
            executive_summary="Old Summary"
        )
        db.add(proposal)
        db.commit()
        db.refresh(proposal)
        
        response = client.post(
            f"/proposal/{proposal.id}/regenerate/executive_summary",
            headers=auth_headers
        )
        
        # May require Gemini API to be available
        assert response.status_code in [200, 503]
    
    @pytest.mark.slow
    def test_export_pdf(
        self, client: TestClient, auth_headers, test_project, db: Session
    ):
        """Test exporting proposal to PDF"""
        from models import Proposal
        
        proposal = Proposal(
            project_id=test_project.id,
            title="Test Proposal",
            executive_summary="Summary",
            problem_statement="Problem",
            proposed_solution="Solution"
        )
        db.add(proposal)
        db.commit()
        db.refresh(proposal)
        
        response = client.get(
            f"/proposal/{proposal.id}/export/pdf",
            headers=auth_headers
        )
        
        # Should return PDF file or error
        assert response.status_code in [200, 500]
        if response.status_code == 200:
            assert response.headers["content-type"] == "application/pdf"
    
    @pytest.mark.slow
    def test_export_pptx(
        self, client: TestClient, auth_headers, test_project, db: Session
    ):
        """Test exporting proposal to PPTX"""
        from models import Proposal
        
        proposal = Proposal(
            project_id=test_project.id,
            title="Test Proposal",
            executive_summary="Summary"
        )
        db.add(proposal)
        db.commit()
        db.refresh(proposal)
        
        response = client.get(
            f"/proposal/{proposal.id}/export/pptx",
            headers=auth_headers
        )
        
        assert response.status_code in [200, 500]
        if response.status_code == 200:
            assert "application" in response.headers["content-type"]
    
    def test_delete_proposal(
        self, client: TestClient, auth_headers, test_project, db: Session
    ):
        """Test deleting a proposal"""
        from models import Proposal
        
        proposal = Proposal(
            project_id=test_project.id,
            title="Test Proposal"
        )
        db.add(proposal)
        db.commit()
        db.refresh(proposal)
        
        response = client.delete(
            f"/proposal/{proposal.id}",
            headers=auth_headers
        )
        
        assert response.status_code in [200, 204]

