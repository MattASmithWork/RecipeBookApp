from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from bson import ObjectId
from connectToDataBase import get_database
from model_to_dict import model_to_dict

app = FastAPI()
db = get_database()
recipes = db["recipes"]


@app.get("/health")
def health():
    try:
        # use the client's ping to check MongoDB connectivity
        db.client.admin.command("ping")
        return {"status": "ok"}
    except Exception:
        raise HTTPException(status_code=503, detail="DB unreachable")

class Recipe(BaseModel):
    name: str
    ingredients: list[str]
    instructions: list[str]
    prep_time: int
    cook_time: int
    servings: int
    user: str  # for 2-user support

@app.post("/recipes/")
def add_recipe(recipe: Recipe):
    inserted = recipes.insert_one(model_to_dict(recipe))
    return {"id": str(inserted.inserted_id)}

@app.get("/recipes/{user}")
def get_recipes(user: str):
    data = list(recipes.find({"user": user}))
    for d in data:
        d["_id"] = str(d["_id"])
    return data

@app.put("/recipes/{id}")
def update_recipe(id: str, recipe: Recipe):
    result = recipes.update_one({"_id": ObjectId(id)}, {"$set": model_to_dict(recipe)})
    if result.matched_count == 0:
        raise HTTPException(404, "Recipe not found")
    return {"message": "Recipe updated"}

@app.delete("/recipes/{id}")
def delete_recipe(id: str):
    result = recipes.delete_one({"_id": ObjectId(id)})
    if result.deleted_count == 0:
        raise HTTPException(404, "Recipe not found")
    return {"message": "Recipe deleted"}
