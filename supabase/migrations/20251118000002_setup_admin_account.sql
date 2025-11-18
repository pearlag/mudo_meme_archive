-- Admin 계정 생성 및 권한 설정
-- 
-- 이 스크립트는 Supabase SQL Editor에서 실행하세요.
-- 
-- ⚠️ 필수 사전 작업:
-- 1. 다음 마이그레이션들을 먼저 실행해야 합니다:
--    - 20251117020406_a7b53793-8780-4020-94e1-8014adefec83.sql (user_roles 테이블 생성)
--    - 20251118000000_add_profiles_table.sql (profiles 테이블 생성)
-- 2. Supabase Dashboard > Authentication > Users에서 사용자 생성:
--    - Email: admin@admin.com
--    - Password: 1q2w3e4r!@
--
-- 그 다음 이 스크립트를 실행하면 Admin 권한이 자동으로 설정됩니다.

-- Admin 사용자 찾기 및 권한 설정
DO $$
DECLARE
  admin_user_id UUID;
  table_exists BOOLEAN;
BEGIN
  -- user_roles 테이블 존재 여부 확인
  SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'user_roles'
  ) INTO table_exists;

  IF NOT table_exists THEN
    RAISE EXCEPTION '❌ user_roles 테이블이 존재하지 않습니다. 먼저 다음 마이그레이션을 실행하세요: 20251117020406_a7b53793-8780-4020-94e1-8014adefec83.sql';
  END IF;

  -- profiles 테이블 존재 여부 확인
  SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles'
  ) INTO table_exists;

  IF NOT table_exists THEN
    RAISE EXCEPTION '❌ profiles 테이블이 존재하지 않습니다. 먼저 다음 마이그레이션을 실행하세요: 20251118000000_add_profiles_table.sql';
  END IF;

  -- Email이 'admin@admin.com'인 사용자 찾기
  SELECT id INTO admin_user_id
  FROM auth.users
  WHERE email = 'admin@admin.com'
  LIMIT 1;

  IF admin_user_id IS NULL THEN
    RAISE EXCEPTION '⚠️ Admin 사용자를 찾을 수 없습니다. 먼저 Supabase Dashboard > Authentication > Users에서 다음 정보로 사용자를 생성하세요: Email: admin@admin.com, Password: 1q2w3e4r!@';
  END IF;

  -- Admin 역할 추가 (RLS 정책 때문에 직접 INSERT가 실패할 수 있으므로 SECURITY DEFINER 함수 사용)
  -- 먼저 RLS를 일시적으로 비활성화하거나, service_role 키를 사용하거나, 
  -- 또는 수동으로 INSERT할 수 있도록 안내
  BEGIN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (admin_user_id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '⚠️ RLS 정책 때문에 직접 INSERT가 실패했습니다.';
    RAISE NOTICE '다음 SQL을 service_role 키로 실행하거나, RLS를 일시적으로 비활성화한 후 실행하세요:';
    RAISE NOTICE 'INSERT INTO public.user_roles (user_id, role) VALUES (''%'', ''admin'') ON CONFLICT (user_id, role) DO NOTHING;', admin_user_id;
    RAISE NOTICE '또는 다음 함수를 사용하세요: SELECT public.create_admin_user();';
    RETURN;
  END;

  -- Profile 생성 또는 업데이트
  INSERT INTO public.profiles (id, nickname)
  VALUES (admin_user_id, 'Admin')
  ON CONFLICT (id) DO UPDATE SET nickname = 'Admin';

  RAISE NOTICE '✅ Admin 계정이 성공적으로 설정되었습니다!';
  RAISE NOTICE '   User ID: %', admin_user_id;
  RAISE NOTICE '   Email: admin@admin.com';
  RAISE NOTICE '   Role: admin';
  RAISE NOTICE '   Nickname: Admin';
END $$;

-- Admin 권한 확인 쿼리 (선택사항)
-- SELECT 
--   u.email,
--   ur.role,
--   p.nickname
-- FROM auth.users u
-- LEFT JOIN public.user_roles ur ON u.id = ur.user_id
-- LEFT JOIN public.profiles p ON u.id = p.id
-- WHERE u.email = 'admin@admin.com';

