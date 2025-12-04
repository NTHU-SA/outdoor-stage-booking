-- Fix: Ensure user_type_enum exists and trigger can find it
-- Run this in Supabase Dashboard SQL Editor

-- 1. 先檢查 enum 是否存在
DO $$
BEGIN
    -- 如果不存在，建立 enum（明確指定在 public schema）
    IF NOT EXISTS (
        SELECT 1 FROM pg_type t
        JOIN pg_namespace n ON n.oid = t.typnamespace
        WHERE t.typname = 'user_type_enum' AND n.nspname = 'public'
    ) THEN
        CREATE TYPE public.user_type_enum AS ENUM ('teacher', 'staff', 'assistant', 'student');
        RAISE NOTICE 'Created user_type_enum type';
    ELSE
        RAISE NOTICE 'user_type_enum type already exists';
    END IF;
END $$;

-- 2. 確保欄位存在
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'profiles' 
        AND column_name = 'user_type'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN user_type public.user_type_enum;
        RAISE NOTICE 'Added user_type column';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'profiles' 
        AND column_name = 'supervisor_name'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN supervisor_name TEXT;
        RAISE NOTICE 'Added supervisor_name column';
    END IF;
END $$;

-- 3. 重新建立 trigger 函數（明確使用 public.user_type_enum）
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_full_name TEXT;
  v_phone TEXT;
  v_user_type TEXT;
  v_supervisor_name TEXT;
  v_department_id INT;
  v_user_type_enum public.user_type_enum;  -- 明確指定 schema
BEGIN
  -- 安全地提取所有 metadata 值
  v_full_name := NULLIF(TRIM(COALESCE(new.raw_user_meta_data->>'full_name', '')), '');
  v_phone := NULLIF(TRIM(COALESCE(new.raw_user_meta_data->>'phone', '')), '');
  v_user_type := NULLIF(TRIM(COALESCE(new.raw_user_meta_data->>'user_type', '')), '');
  v_supervisor_name := NULLIF(TRIM(COALESCE(new.raw_user_meta_data->>'supervisor_name', '')), '');
  v_department_id := NULL;

  -- 嘗試從 metadata 解析 department_id（數字）
  IF COALESCE(TRIM(new.raw_user_meta_data->>'department_id'), '') <> '' THEN
    BEGIN
      v_department_id := (new.raw_user_meta_data->>'department_id')::INT;
    EXCEPTION
      WHEN OTHERS THEN
        v_department_id := NULL;
        RAISE WARNING 'Failed to convert department_id % to int: %',
          new.raw_user_meta_data->>'department_id', SQLERRM;
    END;
  END IF;
  
  -- 安全地轉換 user_type 為 enum（明確使用 public schema）
  v_user_type_enum := NULL;
  IF v_user_type IS NOT NULL THEN
    BEGIN
      IF v_user_type = 'teacher' THEN
        v_user_type_enum := 'teacher'::public.user_type_enum;
      ELSIF v_user_type = 'staff' THEN
        v_user_type_enum := 'staff'::public.user_type_enum;
      ELSIF v_user_type = 'assistant' THEN
        v_user_type_enum := 'assistant'::public.user_type_enum;
      ELSIF v_user_type = 'student' THEN
        v_user_type_enum := 'student'::public.user_type_enum;
      END IF;
    EXCEPTION
      WHEN OTHERS THEN
        v_user_type_enum := NULL;
        RAISE WARNING 'Failed to convert user_type % to enum: %', v_user_type, SQLERRM;
    END;
  END IF;
  
  -- 插入 profile
  BEGIN
    INSERT INTO public.profiles (
      id, 
      full_name, 
      role,
      user_type,
      supervisor_name,
      phone,
      department_id,
      updated_at
    )
    VALUES (
      new.id, 
      v_full_name,
      'user',
      v_user_type_enum,
      v_supervisor_name,
      v_phone,
      v_department_id,
      NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
      full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
      user_type = COALESCE(EXCLUDED.user_type, profiles.user_type),
      supervisor_name = COALESCE(EXCLUDED.supervisor_name, profiles.supervisor_name),
      phone = COALESCE(EXCLUDED.phone, profiles.phone),
      department_id = COALESCE(EXCLUDED.department_id, profiles.department_id),
      updated_at = NOW();
  EXCEPTION
    WHEN OTHERS THEN
      -- 如果插入失敗，記錄警告但繼續（不讓使用者註冊失敗）
      RAISE WARNING 'Failed to create/update profile for user %: % (SQLSTATE: %)', 
        new.id, SQLERRM, SQLSTATE;
  END;
  
  RETURN new;
END;
$$;

-- 4. 重新建立 trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 5. 驗證所有物件
SELECT 
    'Enum Type' as check_type,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_type t
            JOIN pg_namespace n ON n.oid = t.typnamespace
            WHERE t.typname = 'user_type_enum' AND n.nspname = 'public'
        ) THEN '✓ EXISTS'
        ELSE '✗ MISSING'
    END as status
UNION ALL
SELECT 
    'Function' as check_type,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.routines
            WHERE routine_schema = 'public' AND routine_name = 'handle_new_user'
        ) THEN '✓ EXISTS'
        ELSE '✗ MISSING'
    END as status
UNION ALL
SELECT 
    'Trigger' as check_type,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.triggers
            WHERE trigger_schema = 'auth' AND trigger_name = 'on_auth_user_created'
        ) THEN '✓ EXISTS'
        ELSE '✗ MISSING'
    END as status
UNION ALL
SELECT 
    'Column: user_type' as check_type,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'user_type'
        ) THEN '✓ EXISTS'
        ELSE '✗ MISSING'
    END as status
UNION ALL
SELECT 
    'Column: supervisor_name' as check_type,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'supervisor_name'
        ) THEN '✓ EXISTS'
        ELSE '✗ MISSING'
    END as status;

