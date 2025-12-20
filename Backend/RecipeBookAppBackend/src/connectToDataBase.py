"""connectToDataBase.py

This module handles the MongoDB database connection for the Recipe Book App.
It provides a reusable function to establish and verify database connectivity.

Key Features:
- Secure connection using environment variables (MONGO_URI)
- Connection verification with ping command
- Centralized database access for the entire application
- Error handling for connection failures

Usage:
    from connectToDataBase import get_database
    db = get_database()
    recipes_collection = db["recipes"]

Environment Variables Required:
    MONGO_URI: MongoDB connection string (e.g., mongodb+srv://user:pass@cluster.mongodb.net/)
"""

from pymongo import MongoClient  # MongoDB Python driver
from pymongo.server_api import ServerApi  # Server API for MongoDB Atlas
import os  # For accessing environment variables

def get_database():
    """
    Establishes a connection to the MongoDB database and returns the database instance.
    
    This function:
    1. Reads the MongoDB connection string from environment variables (for security)
    2. Creates a MongoClient connection with Server API v1
    3. Verifies the connection with a ping command
    4. Returns the "recipeDatabase" database instance
    
    Returns:
        pymongo.database.Database: The recipeDatabase instance for accessing collections
        
    Raises:
        RuntimeError: If MONGO_URI environment variable is not set
        
    Note:
        If the ping fails, a warning is printed but the client is still returned.
        This allows the application to attempt operations even if the initial ping fails.
    """
    # Require the MongoDB connection string from environment for security
    # Never hardcode connection strings with credentials!
    CONNECTION_STRING = os.environ.get("MONGO_URI")
    if not CONNECTION_STRING:
        raise RuntimeError(
            "MONGO_URI environment variable is required. Set it to your MongoDB connection string."
        )

    # Create a connection using MongoClient with Server API v1 and optimized connection pool
    # ServerApi("1") ensures compatibility with MongoDB Atlas
    # Connection pool settings optimize performance under load
    client = MongoClient(
        CONNECTION_STRING,
        server_api=ServerApi("1"),
        maxPoolSize=50,              # Maximum connections in pool (default: 100)
        minPoolSize=10,              # Minimum connections to maintain (default: 0)
        maxIdleTimeMS=45000,         # Close connections idle for 45 seconds
        waitQueueTimeoutMS=5000,     # Fail fast if pool is exhausted (5 seconds)
        serverSelectionTimeoutMS=5000,  # Fail fast if server unreachable (5 seconds)
        connectTimeoutMS=10000,      # Connection timeout (10 seconds)
        socketTimeoutMS=10000,       # Socket operation timeout (10 seconds)
        retryWrites=True,            # Retry write operations on failure
        retryReads=True,             # Retry read operations on failure
    )

    try:
        # Send a ping to confirm a successful connection
        # This verifies that the connection string is valid and the database is reachable
        client.admin.command("ping")
        print("✓ Successfully connected to MongoDB!")
        print(f"✓ Connection pool configured: max={50}, min={10}")
    except Exception as e:
        # Connection failed - raise exception instead of continuing with broken connection
        print(f"✗ Failed to connect to MongoDB: {e}")
        raise RuntimeError(
            f"Could not connect to MongoDB. Please check your MONGO_URI and network connection. Error: {e}"
        )

    # Return the database instance
    # "recipeDatabase" is the database name used throughout the application
    # All collections (recipes, shoppingList, inventory) are stored in this database
    return client["recipeDatabase"]


# This is added so that many files can reuse the function get_database()
# When imported, only the function is available, not the test code below
if __name__ == "__main__":
    # Test code: Run this file directly to verify database connection
    # Example: python connectToDataBase.py
    dbname = get_database()
    print(f"Successfully connected to database: {dbname.name}")
