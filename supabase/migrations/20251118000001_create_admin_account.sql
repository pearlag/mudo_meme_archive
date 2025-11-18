-- Admin 계정 생성 및 권한 설정
-- 
-- 사용 방법:
-- 1. Supabase Dashboard > Authentication > Users에서 수동으로 사용자 생성
--    - Email: admin@admin.com
--    - Password: 1q2w3e4r!@
-- 2. 그 다음 이 SQL을 Supabase SQL Editor에서 실행
--
-- 또는 아래 함수를 사용하여 자동으로 처리할 수 있습니다.

-- Function to create admin user and set role
-- This function should be called after creating the user with email 'admin@admin.com' and password '1q2w3e4r!@'
CREATE OR REPLACE FUNCTION public.create_admin_user()
RETURNS void AS $$
DECLARE
  admin_user_id UUID;
BEGIN
  -- Find user with email 'admin@admin.com'
  SELECT id INTO admin_user_id
  FROM auth.users
  WHERE email = 'admin@admin.com'
  LIMIT 1;

  IF admin_user_id IS NULL THEN
    RAISE EXCEPTION 'Admin user not found. Please create the user first with email: admin@admin.com and password: 1q2w3e4r!@';
  END IF;

  -- Insert admin role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (admin_user_id, 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;

  -- Create or update profile with nickname
  INSERT INTO public.profiles (id, nickname)
  VALUES (admin_user_id, 'Admin')
  ON CONFLICT (id) DO UPDATE SET nickname = 'Admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Note: To use this function:
-- 1. First, create a user in Supabase Auth with email 'admin@admin.com' and password '1q2w3e4r!@'
-- 2. Then run: SELECT public.create_admin_user();

