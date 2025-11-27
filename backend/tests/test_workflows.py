"""
Multi-Agent Workflow Tests
Test the 6-agent workflow execution
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session


@pytest.mark.integration
@pytest.mark.workflow
@pytest.mark.slow
class TestMultiAgentWorkflow:
    """Test multi-agent workflow system"""
    
    def test_execute_workflow(
        self, client: TestClient, auth_headers, test_project,
        sample_rfp_content, db: Session, performance_tracker
    ):
        """Test complete workflow execution"""
        from models import RFPDocument
        
        # Create RFP document
        rfp = RFPDocument(
            project_id=test_project.id,
            file_name="test_rfp.pdf",
            file_path="/test/path.pdf",
            extracted_text=sample_rfp_content
        )
        db.add(rfp)
        db.commit()
        
        workflow_data = {
            "project_id": test_project.id,
            "rfp_document_id": rfp.id
        }
        
        performance_tracker.start("workflow_execution")
        response = client.post(
            "/agents/execute-workflow",
            json=workflow_data,
            headers=auth_headers
        )
        performance_tracker.end("workflow_execution")
        
        # Workflow should complete or start processing
        assert response.status_code in [200, 202, 503]
        
        if response.status_code == 200:
            data = response.json()
            assert "insights" in data or "status" in data
            # Workflow should complete within 60 seconds
            performance_tracker.assert_within_threshold("workflow_execution", 60.0)
    
    def test_workflow_without_rfp(
        self, client: TestClient, auth_headers, test_project
    ):
        """Test workflow fails without RFP document"""
        workflow_data = {"project_id": test_project.id}
        
        response = client.post(
            "/agents/execute-workflow",
            json=workflow_data,
            headers=auth_headers
        )
        
        # Should fail without RFP
        assert response.status_code in [400, 404, 422]
    
    def test_get_workflow_status(
        self, client: TestClient, auth_headers, test_project
    ):
        """Test getting workflow execution status"""
        response = client.get(
            f"/agents/workflow-status/{test_project.id}",
            headers=auth_headers
        )
        
        # Should return status or 404 if no workflow
        assert response.status_code in [200, 404]
    
    def test_insights_generation(
        self, client: TestClient, auth_headers, test_project,
        sample_rfp_content, db: Session
    ):
        """Test insights generation from RFP"""
        from models import RFPDocument
        
        rfp = RFPDocument(
            project_id=test_project.id,
            file_name="insights_test.pdf",
            file_path="/test/insights.pdf",
            extracted_text=sample_rfp_content
        )
        db.add(rfp)
        db.commit()
        
        response = client.post(
            "/insights/generate",
            json={
                "project_id": test_project.id,
                "rfp_document_id": rfp.id
            },
            headers=auth_headers
        )
        
        # May require Gemini API
        assert response.status_code in [200, 201, 503]
    
    def test_get_insights(
        self, client: TestClient, auth_headers, test_project, db: Session
    ):
        """Test retrieving generated insights"""
        from models import Insights
        
        insights = Insights(
            project_id=test_project.id,
            key_requirements="Test requirements",
            pain_points="Test pain points"
        )
        db.add(insights)
        db.commit()
        
        response = client.get(
            f"/insights/project/{test_project.id}",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["project_id"] == test_project.id

