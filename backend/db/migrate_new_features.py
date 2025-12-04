"""
Migration script to add new feature columns and tables.
Adds Go/No-Go, Battle Cards, Audio Briefing columns to projects table.
Creates icp_profiles and win_loss_data tables.
"""
from sqlalchemy import text
from db.database import engine
import sys

def migrate_projects_table():
    """Add new columns to projects table."""
    print("Migrating projects table...")
    
    columns_to_add = [
        ("go_no_go_score", "FLOAT", "NULL"),
        ("go_no_go_report", "JSONB", "NULL"),
        ("battle_cards", "JSONB", "NULL"),
        ("audio_briefing_url", "VARCHAR(500)", "NULL"),
        ("audio_briefing_script", "TEXT", "NULL"),
    ]
    
    with engine.connect() as conn:
        for column_name, column_type, nullable in columns_to_add:
            try:
                # Check if column exists
                check_query = text(f"""
                    SELECT column_name 
                    FROM information_schema.columns 
                    WHERE table_name='projects' AND column_name='{column_name}'
                """)
                result = conn.execute(check_query)
                if result.fetchone():
                    print(f"  [OK] Column '{column_name}' already exists, skipping...")
                    continue
                
                # Add column
                alter_query = text(f"""
                    ALTER TABLE projects 
                    ADD COLUMN {column_name} {column_type} {nullable}
                """)
                conn.execute(alter_query)
                conn.commit()
                print(f"  [OK] Added column: {column_name}")
            except Exception as e:
                print(f"  ⚠ Error adding column '{column_name}': {e}")
                conn.rollback()
    
    print("[OK] Projects table migration complete\n")

def migrate_proposals_table():
    """Add new columns to proposals table."""
    print("Migrating proposals table...")
    
    columns_to_add = [
        ("outline_approved", "BOOLEAN", "NULL"),
        ("outline_approval_timestamp", "TIMESTAMP WITH TIME ZONE", "NULL"),
        ("critic_scores", "JSONB", "NULL"),
    ]
    
    with engine.connect() as conn:
        for column_name, column_type, nullable in columns_to_add:
            try:
                # Check if column exists
                check_query = text(f"""
                    SELECT column_name 
                    FROM information_schema.columns 
                    WHERE table_name='proposals' AND column_name='{column_name}'
                """)
                result = conn.execute(check_query)
                if result.fetchone():
                    print(f"  [OK] Column '{column_name}' already exists, skipping...")
                    continue
                
                # Add column
                alter_query = text(f"""
                    ALTER TABLE proposals 
                    ADD COLUMN {column_name} {column_type} {nullable}
                """)
                conn.execute(alter_query)
                conn.commit()
                print(f"  [OK] Added column: {column_name}")
            except Exception as e:
                print(f"  ⚠ Error adding column '{column_name}': {e}")
                conn.rollback()
    
    print("[OK] Proposals table migration complete\n")

def migrate_icp_profiles_table():
    """Create icp_profiles table if it doesn't exist."""
    print("Creating icp_profiles table...")
    
    with engine.connect() as conn:
        try:
            # Check if table exists
            check_query = text("""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_name='icp_profiles'
            """)
            result = conn.execute(check_query)
            table_exists = bool(result.fetchone())

            if not table_exists:
                # Create table with the base columns (without worrying about drift)
                create_query = text("""
                    CREATE TABLE IF NOT EXISTS icp_profiles (
                        id SERIAL PRIMARY KEY,
                        company_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                        name VARCHAR(255) NOT NULL,
                        industry VARCHAR(255),
                        company_size_min INTEGER,
                        company_size_max INTEGER,
                        tech_stack JSONB,
                        budget_range_min INTEGER,
                        budget_range_max INTEGER,
                        geographic_regions JSONB,
                        additional_criteria JSONB,
                        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                    )
                """)
                conn.execute(create_query)
                conn.commit()
                print("  [OK] Created table: icp_profiles")
            else:
                print("  [OK] Table 'icp_profiles' already exists")

            # Ensure last_analyzed_at column exists to match SQLAlchemy model
            add_column_query = text("""
                DO $$ 
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1 FROM information_schema.columns 
                        WHERE table_name = 'icp_profiles' AND column_name = 'last_analyzed_at'
                    ) THEN
                        ALTER TABLE icp_profiles 
                        ADD COLUMN last_analyzed_at TIMESTAMP WITH TIME ZONE NULL;
                    END IF;
                END $$;
            """)
            conn.execute(add_column_query)
            conn.commit()
            print("  [OK] Ensured column 'last_analyzed_at' exists on icp_profiles")

            # Create index (idempotent)
            index_query = text("""
                CREATE INDEX IF NOT EXISTS idx_icp_profiles_company_id 
                ON icp_profiles(company_id)
            """)
            conn.execute(index_query)
            conn.commit()
            
        except Exception as e:
            print(f"  ⚠ Error creating or updating icp_profiles table: {e}")
            conn.rollback()
    
    print("[OK] ICP profiles table migration complete\n")

