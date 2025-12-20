"""model_to_dict.py

This utility module provides a compatibility layer for converting Pydantic models
to dictionaries across different Pydantic versions.

Purpose:
    Pydantic v2 uses model_dump() while Pydantic v1 uses dict().
    This function automatically detects which version is installed and uses
    the appropriate method, ensuring the application works with both versions.

Usage:
    from model_to_dict import model_to_dict
    from pydantic import BaseModel
    
    class Recipe(BaseModel):
        name: str
        ingredients: list
    
    recipe = Recipe(name="Pasta", ingredients=["pasta", "sauce"])
    recipe_dict = model_to_dict(recipe)
    # Works with both Pydantic v1 and v2!
"""

def model_to_dict(model):
    """
    Convert a Pydantic model to a dictionary safely for both v1 and v2.
    
    This function provides version-independent serialization of Pydantic models.
    It checks which method is available on the model and uses the correct one.
    
    Args:
        model: A Pydantic model instance (BaseModel subclass)
        
    Returns:
        dict: Dictionary representation of the model with all fields
        
    Raises:
        TypeError: If the object is not a valid Pydantic model
        
    Example:
        >>> from pydantic import BaseModel
        >>> class User(BaseModel):
        ...     name: str
        ...     age: int
        >>> user = User(name="John", age=30)
        >>> model_to_dict(user)
        {'name': 'John', 'age': 30}
        
    Version Compatibility:
        - Pydantic v2.x: Uses model_dump() method
        - Pydantic v1.x: Uses dict() method
    """
    # Check for Pydantic v2 method first (newer version)
    if hasattr(model, "model_dump"):
        return model.model_dump()
    # Fallback to Pydantic v1 method
    elif hasattr(model, "dict"):
        return model.dict()
    # If neither method exists, it's not a Pydantic model
    else:
        raise TypeError("Object is not a valid Pydantic model")