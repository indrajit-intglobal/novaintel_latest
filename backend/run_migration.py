"""
Standalone script to run the new features migration.
Run this if you want to migrate the database without starting the server.
"""
import sys
from pathlib import Path

# Add backend to path
backend_path = Path(__file__).parent
sys.path.insert(0, str(backend_path))

from db.migrate_new_features import run_migration

if __name__ == "__main__":
    print("Running database migration for new features...")
    success = run_migration()
    if success:
        print("\n✅ Migration completed successfully!")
        print("You can now restart your server.")
    else:
        print("\n❌ Migration failed. Please check the error messages above.")
        sys.exit(1)

