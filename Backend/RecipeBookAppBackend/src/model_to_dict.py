def model_to_dict(model):
    """Convert a Pydantic model to a dictionary safely for both v1 and v2."""
    if hasattr(model, "model_dump"):
        return model.model_dump()
    elif hasattr(model, "dict"):
        return model.dict()
    else:
        raise TypeError("Object is not a valid Pydantic model")