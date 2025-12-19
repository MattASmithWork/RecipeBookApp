from pymongo import MongoClient
from pymongo.server_api import ServerApi
import os

def get_database():
   # Require the MongoDB connection string from environment for safety
   CONNECTION_STRING = os.environ.get("MONGO_URI")
   if not CONNECTION_STRING:
      raise RuntimeError(
         "MONGO_URI environment variable is required. Set it to your MongoDB connection string."
      )

   # Create a connection using MongoClient
   client = MongoClient(CONNECTION_STRING, server_api=ServerApi("1"))

   try:
      # Send a ping to confirm a successful connection
      client.admin.command("ping")
      print("Pinged your deployment. You successfully connected to MongoDB!")
   except Exception as e:
      # Surface the exception but continue to return the client — callers may handle failures
      print("Warning: could not ping MongoDB:", e)

   # Create the database for our example (we will use the same database throughout)
   return client["recipeDatabase"]


# This is added so that many files can reuse the function get_database()
if __name__ == "__main__":
   # Get the database
   dbname = get_database()
