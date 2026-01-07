# backend/init_db.py

from db import engine
from schema import metadata

def init_db():
    metadata.create_all(engine)

if __name__ == "__main__":
    init_db()
    print("Database schema created")
