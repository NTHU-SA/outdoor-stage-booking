-- Fix infinite recursion in RLS policies by using a security definer function

-- 1. Create a secure function to check admin status without triggering RLS loop
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Drop problematic policies that caused recursion
DROP POLICY IF EXISTS "Admins can see all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;

-- 3. Re-create Update policy using the safe function
CREATE POLICY "Admins can update all profiles" ON profiles
  FOR UPDATE
  USING (is_admin());

-- Note: Select policy is already covered by "Public profiles are viewable by everyone" (using true)
-- from initial_schema.sql, so we don't need to re-add a select policy for admins.