def migrate_win_loss_data_table():
    """Create win_loss_data table if it doesn't exist."""
    print("Creating win_loss_data table...")
    
    with engine.connect() as conn:
        try:
            # Check if table exists
            check_query = text("""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_name='win_loss_data'
            """)
            result = conn.execute(check_query)
            table_exists = bool(result.fetchone())

            # Create enum type if it doesn't exist
            enum_query = text("""
                DO $$ BEGIN
                    CREATE TYPE dealoutcome AS ENUM ('won', 'lost', 'no_decision', 'cancelled');
                EXCEPTION
                    WHEN duplicate_object THEN null;
                END $$;
            """)
            conn.execute(enum_query)
            conn.commit()
            
            if not table_exists:
                # Create table with base columns
                create_query = text("""
                    CREATE TABLE IF NOT EXISTS win_loss_data (
                        id SERIAL PRIMARY KEY,
                        company_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                        deal_id VARCHAR(255),
                        client_name VARCHAR(255) NOT NULL,
                        industry VARCHAR(255),
                        region VARCHAR(255),
                        competitor VARCHAR(255),
                        competitors JSONB,
                        outcome dealoutcome NOT NULL,
                        deal_size FLOAT,
                        deal_date TIMESTAMP WITH TIME ZONE,
                        win_reasons TEXT,
                        loss_reasons TEXT,
                        rfp_characteristics JSONB,
                        auto_generated BOOLEAN DEFAULT FALSE,
                        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                    )
                """)
                conn.execute(create_query)
                conn.commit()
                print("  [OK] Created table: win_loss_data")
            else:
                print("  [OK] Table 'win_loss_data' already exists")

                # Ensure auto_generated column exists to match SQLAlchemy model
                add_column_query = text("""
                    DO $$ 
                    BEGIN
                        IF NOT EXISTS (
                            SELECT 1 FROM information_schema.columns 
                            WHERE table_name = 'win_loss_data' AND column_name = 'auto_generated'
                        ) THEN
                            ALTER TABLE win_loss_data 
                            ADD COLUMN auto_generated BOOLEAN DEFAULT FALSE;
                        END IF;
                    END $$;
                """)
                conn.execute(add_column_query)
                conn.commit()
                print("  [OK] Ensured column 'auto_generated' exists on win_loss_data")
            
            # Create indexes
            indexes = [
                ("idx_win_loss_data_company_id", "company_id"),
                ("idx_win_loss_data_outcome", "outcome"),
                ("idx_win_loss_data_deal_date", "deal_date"),
            ]
            
            for index_name, column_name in indexes:
                try:
                    index_query = text(f"""
                        CREATE INDEX IF NOT EXISTS {index_name} 
                        ON win_loss_data({column_name})
                    """)
                    conn.execute(index_query)
                    conn.commit()
                except Exception as e:
                    print(f"  ⚠ Error creating index {index_name}: {e}")
            
        except Exception as e:
            print(f"  ⚠ Error creating or updating win_loss_data table: {e}")
            conn.rollback()
    
    print("[OK] Win/Loss data table migration complete\n")

def run_migration():
    """Run all migrations."""
    import sys
    import io
    # Fix Windows encoding issues
    if sys.platform == 'win32':
        try:
            sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
            sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')
        except:
            pass  # If already wrapped or not available, continue
    
    print("[INFO] Starting database migration for new features...")
    
    try:
        migrate_projects_table()
        migrate_proposals_table()
        migrate_icp_profiles_table()
        migrate_win_loss_data_table()
        
        print("=" * 60)
        print("All migrations completed successfully!")
        print("=" * 60)
        return True
    except Exception as e:
        print("=" * 60)
        print(f"Migration failed: {e}")
        print("=" * 60)
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = run_migration()
    sys.exit(0 if success else 1)

