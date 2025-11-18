# Admin 계정 설정 가이드

이 문서는 Admin 계정을 생성하고 권한을 설정하는 방법을 설명합니다.

## Admin 계정 정보

- **Email**: `admin@admin.com`
- **Password**: `1q2w3e4r!@`
- **Role**: `admin`
- **Nickname**: `Admin`

## Admin 권한

Admin 계정은 다음 권한을 가집니다:
- ✅ 모든 meme 삭제 가능
- ✅ 모든 meme 수정 가능
- ✅ 모든 meme 조회 가능

## 설정 방법

### 1단계: Supabase에서 사용자 생성

1. Supabase Dashboard에 로그인
2. **Authentication** > **Users** 메뉴로 이동
3. **Add user** 버튼 클릭
4. 다음 정보 입력:
   - **Email**: `admin@admin.com` (⚠️ @를 포함한 유효한 이메일 형식 필수)
   - **Password**: `1q2w3e4r!@`
   - **Auto Confirm User**: 체크 (선택사항)
5. **Create user** 버튼 클릭

### 2단계: 필수 마이그레이션 실행

Admin 계정을 설정하기 전에 다음 마이그레이션들을 먼저 실행해야 합니다:

1. **user_roles 테이블 생성**:
   - `supabase/migrations/20251117020406_a7b53793-8780-4020-94e1-8014adefec83.sql` 파일 내용을 SQL Editor에서 실행

2. **profiles 테이블 생성**:
   - `supabase/migrations/20251118000000_add_profiles_table.sql` 파일 내용을 SQL Editor에서 실행

### 3단계: Admin 권한 설정

1. Supabase Dashboard에서 **SQL Editor** 메뉴로 이동
2. 다음 SQL 스크립트 중 하나를 실행:

**방법 1: 안전한 버전 (권장)**:
```sql
-- supabase/migrations/20251118000003_setup_admin_account_safe.sql 파일 내용 실행
```

**방법 2: 기본 버전**:

```sql
-- Admin 계정 생성 및 권한 설정
DO $$
DECLARE
  admin_user_id UUID;
BEGIN
  -- Email이 'admin@admin.com'인 사용자 찾기
  SELECT id INTO admin_user_id
  FROM auth.users
  WHERE email = 'admin@admin.com'
  LIMIT 1;

  IF admin_user_id IS NULL THEN
    RAISE NOTICE '⚠️ Admin 사용자를 찾을 수 없습니다.';
    RAISE NOTICE '먼저 Supabase Dashboard > Authentication > Users에서 사용자를 생성하세요.';
    RETURN;
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
END $$;
```

또는 `supabase/migrations/20251118000002_setup_admin_account.sql` 파일의 내용을 복사하여 실행하세요.

### 3단계: Admin 권한 확인

SQL Editor에서 다음 쿼리를 실행하여 Admin 권한이 제대로 설정되었는지 확인:

```sql
SELECT 
  u.email,
  ur.role,
  p.nickname
FROM auth.users u
LEFT JOIN public.user_roles ur ON u.id = ur.user_id
LEFT JOIN public.profiles p ON u.id = p.id
WHERE u.email = 'admin@admin.com';
```

예상 결과:
```
email              | role  | nickname
-------------------|-------|----------
admin@admin.com    | admin | Admin
```

## 로그인 테스트

1. 애플리케이션에서 로그아웃 (이미 로그인되어 있다면)
2. 로그인 페이지로 이동
3. 다음 정보로 로그인:
   - **Email**: `admin@admin.com`
   - **Password**: `1q2w3e4r!@`
4. 로그인 후 모든 meme에 수정/삭제 버튼이 표시되는지 확인

## 개발 환경에서 디버깅

개발 환경에서는 브라우저 콘솔에서 다음 정보를 확인할 수 있습니다:

- **User role loaded**: 사용자 역할이 로드될 때
- **Edit permission check**: 수정 권한 확인 시
- **Delete permission check**: 삭제 권한 확인 시

콘솔에서 `isAdmin: true`가 표시되면 Admin 권한이 정상적으로 작동하는 것입니다.

## 문제 해결

### Admin 권한이 작동하지 않는 경우

1. **user_roles 테이블 확인**:
   ```sql
   SELECT * FROM public.user_roles WHERE role = 'admin';
   ```

2. **RLS 정책 확인**:
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'user_roles';
   ```

3. **has_role 함수 확인**:
   ```sql
   SELECT public.has_role(
     (SELECT id FROM auth.users WHERE email = 'admin@admin.com'),
     'admin'
   );
   ```

4. **브라우저 콘솔 확인**:
   - 개발자 도구 > Console 탭
   - "User role loaded" 로그 확인
   - `isAdmin` 값이 `true`인지 확인

### 마이그레이션 실행 확인

다음 마이그레이션들이 실행되었는지 확인하세요:

1. `20251117020406_a7b53793-8780-4020-94e1-8014adefec83.sql` - user_roles 테이블 생성
2. `20251118000000_add_profiles_table.sql` - profiles 테이블 생성
3. `20251118000002_setup_admin_account.sql` - Admin 계정 설정

## 보안 주의사항

⚠️ **프로덕션 환경에서는 반드시 비밀번호를 변경하세요!**

현재 Admin 비밀번호는 `1q2w3e4r!@`로 설정되어 있습니다. 프로덕션 환경에서는 더 강력한 비밀번호로 변경하는 것을 권장합니다.

