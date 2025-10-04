
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create chats table
CREATE TABLE IF NOT EXISTS chats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    messages JSONB DEFAULT '[]'::jsonb,
    last_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create reports table
CREATE TABLE IF NOT EXISTS reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    chat_id UUID REFERENCES chats(id) ON DELETE CASCADE,
    bias_detected BOOLEAN DEFAULT false,
    reasons TEXT[] DEFAULT ARRAY[]::TEXT[],
    fixes TEXT[] DEFAULT ARRAY[]::TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_chats_user_id ON chats(user_id);
CREATE INDEX idx_chats_updated_at ON chats(updated_at DESC);
CREATE INDEX idx_reports_user_id ON reports(user_id);
CREATE INDEX idx_reports_chat_id ON reports(chat_id);

-- Enable Row Level Security (RLS)
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- RLS Policies for chats
CREATE POLICY "Users can view their own chats"
    ON chats FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own chats"
    ON chats FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own chats"
    ON chats FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own chats"
    ON chats FOR DELETE
    USING (auth.uid() = user_id);

-- RLS Policies for reports
CREATE POLICY "Users can view their own reports"
    ON reports FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own reports"
    ON reports FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reports"
    ON reports FOR DELETE
    USING (auth.uid() = user_id);

-- Create storage bucket for uploads
INSERT INTO storage.buckets (id, name, public)
VALUES ('uploads', 'uploads', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Users can upload files"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'uploads' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own files"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'uploads' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own files"
    ON storage.objects FOR DELETE
    USING (bucket_id = 'uploads' AND auth.uid()::text = (storage.foldername(name))[1]);