-- Add is_approved to profiles table
ALTER TABLE profiles 
ADD COLUMN is_approved BOOLEAN DEFAULT FALSE;

-- Add email to profiles for easier admin management
ALTER TABLE profiles
ADD COLUMN email TEXT;

-- Update RLS to allow admins to see all profiles
CREATE POLICY "Admins can see all profiles" ON profiles
  FOR SELECT
  USING (
    auth.uid() IN (
      SELECT id FROM profiles WHERE role = 'admin'
    )
  );

-- Update RLS to allow admins to update profiles (for approval)
CREATE POLICY "Admins can update all profiles" ON profiles
  FOR UPDATE
  USING (
    auth.uid() IN (
      SELECT id FROM profiles WHERE role = 'admin'
    )
  );

