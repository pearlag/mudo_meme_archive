# Vercel 환경 변수 설정 가이드

## 문제
Supabase 인증이 작동하지 않는 경우, Vercel에 환경 변수가 설정되지 않았을 가능성이 높습니다.

## 해결 방법

### 1. Vercel 대시보드에서 환경 변수 설정

1. Vercel 프로젝트 페이지로 이동
2. **Settings** → **Environment Variables** 클릭
3. 다음 환경 변수를 추가:

```
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-supabase-anon-key
```

### 2. Supabase 프로젝트 정보 확인

1. Supabase 대시보드로 이동
2. **Settings** → **API** 메뉴 클릭
3. 다음 정보를 복사:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`에 입력
   - **anon public** 키 → `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`에 입력

### 3. 환경 변수 적용

환경 변수를 추가한 후:
1. **Save** 클릭
2. **Redeploy** 버튼을 클릭하여 프로젝트를 재배포

### 4. 확인

재배포 후 브라우저 콘솔에서 다음 메시지를 확인:
- ✅ `Supabase 클라이언트 초기화 완료` (성공)
- ❌ `Supabase 환경 변수가 설정되지 않았습니다!` (실패 - 환경 변수 확인 필요)

## 참고

- 환경 변수 이름은 정확히 `NEXT_PUBLIC_SUPABASE_URL`과 `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`여야 합니다.
- `NEXT_PUBLIC_` 접두사가 없으면 클라이언트에서 접근할 수 없습니다.
- 환경 변수를 변경한 후에는 반드시 재배포해야 합니다.

