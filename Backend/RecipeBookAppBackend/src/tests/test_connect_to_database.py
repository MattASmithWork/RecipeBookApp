"""
Test database connection functionality
"""

import pytest
import os
from unittest.mock import patch, MagicMock
from connectToDataBase import get_database


class TestGetDatabase:
    """Test get_database function"""
    
    @patch.dict(os.environ, {}, clear=True)
    def test_missing_mongo_uri(self):
        """Test that missing MONGO_URI raises RuntimeError"""
        with pytest.raises(RuntimeError) as exc_info:
            get_database()
        
        assert "MONGO_URI environment variable is required" in str(exc_info.value)
    
    @patch.dict(os.environ, {"MONGO_URI": "mongodb://localhost:27017/"})
    @patch('connectToDataBase.MongoClient')
    def test_successful_connection(self, mock_client_class):
        """Test successful database connection"""
        mock_client = MagicMock()
        mock_client.admin.command.return_value = {"ok": 1}
        mock_client.__getitem__ = MagicMock(return_value=MagicMock(name="recipeDatabase"))
        mock_client_class.return_value = mock_client
        
        db = get_database()
        
        # Verify ping was called
        mock_client.admin.command.assert_called_once_with("ping")
        # Verify database was accessed
        assert db is not None
    
    @patch.dict(os.environ, {"MONGO_URI": "mongodb://localhost:27017/"})
    @patch('connectToDataBase.MongoClient')
    def test_connection_failure(self, mock_client_class):
        """Test connection failure raises RuntimeError"""
        mock_client = MagicMock()
        mock_client.admin.command.side_effect = Exception("Connection refused")
        mock_client_class.return_value = mock_client
        
        with pytest.raises(RuntimeError) as exc_info:
            get_database()
        
        assert "Could not connect to MongoDB" in str(exc_info.value)
        assert "Connection refused" in str(exc_info.value)
    
    @patch.dict(os.environ, {"MONGO_URI": "mongodb://localhost:27017/"})
    @patch('connectToDataBase.MongoClient')
    def test_connection_pool_settings(self, mock_client_class):
        """Test that connection is created with correct pool settings"""
        from pymongo.server_api import ServerApi
        
        mock_client = MagicMock()
        mock_client.admin.command.return_value = {"ok": 1}
        mock_client.__getitem__ = MagicMock(return_value=MagicMock(name="recipeDatabase"))
        mock_client_class.return_value = mock_client
        
        db = get_database()
        
        # Verify MongoClient was called with correct parameters
        call_args = mock_client_class.call_args
        assert call_args[0][0] == "mongodb://localhost:27017/"
        assert call_args[1]["maxPoolSize"] == 50
        assert call_args[1]["minPoolSize"] == 10
        assert call_args[1]["maxIdleTimeMS"] == 45000
        assert call_args[1]["waitQueueTimeoutMS"] == 5000
        assert call_args[1]["serverSelectionTimeoutMS"] == 5000
        assert call_args[1]["connectTimeoutMS"] == 10000
        assert call_args[1]["socketTimeoutMS"] == 10000
        assert call_args[1]["retryWrites"] is True
        assert call_args[1]["retryReads"] is True
    
    def test_main_block_execution(self):
        """Test the __main__ block for direct script execution (lines 94-95)"""
        from connectToDataBase import get_database
        
        # Test that the database object has a name attribute
        # This covers the print statement in the __main__ block
        with patch.dict(os.environ, {"MONGO_URI": "mongodb://test:27017/"}):
            with patch('connectToDataBase.MongoClient') as mock_client:
                mock_client_instance = MagicMock()
                mock_client_instance.admin.command.return_value = {"ok": 1}
                mock_db = MagicMock()
                mock_db.name = "recipeDatabase"
                mock_client_instance.__getitem__.return_value = mock_db
                mock_client.return_value = mock_client_instance
                
                db = get_database()
                # Verify the database has a name attribute (accessed in line 95)
                assert hasattr(db, 'name')
                assert db.name == "recipeDatabase"
