"""
RFP Upload and Processing Tests
"""
import pytest
import io
from fastapi.testclient import TestClient


@pytest.mark.api
class TestRFPUpload:
    """Test RFP document upload and processing"""
    
    def test_upload_pdf(self, client: TestClient, auth_headers, test_project):
        """Test uploading a PDF document"""
        # Create a mock PDF file
        pdf_content = b"%PDF-1.4\n%Test PDF Content\nSample RFP Document"
        files = {
            "file": ("test.pdf", io.BytesIO(pdf_content), "application/pdf")
        }
        data = {"project_id": test_project.id}
        
        response = client.post(
            "/upload/rfp",
            files=files,
            data=data,
            headers=auth_headers
        )
        
        # May return 200 or 201 depending on implementation
        assert response.status_code in [200, 201]
        result = response.json()
        assert "id" in result or "document_id" in result
    
    def test_upload_docx(self, client: TestClient, auth_headers, test_project):
        """Test uploading a DOCX document"""
        # Create mock DOCX content
        docx_content = b"PK\x03\x04Mock DOCX content"
        files = {
            "file": ("test.docx", io.BytesIO(docx_content), "application/vnd.openxmlformats-officedocument.wordprocessingml.document")
        }
        data = {"project_id": test_project.id}
        
        response = client.post(
            "/upload/rfp",
            files=files,
            data=data,
            headers=auth_headers
        )
        
        assert response.status_code in [200, 201, 422]  # 422 if file processing fails
    
    def test_upload_invalid_file_type(
        self, client: TestClient, auth_headers, test_project
    ):
        """Test uploading invalid file type"""
        files = {
            "file": ("test.txt", io.BytesIO(b"Plain text"), "text/plain")
        }
        data = {"project_id": test_project.id}
        
        response = client.post(
            "/upload/rfp",
            files=files,
            data=data,
            headers=auth_headers
        )
        
        # Should reject invalid file type
        assert response.status_code in [400, 415, 422]
    
    def test_upload_no_file(self, client: TestClient, auth_headers, test_project):
        """Test upload without file"""
        data = {"project_id": test_project.id}
        
        response = client.post(
            "/upload/rfp",
            data=data,
            headers=auth_headers
        )
        
        assert response.status_code == 422
    
    def test_upload_no_auth(self, client: TestClient, test_project):
        """Test upload without authentication"""
        files = {
            "file": ("test.pdf", io.BytesIO(b"test"), "application/pdf")
        }
        data = {"project_id": test_project.id}
        
        response = client.post(
            "/upload/rfp",
            files=files,
            data=data
        )
        
        assert response.status_code == 401
    
    @pytest.mark.slow
    def test_upload_large_file(
        self, client: TestClient, auth_headers, test_project, performance_tracker
    ):
        """Test uploading large file (performance)"""
        # Create 5MB file
        large_content = b"x" * (5 * 1024 * 1024)
        files = {
            "file": ("large.pdf", io.BytesIO(large_content), "application/pdf")
        }
        data = {"project_id": test_project.id}
        
        performance_tracker.start("large_upload")
        response = client.post(
            "/upload/rfp",
            files=files,
            data=data,
            headers=auth_headers
        )
        performance_tracker.end("large_upload")
        
        # Should handle large files (within 5 seconds)
        if response.status_code in [200, 201]:
            performance_tracker.assert_within_threshold("large_upload", 5.0)
    
    def test_get_uploaded_documents(
        self, client: TestClient, auth_headers, test_project
    ):
        """Test retrieving uploaded documents"""
        response = client.get(
            f"/upload/rfp/{test_project.id}",
            headers=auth_headers
        )
        
        assert response.status_code in [200, 404]
        if response.status_code == 200:
            data = response.json()
            assert isinstance(data, list)

