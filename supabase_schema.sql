-- 1. Create a Public Profile table linked to Supabase Auth users
CREATE TABLE public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    clearance_level TEXT NOT NULL DEFAULT 'Level 4',
    region TEXT NOT NULL DEFAULT 'IN-SOUTH',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security (RLS) for users
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow users to read profiles" ON public.users FOR SELECT USING (true);
CREATE POLICY "Allow users to update own profile" ON public.users FOR UPDATE USING (auth.uid() = id);

-- 2. Create Uploads Table
CREATE TABLE public.uploads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    filename TEXT NOT NULL,
    uploaded_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    record_count INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'COMPLETED',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.uploads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow read uploads"   ON public.uploads FOR SELECT USING (true);
CREATE POLICY "Allow insert uploads" ON public.uploads FOR INSERT WITH CHECK (true);

-- Grant table-level permissions
GRANT SELECT, INSERT ON public.uploads TO anon;
GRANT SELECT, INSERT ON public.uploads TO authenticated;
GRANT ALL             ON public.uploads TO service_role;

-- 3. Create Predictions Table (Case Data)
CREATE TABLE public.predictions (
    id TEXT PRIMARY KEY, -- e.g., 'GOV-9000'
    upload_id UUID REFERENCES public.uploads(id) ON DELETE CASCADE,
    beneficiary_id TEXT NOT NULL,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    state TEXT NOT NULL,
    scheme TEXT NOT NULL,
    claims_per_month INTEGER NOT NULL,
    amount NUMERIC NOT NULL,
    location_cluster INTEGER NOT NULL,
    account_age_days INTEGER NOT NULL,
    risk_score NUMERIC NOT NULL,
    severity TEXT NOT NULL CHECK (severity IN ('MEDIUM', 'HIGH', 'CRITICAL')),
    status TEXT NOT NULL CHECK (status IN ('OPEN', 'ESCALATED', 'RESOLVED')) DEFAULT 'OPEN',
    assigned_to TEXT NOT NULL DEFAULT 'Unassigned',
    officer_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    escalated_at TIMESTAMP WITH TIME ZONE,
    resolved_at TIMESTAMP WITH TIME ZONE,
    model_used TEXT DEFAULT 'xgboost',
    execution_mode TEXT DEFAULT 'CPU'
);

ALTER TABLE public.predictions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow read predictions" ON public.predictions FOR SELECT USING (true);
CREATE POLICY "Allow insert/update predictions" ON public.predictions FOR ALL USING (true);

-- 4. Create Audit Logs Table
CREATE TABLE public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id TEXT REFERENCES public.predictions(id) ON DELETE CASCADE,
    action TEXT NOT NULL, -- 'ESCALATED', 'RESOLVED', 'NOTE_ADDED'
    agent_email TEXT NOT NULL,
    detail TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow read audit_logs" ON public.audit_logs FOR SELECT USING (true);
CREATE POLICY "Allow insert audit_logs" ON public.audit_logs FOR INSERT WITH CHECK (true);

-- 5. Trigger to automatically create a profile in public.users when a new user signs up in auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, email, name, clearance_level, region)
    VALUES (
        new.id,
        new.email,
        COALESCE(new.raw_user_meta_data->>'name', 'Agent ' || substr(new.id::text, 1, 6)),
        'Level 4',
        'IN-SOUTH'
    );
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
