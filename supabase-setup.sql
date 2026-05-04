-- =======================================================
-- 1. Create the 'students' profile table
-- =======================================================
CREATE TABLE public.students (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    hall_ticket TEXT NOT NULL UNIQUE,
    course TEXT NOT NULL,
    department TEXT NOT NULL,
    year TEXT NOT NULL,
    semester TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- =======================================================
-- 2. Enable Row Level Security (RLS)
-- =======================================================
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

-- =======================================================
-- 3. Create RLS Policies
-- =======================================================

-- Policy: Students can view their own profile
CREATE POLICY "Students can view own profile" 
    ON public.students 
    FOR SELECT 
    USING (auth.uid() = id);

-- Policy: Students can update their own profile
CREATE POLICY "Students can update own profile" 
    ON public.students 
    FOR UPDATE 
    USING (auth.uid() = id);

-- Policy: Allow inserts during registration trigger
CREATE POLICY "Allow system to create student profiles" 
    ON public.students 
    FOR INSERT 
    WITH CHECK (auth.uid() = id);

-- =======================================================
-- 4. Create an Auth Trigger to auto-create profiles
-- =======================================================
-- This function automatically creates a record in the 'students' table
-- whenever a new user signs up via Supabase Auth.
-- It pulls the custom data we sent in the options.data payload.

CREATE OR REPLACE FUNCTION public.handle_new_student_signup()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.students (
    id, 
    email, 
    full_name, 
    hall_ticket, 
    course, 
    department, 
    year, 
    semester
  )
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'hall_ticket',
    NEW.raw_user_meta_data->>'course',
    NEW.raw_user_meta_data->>'department',
    NEW.raw_user_meta_data->>'year',
    NEW.raw_user_meta_data->>'semester'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Bind the trigger to the auth.users table
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_student_signup();
