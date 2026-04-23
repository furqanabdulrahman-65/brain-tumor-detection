from backend import database, models, auth
from sqlalchemy.orm import Session

# Drop and Create
print("Dropping tables...")
models.Base.metadata.drop_all(bind=database.engine)
print("Creating tables...")
models.Base.metadata.create_all(bind=database.engine)

# Seed Guest User
db = Session(bind=database.engine)
guest_user = models.User(
    email="guest@neuroscan",
    hashed_password="dummy_hash_for_guest",
    is_doctor=True
)
db.add(guest_user)
db.commit()
print("Database reset and Guest User (ID 1) created.")
db.close()
