"""
Test model_to_dict utility function for Pydantic version compatibility
"""

import pytest
from pydantic import BaseModel
from model_to_dict import model_to_dict


class SampleModel(BaseModel):
    """Sample Pydantic model for testing"""
    name: str
    age: int
    active: bool = True


class TestModelToDict:
    """Test model_to_dict utility function"""
    
    def test_model_to_dict_basic(self):
        """Test converting a basic Pydantic model to dict"""
        model = SampleModel(name="John", age=30)
        result = model_to_dict(model)
        
        assert isinstance(result, dict)
        assert result["name"] == "John"
        assert result["age"] == 30
        assert result["active"] is True
    
    def test_model_to_dict_with_defaults(self):
        """Test model to dict with default values"""
        model = SampleModel(name="Jane", age=25, active=False)
        result = model_to_dict(model)
        
        assert result["name"] == "Jane"
        assert result["age"] == 25
        assert result["active"] is False
    
    def test_model_to_dict_invalid_object(self):
        """Test model_to_dict raises TypeError for non-Pydantic objects"""
        invalid_object = {"name": "test"}
        
        with pytest.raises(TypeError) as exc_info:
            model_to_dict(invalid_object)
        
        assert "not a valid Pydantic model" in str(exc_info.value)
    
    def test_model_to_dict_string_input(self):
        """Test model_to_dict raises TypeError for string input"""
        with pytest.raises(TypeError) as exc_info:
            model_to_dict("not a model")
        
        assert "not a valid Pydantic model" in str(exc_info.value)
    
    def test_model_to_dict_none_input(self):
        """Test model_to_dict raises TypeError for None input"""
        with pytest.raises(TypeError) as exc_info:
            model_to_dict(None)
        
        assert "not a valid Pydantic model" in str(exc_info.value)
    
    def test_model_to_dict_pydantic_v1_fallback(self):
        """Test fallback to Pydantic v1 .dict() method"""
        from unittest.mock import MagicMock
        
        # Create a mock object that has .dict() but not .model_dump()
        mock_model = MagicMock()
        # Remove model_dump attribute to simulate Pydantic v1
        del mock_model.model_dump
        mock_model.dict.return_value = {"test": "data"}
        
        result = model_to_dict(mock_model)
        
        assert result == {"test": "data"}
        mock_model.dict.assert_called_once()
    
    def test_model_to_dict_neither_method(self):
        """Test error when object has neither model_dump nor dict method (line 58)"""
        from unittest.mock import MagicMock
        
        # Create a mock object without model_dump or dict
        mock_obj = MagicMock()
        del mock_obj.model_dump
        del mock_obj.dict
        
        with pytest.raises(TypeError) as exc_info:
            model_to_dict(mock_obj)
        
        assert "not a valid Pydantic model" in str(exc_info.value)
