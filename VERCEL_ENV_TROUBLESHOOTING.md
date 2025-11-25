# Vercel 환경 변수 문제 해결 가이드

## 문제: 환경 변수를 설정했는데도 여전히 오류가 발생하는 경우

### 1. 재배포 확인
환경 변수를 추가한 후 **반드시 재배포**해야 합니다:
1. Vercel 대시보드 → 프로젝트 선택
2. **Deployments** 탭 클릭
3. 최신 배포의 **⋯** 메뉴 → **Redeploy** 클릭
4. 또는 **Settings** → **Environment Variables**에서 환경 변수 추가 후 **Save** → 자동으로 재배포 시작

### 2. 환경 변수 이름 확인
정확한 이름을 사용해야 합니다:
- ✅ `NEXT_PUBLIC_SUPABASE_URL`
- ✅ `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- ❌ `SUPABASE_URL` (NEXT_PUBLIC_ 접두사 없음)
- ❌ `NEXT_PUBLIC_SUPABASE_ANON_KEY` (잘못된 이름)

### 3. 환경 변수 값 확인
- **NEXT_PUBLIC_SUPABASE_URL**: `https://xxxxx.supabase.co` 형식
- **NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` 형식 (JWT 토큰)

### 4. 환경 설정 확인
Vercel에서 환경 변수를 추가할 때 다음 환경을 모두 선택했는지 확인:
- ✅ Production
- ✅ Preview
- ✅ Development

### 5. 빌드 로그 확인
Vercel 배포 로그에서 환경 변수가 제대로 주입되었는지 확인:
1. Vercel 대시보드 → **Deployments** → 최신 배포 클릭
2. **Build Logs** 확인
3. 환경 변수가 빌드에 포함되었는지 확인

### 6. 브라우저 콘솔 확인
브라우저 개발자 도구 콘솔에서 다음 로그를 확인:
```
🔍 환경 변수 확인: {
  hasUrl: true/false,
  hasKey: true/false,
  ...
}
```

### 7. 캐시 문제
브라우저 캐시를 지우고 다시 시도:
- Chrome: Ctrl+Shift+Delete → 캐시된 이미지 및 파일 삭제
- 또는 시크릿 모드에서 테스트

### 8. Vercel CLI로 확인 (선택사항)
로컬에서 Vercel CLI를 사용하여 환경 변수 확인:
```bash
vercel env ls
```

## 빠른 체크리스트

- [ ] 환경 변수 이름이 정확한가? (`NEXT_PUBLIC_` 접두사 포함)
- [ ] 환경 변수 값이 올바른가? (Supabase 대시보드에서 복사)
- [ ] 모든 환경(Production, Preview, Development)에 설정했는가?
- [ ] 환경 변수 추가 후 **재배포**를 했는가?
- [ ] 브라우저 캐시를 지웠는가?

## 여전히 문제가 있다면

1. Vercel 대시보드에서 환경 변수가 실제로 설정되어 있는지 확인
2. Supabase 프로젝트가 활성화되어 있는지 확인
3. Supabase API 키가 만료되지 않았는지 확인
4. Vercel 지원팀에 문의

