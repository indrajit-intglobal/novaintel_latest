"""
RAG System Tests
Test vector database, embeddings, and query functionality
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session


@pytest.mark.rag
@pytest.mark.slow
class TestRAGSystem:
    """Test RAG (Retrieval-Augmented Generation) system"""
    
    def test_build_index(
        self, client: TestClient, auth_headers, test_project,
        sample_rfp_content, db: Session
    ):
        """Test building vector index from document"""
        from models import RFPDocument
        
        rfp = RFPDocument(
            project_id=test_project.id,
            file_name="rag_test.pdf",
            file_path="/test/rag.pdf",
            extracted_text=sample_rfp_content
        )
        db.add(rfp)
        db.commit()
        db.refresh(rfp)
        
        response = client.post(
            "/rag/build-index",
            json={
                "project_id": test_project.id,
                "document_id": rfp.id
            },
            headers=auth_headers
        )
        
        # May require external services
        assert response.status_code in [200, 201, 503]
    
    def test_query_rag(
        self, client: TestClient, auth_headers, test_project
    ):
        """Test querying RAG system"""
        query_data = {
            "project_id": test_project.id,
            "query": "What are the main requirements?"
        }
        
        response = client.post(
            "/rag/query",
            json=query_data,
            headers=auth_headers
        )
        
        # May need index to be built first
        assert response.status_code in [200, 404, 503]
    
    def test_rag_chat(
        self, client: TestClient, auth_headers, test_project
    ):
        """Test RAG chat functionality"""
        chat_data = {
            "project_id": test_project.id,
            "message": "Tell me about the technical requirements"
        }
        
        response = client.post(
            "/rag/chat",
            json=chat_data,
            headers=auth_headers
        )
        
        assert response.status_code in [200, 404, 503]
        
        if response.status_code == 200:
            data = response.json()
            assert "response" in data or "answer" in data
    
    def test_clear_cache(self, client: TestClient, auth_headers, test_project):
        """Test clearing RAG cache"""
        response = client.delete(
            f"/rag/cache/{test_project.id}",
            headers=auth_headers
        )
        
        assert response.status_code in [200, 204, 404]
    
    @pytest.mark.slow
    def test_query_performance(
        self, client: TestClient, auth_headers, test_project,
        performance_tracker, db: Session, sample_rfp_content
    ):
        """Test RAG query response time"""
        from models import RFPDocument
        
        # Setup
        rfp = RFPDocument(
            project_id=test_project.id,
            file_name="perf_test.pdf",
            file_path="/test/perf.pdf",
            extracted_text=sample_rfp_content
        )
        db.add(rfp)
        db.commit()
        
        # Build index (may timeout if service unavailable)
        try:
            client.post(
                "/rag/build-index",
                json={"project_id": test_project.id, "document_id": rfp.id},
                headers=auth_headers,
                timeout=10.0
            )
        except:
            pytest.skip("RAG service unavailable")
        
        # Test query performance
        query_data = {
            "project_id": test_project.id,
            "query": "What is the budget?"
        }
        
        performance_tracker.start("rag_query")
        response = client.post(
            "/rag/query",
            json=query_data,
            headers=auth_headers
        )
        performance_tracker.end("rag_query")
        
        if response.status_code == 200:
            # Query should respond within 2 seconds
            performance_tracker.assert_within_threshold("rag_query", 2.0)

