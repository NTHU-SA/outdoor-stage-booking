-- Add is_hidden column to maintenance_requests table
ALTER TABLE maintenance_requests 
ADD COLUMN is_hidden BOOLEAN DEFAULT FALSE;

-- Update public view policy to exclude hidden records
DROP POLICY IF EXISTS "Anyone can view maintenance requests" ON maintenance_requests;

CREATE POLICY "Anyone can view visible maintenance requests"
ON maintenance_requests
FOR SELECT
TO public
USING (is_hidden = FALSE);

-- Ensure admins can see everything (including hidden)
CREATE POLICY "Admins can view all maintenance requests"
ON maintenance_requests
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
);

-- Users can still view their own requests even if hidden (optional, but good UX)
CREATE POLICY "Users can view own hidden maintenance requests"
ON maintenance_requests
FOR SELECT
TO authenticated
USING (
    user_id = auth.uid()
);

