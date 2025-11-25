-- Admin 계정 생성 및 권한 설정 (안전한 버전)
-- 
-- 이 스크립트는 RLS 정책을 우회하여 Admin 권한을 설정합니다.
-- 
-- ⚠️ 필수 사전 작업:
-- 1. 다음 마이그레이션들을 먼저 실행해야 합니다:
--    - 20251117020406_a7b53793-8780-4020-94e1-8014adefec83.sql (user_roles 테이블 생성)
--    - 20251118000000_add_profiles_table.sql (profiles 테이블 생성)
-- 2. Supabase Dashboard > Authentication > Users에서 사용자 생성:
--    - Email: admin@admin.com
--    - Password: 1q2w3e4r!@
--
-- 이 스크립트는 SECURITY DEFINER 함수를 사용하여 RLS를 우회합니다.

-- Admin 권한 설정 함수 (SECURITY DEFINER로 RLS 우회)
CREATE OR REPLACE FUNCTION public.setup_admin_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_user_id UUID;
BEGIN
  -- Email이 'admin@admin.com'인 사용자 찾기
  SELECT id INTO admin_user_id
  FROM auth.users
  WHERE email = 'admin@admin.com'
  LIMIT 1;

  IF admin_user_id IS NULL THEN
    RAISE EXCEPTION 'Admin 사용자를 찾을 수 없습니다. 먼저 Supabase Dashboard > Authentication > Users에서 사용자를 생성하세요: Email: admin@admin.com, Password: 1q2w3e4r!@';
  END IF;

  -- Admin 역할 추가
  INSERT INTO public.user_roles (user_id, role)
  VALUES (admin_user_id, 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;

  -- Profile 생성 또는 업데이트
  INSERT INTO public.profiles (id, nickname)
  VALUES (admin_user_id, 'Admin')
  ON CONFLICT (id) DO UPDATE SET nickname = 'Admin';

  RAISE NOTICE '✅ Admin 계정이 성공적으로 설정되었습니다!';
  RAISE NOTICE '   User ID: %', admin_user_id;
  RAISE NOTICE '   Email: admin@admin.com';
  RAISE NOTICE '   Role: admin';
  RAISE NOTICE '   Nickname: Admin';
END;
$$;

-- 함수 실행
SELECT public.setup_admin_account();

-- 함수 삭제 (선택사항 - 보안을 위해)
-- DROP FUNCTION IF EXISTS public.setup_admin_account();





