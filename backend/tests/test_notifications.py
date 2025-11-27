"""
Notifications Tests
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session


@pytest.mark.api
class TestNotifications:
    """Test notification system"""
    
    def test_get_notifications(self, client: TestClient, auth_headers):
        """Test getting user notifications"""
        response = client.get("/notifications/", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_create_notification(
        self, client: TestClient, db: Session, test_user
    ):
        """Test creating a notification"""
        from models import Notification
        
        notification = Notification(
            user_id=test_user.id,
            title="Test Notification",
            message="Test message",
            type="info"
        )
        db.add(notification)
        db.commit()
        db.refresh(notification)
        
        assert notification.id is not None
        assert notification.is_read is False
    
    def test_mark_notification_read(
        self, client: TestClient, auth_headers, db: Session, test_user
    ):
        """Test marking notification as read"""
        from models import Notification
        
        notification = Notification(
            user_id=test_user.id,
            title="Test",
            message="Test",
            type="info"
        )
        db.add(notification)
        db.commit()
        db.refresh(notification)
        
        response = client.put(
            f"/notifications/{notification.id}/read",
            headers=auth_headers
        )
        
        assert response.status_code in [200, 204]
    
    def test_mark_all_read(self, client: TestClient, auth_headers):
        """Test marking all notifications as read"""
        response = client.put(
            "/notifications/mark-all-read",
            headers=auth_headers
        )
        
        assert response.status_code in [200, 204]
    
    def test_delete_notification(
        self, client: TestClient, auth_headers, db: Session, test_user
    ):
        """Test deleting a notification"""
        from models import Notification
        
        notification = Notification(
            user_id=test_user.id,
            title="Test",
            message="Test",
            type="info"
        )
        db.add(notification)
        db.commit()
        db.refresh(notification)
        
        response = client.delete(
            f"/notifications/{notification.id}",
            headers=auth_headers
        )
        
        assert response.status_code in [200, 204]
    
    @pytest.mark.slow
    def test_notification_delivery_performance(
        self, client: TestClient, auth_headers, performance_tracker
    ):
        """Test notification retrieval performance"""
        performance_tracker.start("get_notifications")
        response = client.get("/notifications/", headers=auth_headers)
        performance_tracker.end("get_notifications")
        
        assert response.status_code == 200
        # Should be fast (< 300ms)
        performance_tracker.assert_within_threshold("get_notifications", 0.3)

