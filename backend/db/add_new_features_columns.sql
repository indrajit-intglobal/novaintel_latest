-- Migration: Add new feature columns to projects table and create new tables
-- Run this in your database SQL editor (Supabase, pgAdmin, psql, etc.)

-- ============================================
-- 1. Add new columns to projects table
-- ============================================

-- Go/No-Go Analysis columns
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS go_no_go_score FLOAT;

ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS go_no_go_report JSONB;

-- Battle Cards (Competitor Intelligence) column
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS battle_cards JSONB;

-- Audio Briefing columns
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS audio_briefing_url VARCHAR(500);

ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS audio_briefing_script TEXT;

-- ============================================
-- 2. Create icp_profiles table
-- ============================================

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
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_icp_profiles_company_id 
ON icp_profiles(company_id);

-- ============================================
-- 3. Create win_loss_data table
-- ============================================

-- Create enum type for deal outcome
DO $$ BEGIN
    CREATE TYPE dealoutcome AS ENUM ('won', 'lost', 'no_decision', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create win_loss_data table
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
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_win_loss_data_company_id 
ON win_loss_data(company_id);

CREATE INDEX IF NOT EXISTS idx_win_loss_data_outcome 
ON win_loss_data(outcome);

CREATE INDEX IF NOT EXISTS idx_win_loss_data_deal_date 
ON win_loss_data(deal_date);

-- ============================================
-- Migration Complete!
-- ============================================

-- Verify the changes:
-- SELECT column_name, data_type 
-- FROM information_schema.columns 
-- WHERE table_name = 'projects' 
-- AND column_name IN ('go_no_go_score', 'go_no_go_report', 'battle_cards', 'audio_briefing_url', 'audio_briefing_script');

-- SELECT table_name 
-- FROM information_schema.tables 
-- WHERE table_name IN ('icp_profiles', 'win_loss_data');

