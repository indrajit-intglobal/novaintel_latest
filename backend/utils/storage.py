"""
Cloud Storage adapter for file uploads and ChromaDB persistence.
Supports both local filesystem (development) and Google Cloud Storage (production).
"""
import os
from pathlib import Path
from typing import Optional, BinaryIO
from utils.config import settings

# Try to import Google Cloud Storage
try:
    from google.cloud import storage
    from google.cloud.exceptions import NotFound
    GCS_AVAILABLE = True
except ImportError:
    GCS_AVAILABLE = False
    storage = None
    NotFound = Exception


class StorageAdapter:
    """Adapter for file storage (local or Cloud Storage)."""
    
    def __init__(self):
        self.use_gcs = settings.USE_CLOUD_STORAGE if hasattr(settings, 'USE_CLOUD_STORAGE') else False
        self.gcs_client = None
        self.gcs_bucket = None
        
        if self.use_gcs and GCS_AVAILABLE:
            self._initialize_gcs()
        else:
            if self.use_gcs:
                print("[WARNING] Cloud Storage requested but google-cloud-storage not installed")
                print("   Install with: pip install google-cloud-storage")
                print("   Falling back to local storage")
            self.use_gcs = False
    
    def _initialize_gcs(self):
        """Initialize Google Cloud Storage client."""
        try:
            bucket_name = settings.GCS_BUCKET_NAME if hasattr(settings, 'GCS_BUCKET_NAME') else None
            if not bucket_name:
                print("[WARNING] GCS_BUCKET_NAME not set, using local storage")
                self.use_gcs = False
                return
            
            self.gcs_client = storage.Client()
            self.gcs_bucket = self.gcs_client.bucket(bucket_name)
            print(f"[OK] Cloud Storage initialized: {bucket_name}")
        except Exception as e:
            print(f"[WARNING] Failed to initialize Cloud Storage: {e}")
            print("   Falling back to local storage")
            self.use_gcs = False
    
    def upload_file(self, file_content: bytes, destination_path: str) -> str:
        """
        Upload a file to storage.
        
        Args:
            file_content: File content as bytes
            destination_path: Destination path (relative to bucket root or local upload dir)
        
        Returns:
            Storage path (GCS gs:// URI or local file path)
        """
        if self.use_gcs and self.gcs_bucket:
            return self._upload_to_gcs(file_content, destination_path)
        else:
            return self._upload_to_local(file_content, destination_path)
    
    def _upload_to_gcs(self, file_content: bytes, destination_path: str) -> str:
        """Upload file to Google Cloud Storage."""
        blob = self.gcs_bucket.blob(destination_path)
        blob.upload_from_string(file_content, content_type='application/octet-stream')
        return f"gs://{self.gcs_bucket.name}/{destination_path}"
    
    def _upload_to_local(self, file_content: bytes, destination_path: str) -> str:
        """Upload file to local filesystem."""
        upload_dir = Path(settings.UPLOAD_DIR)
        full_path = upload_dir / destination_path
        
        # Create parent directories
        full_path.parent.mkdir(parents=True, exist_ok=True)
        
        # Write file
        with open(full_path, 'wb') as f:
            f.write(file_content)
        
        return str(full_path)
    
    def download_file(self, source_path: str) -> Optional[bytes]:
        """
        Download a file from storage.
        
        Args:
            source_path: Storage path (GCS gs:// URI or local file path)
        
        Returns:
            File content as bytes, or None if not found
        """
        if source_path.startswith('gs://'):
            return self._download_from_gcs(source_path)
        else:
            return self._download_from_local(source_path)
    
    def _download_from_gcs(self, gs_path: str) -> Optional[bytes]:
        """Download file from Google Cloud Storage."""
        try:
            # Parse gs://bucket/path
            parts = gs_path.replace('gs://', '').split('/', 1)
            if len(parts) != 2:
                return None
            
            bucket_name, blob_path = parts
            bucket = self.gcs_client.bucket(bucket_name)
            blob = bucket.blob(blob_path)
            
            return blob.download_as_bytes()
        except NotFound:
            return None
        except Exception as e:
            print(f"[ERROR] Failed to download from GCS: {e}")
            return None
    
    def _download_from_local(self, file_path: str) -> Optional[bytes]:
        """Download file from local filesystem."""
        try:
            path = Path(file_path)
            if not path.is_absolute():
                # If relative, assume it's in upload dir
                path = Path(settings.UPLOAD_DIR) / file_path
            
            if not path.exists():
                return None
            
            with open(path, 'rb') as f:
                return f.read()
        except Exception as e:
            print(f"[ERROR] Failed to download from local: {e}")
            return None
    
    def delete_file(self, file_path: str) -> bool:
        """
        Delete a file from storage.
        
        Args:
            file_path: Storage path (GCS gs:// URI or local file path)
        
        Returns:
            True if deleted, False otherwise
        """
        if file_path.startswith('gs://'):
            return self._delete_from_gcs(file_path)
        else:
            return self._delete_from_local(file_path)
    
    def _delete_from_gcs(self, gs_path: str) -> bool:
        """Delete file from Google Cloud Storage."""
        try:
            parts = gs_path.replace('gs://', '').split('/', 1)
            if len(parts) != 2:
                return False
            
            bucket_name, blob_path = parts
            bucket = self.gcs_client.bucket(bucket_name)
            blob = bucket.blob(blob_path)
            blob.delete()
            return True
        except NotFound:
            return True  # Already deleted
        except Exception as e:
            print(f"[ERROR] Failed to delete from GCS: {e}")
            return False
    
    def _delete_from_local(self, file_path: str) -> bool:
        """Delete file from local filesystem."""
        try:
            path = Path(file_path)
            if not path.is_absolute():
                path = Path(settings.UPLOAD_DIR) / file_path
            
            if path.exists():
                path.unlink()
            return True
        except Exception as e:
            print(f"[ERROR] Failed to delete from local: {e}")
            return False
    
    def get_file_url(self, file_path: str, expires_in: Optional[int] = None) -> str:
        """
        Get a URL to access the file.
        
        Args:
            file_path: Storage path
            expires_in: URL expiration time in seconds (for signed URLs)
        
        Returns:
            Public or signed URL
        """
        if file_path.startswith('gs://'):
            return self._get_gcs_url(file_path, expires_in)
        else:
            return self._get_local_url(file_path)
    
    def _get_gcs_url(self, gs_path: str, expires_in: Optional[int] = None) -> str:
        """Get GCS URL (public or signed)."""
        try:
            parts = gs_path.replace('gs://', '').split('/', 1)
            if len(parts) != 2:
                return ""
            
            bucket_name, blob_path = parts
            bucket = self.gcs_client.bucket(bucket_name)
            blob = bucket.blob(blob_path)
            
            if expires_in:
                # Generate signed URL
                return blob.generate_signed_url(expiration=expires_in)
            else:
                # Return public URL (if bucket is public)
                return blob.public_url
        except Exception as e:
            print(f"[ERROR] Failed to get GCS URL: {e}")
            return ""
    
    def _get_local_url(self, file_path: str) -> str:
        """Get local file URL (relative path for serving via FastAPI)."""
        path = Path(file_path)
        if path.is_absolute():
            # Convert to relative path from upload dir
            upload_dir = Path(settings.UPLOAD_DIR)
            try:
                relative_path = path.relative_to(upload_dir)
                return f"/uploads/{relative_path.as_posix()}"
            except ValueError:
                return f"/uploads/{path.name}"
        else:
            return f"/uploads/{file_path}"


# Global storage adapter instance
storage_adapter = StorageAdapter()

