from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

SQL_DATABASE_URL = "sqlite:///./neuroscan.db"

engine = create_engine(
    SQL_DATABASE_URL, connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
