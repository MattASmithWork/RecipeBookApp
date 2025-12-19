# RecipeBook Backend

FastAPI service that stores recipes in MongoDB.

## Requirements
- Python 3.13 (repo includes a venv in `bin/`)
- MongoDB connection string in `MONGO_URI`
- Optional: Docker (to run Mongo locally)

## Setup
1) Install deps into the bundled venv:
	 ```bash
	 Backend/RecipeBookAppBackend/bin/pip install -r Backend/RecipeBookAppBackend/src/requirements.txt
	 ```
2) Provide Mongo:
	 - **Local via Docker (requires Docker access):**
		 ```bash
		 docker run -d --name recipe-mongo -p 27017:27017 mongo:6.0
		 export MONGO_URI="mongodb://localhost:27017"
		 ```
	 - **Atlas/remote:** set `MONGO_URI` to your connection string.

## Run the API
```bash
cd Backend/RecipeBookAppBackend
export MONGO_URI="<your mongo uri>"
bin/python -m uvicorn src.app_api:app --host 0.0.0.0 --port 8000 --reload
```

## Quick checks
- Health: `curl http://localhost:8000/health`
- Create recipe for `matt`:
	```bash
	curl -X POST http://localhost:8000/recipes/ \
		-H "Content-Type: application/json" \
		-d '{"name":"Test","ingredients":["salt"],"instructions":["mix"],"prep_time":5,"cook_time":10,"servings":2,"user":"matt"}'
	```
- List recipes for `matt`: `curl http://localhost:8000/recipes/matt`
- Repeat the same calls with `user":"nicole"` to keep a separate collection of recipes for Nicole.

## Notes
- `connectToDataBase.py` requires `MONGO_URI`; without it the app raises at startup.
- Health check pings Mongo; it returns 503 if the DB is unreachable.