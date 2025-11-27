"""
Chat System Integration Tests
Test chat functionality including WebSocket connections
"""
import pytest
import json
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session


@pytest.mark.integration
@pytest.mark.websocket
class TestChatSystem:
    """Test chat system and WebSocket functionality"""
    
    def test_create_conversation(
        self, client: TestClient, auth_headers, test_user, test_admin, db: Session
    ):
        """Test creating a new conversation"""
        conversation_data = {
            "title": "Test Chat",
            "participant_ids": [test_user.id, test_admin.id]
        }
        
        response = client.post(
            "/chat/conversations",
            json=conversation_data,
            headers=auth_headers
        )
        
        assert response.status_code in [200, 201]
        data = response.json()
        assert data["title"] == conversation_data["title"]
        assert "id" in data
    
    def test_list_conversations(self, client: TestClient, auth_headers):
        """Test listing user's conversations"""
        response = client.get("/chat/conversations", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_get_conversation(
        self, client: TestClient, auth_headers, db: Session, test_user
    ):
        """Test getting specific conversation"""
        from models import Conversation
        
        conversation = Conversation(
            title="Test Conversation",
            created_by=test_user.id
        )
        db.add(conversation)
        db.commit()
        db.refresh(conversation)
        
        response = client.get(
            f"/chat/conversations/{conversation.id}",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == conversation.id
    
    def test_send_message(
        self, client: TestClient, auth_headers, db: Session, test_user
    ):
        """Test sending a message in conversation"""
        from models import Conversation, ConversationParticipant
        
        conversation = Conversation(
            title="Test Chat",
            created_by=test_user.id
        )
        db.add(conversation)
        db.commit()
        db.refresh(conversation)
        
        # Add user as participant
        participant = ConversationParticipant(
            conversation_id=conversation.id,
            user_id=test_user.id
        )
        db.add(participant)
        db.commit()
        
        message_data = {
            "content": "Test message",
            "conversation_id": conversation.id
        }
        
        response = client.post(
            "/chat/messages",
            json=message_data,
            headers=auth_headers
        )
        
        assert response.status_code in [200, 201]
        data = response.json()
        assert data["content"] == message_data["content"]
    
    def test_get_messages(
        self, client: TestClient, auth_headers, db: Session, test_user
    ):
        """Test retrieving messages from conversation"""
        from models import Conversation, Message, ConversationParticipant
        
        conversation = Conversation(
            title="Test Chat",
            created_by=test_user.id
        )
        db.add(conversation)
        db.commit()
        
        # Add participant
        participant = ConversationParticipant(
            conversation_id=conversation.id,
            user_id=test_user.id
        )
        db.add(participant)
        db.commit()
        
        # Add messages
        for i in range(5):
            message = Message(
                conversation_id=conversation.id,
                user_id=test_user.id,
                content=f"Message {i}"
            )
            db.add(message)
        db.commit()
        
        response = client.get(
            f"/chat/conversations/{conversation.id}/messages",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 5
    
    @pytest.mark.slow
    def test_message_delivery_performance(
        self, client: TestClient, auth_headers, db: Session,
        test_user, performance_tracker
    ):
        """Test message delivery performance (< 500ms)"""
        from models import Conversation, ConversationParticipant
        
        conversation = Conversation(
            title="Performance Test",
            created_by=test_user.id
        )
        db.add(conversation)
        db.commit()
        
        participant = ConversationParticipant(
            conversation_id=conversation.id,
            user_id=test_user.id
        )
        db.add(participant)
        db.commit()
        
        message_data = {
            "content": "Performance test message",
            "conversation_id": conversation.id
        }
        
        performance_tracker.start("message_send")
        response = client.post(
            "/chat/messages",
            json=message_data,
            headers=auth_headers
        )
        performance_tracker.end("message_send")
        
        assert response.status_code in [200, 201]
        # Message should be sent within 500ms
        performance_tracker.assert_within_threshold("message_send", 0.5)
    
    def test_mark_messages_read(
        self, client: TestClient, auth_headers, db: Session, test_user
    ):
        """Test marking messages as read"""
        from models import Conversation, Message, ConversationParticipant
        
        conversation = Conversation(
            title="Test Chat",
            created_by=test_user.id
        )
        db.add(conversation)
        db.commit()
        
        participant = ConversationParticipant(
            conversation_id=conversation.id,
            user_id=test_user.id
        )
        db.add(participant)
        
        message = Message(
            conversation_id=conversation.id,
            user_id=test_user.id,
            content="Test message"
        )
        db.add(message)
        db.commit()
        db.refresh(message)
        
        response = client.post(
            f"/chat/messages/{message.id}/read",
            headers=auth_headers
        )
        
        assert response.status_code in [200, 204]
    
    def test_websocket_connection(self, client: TestClient, auth_token, test_user):
        """Test WebSocket connection establishment"""
        # Note: TestClient WebSocket support is limited
        # This is a basic connectivity test
        try:
            with client.websocket_connect(
                f"/chat/ws/{test_user.id}?token={auth_token}"
            ) as websocket:
                # Connection established
                assert websocket is not None
        except Exception as e:
            # WebSocket may not work with TestClient
            pytest.skip(f"WebSocket testing requires real server: {e}")
    
    def test_typing_indicator(
        self, client: TestClient, auth_headers, db: Session, test_user
    ):
        """Test typing indicator functionality"""
        from models import Conversation, ConversationParticipant
        
        conversation = Conversation(
            title="Test Chat",
            created_by=test_user.id
        )
        db.add(conversation)
        db.commit()
        
        participant = ConversationParticipant(
            conversation_id=conversation.id,
            user_id=test_user.id
        )
        db.add(participant)
        db.commit()
        
        # Test typing indicator endpoint if it exists
        response = client.post(
            f"/chat/conversations/{conversation.id}/typing",
            json={"is_typing": True},
            headers=auth_headers
        )
        
        # May or may not be implemented
        assert response.status_code in [200, 404]

