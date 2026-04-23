import sys
try:
    import sqlalchemy
    print(f"SQLAlchemy version: {sqlalchemy.__version__}")
except Exception as e:
    print(f"Error importing sqlalchemy: {e}")
except MemoryError:
    print("MemoryError during import")
