"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Image } from "lucide-react";
import { z } from "zod";

const signUpSchema = z.object({
  email: z.string().email({ message: "올바른 이메일 주소를 입력하세요" }).max(255),
  password: z.string().min(6, { message: "비밀번호는 최소 6자 이상이어야 합니다" }).max(100),
  nickname: z.string().min(2, { message: "닉네임은 최소 2자 이상이어야 합니다" }).max(20, { message: "닉네임은 최대 20자까지 가능합니다" }),
});

const signInSchema = z.object({
  email: z.string().email({ message: "올바른 이메일 주소를 입력하세요" }).max(255),
  password: z.string().min(6, { message: "비밀번호는 최소 6자 이상이어야 합니다" }).max(100),
});

export default function AuthPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nickname, setNickname] = useState("");
  const [showLoginDialog, setShowLoginDialog] = useState(false);
  const [signUpEmail, setSignUpEmail] = useState("");
  const [signUpPassword, setSignUpPassword] = useState("");

  useEffect(() => {
    // Check if user is already logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.push("/");
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        router.push("/");
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const validated = signUpSchema.parse({ email, password, nickname });
      setIsLoading(true);

      const redirectUrl = `${window.location.origin}/`;
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: validated.email,
        password: validated.password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            nickname: validated.nickname,
          },
        },
      });

      if (signUpError) {
        if (signUpError.message.includes("already registered")) {
          toast.error("이미 가입된 이메일입니다. 로그인을 시도하세요.");
        } else {
          toast.error(signUpError.message);
        }
        return;
      }

      if (signUpData.user) {
        // Create or update profile with nickname
        // 타입 정의에 profiles 테이블이 없을 수 있으므로 타입 단언 사용
        const { error: profileError } = await (supabase
          .from("profiles" as any)
          .upsert({
            id: signUpData.user.id,
            nickname: validated.nickname,
          } as any, {
            onConflict: "id",
          }));

        if (profileError) {
          // 에러 상세 정보 로깅 (안전한 방식)
          const errorInfo: Record<string, unknown> = {
            message: profileError.message || "알 수 없는 에러",
            details: profileError.details || null,
            hint: profileError.hint || null,
            code: profileError.code || null,
          };
          
          // Error 인스턴스인 경우 추가 정보
          if (profileError instanceof Error) {
            errorInfo.name = profileError.name;
            errorInfo.stack = profileError.stack;
          }
          
          // Supabase PostgrestError의 추가 속성들
          try {
            const errorAny = profileError as any;
            if (errorAny.status) errorInfo.status = errorAny.status;
            if (errorAny.statusCode) errorInfo.statusCode = errorAny.statusCode;
          } catch {
            // 무시
          }
          
          // JSON 직렬화 가능한 형태로 로깅
          console.error("Error creating profile:", {
            message: errorInfo.message,
            code: errorInfo.code,
            details: errorInfo.details,
            hint: errorInfo.hint,
            fullError: JSON.stringify(errorInfo, null, 2),
          });
          
          // 테이블이 없는 경우 (42P01) 또는 다른 에러
          const errorCode = errorInfo.code as string;
          if (errorCode === "42P01") {
            console.warn("Profiles 테이블이 없습니다. 마이그레이션을 실행해주세요.");
            toast.error("프로필 테이블이 없습니다. 관리자에게 문의하세요.");
          } else if (errorCode === "23505") {
            // Unique constraint violation - nickname 중복
            toast.error("이미 사용 중인 닉네임입니다.");
          } else {
            const errorMessage = (errorInfo.message as string) || "알 수 없는 오류";
            toast.error(`프로필 생성 중 오류가 발생했습니다: ${errorMessage}`);
          }
          
          // 프로필 생성 실패해도 회원가입은 완료된 상태이므로 계속 진행
          // (trigger가 자동으로 프로필을 생성할 수도 있음)
          console.log("회원가입은 완료되었지만 프로필 생성에 실패했습니다. 나중에 수정할 수 있습니다.");
        } else {
          console.log("✅ 프로필이 성공적으로 생성되었습니다.");
        }
      }

      toast.success("회원가입이 완료되었습니다!");
      setSignUpEmail(validated.email);
      setSignUpPassword(validated.password);
      setShowLoginDialog(true);
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else {
        toast.error("회원가입 중 오류가 발생했습니다");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      console.log("🔐 로그인 시도:", { email, passwordLength: password.length });
      
      const validated = signInSchema.parse({ email, password });
      setIsLoading(true);

      console.log("✅ 입력값 검증 완료:", { email: validated.email });

      const { data, error } = await supabase.auth.signInWithPassword({
        email: validated.email,
        password: validated.password,
      });

      console.log("📡 Supabase 응답:", { 
        hasData: !!data, 
        hasError: !!error,
        error: error ? {
          message: error.message,
          status: error.status,
          name: error.name,
          // 모든 속성 추출
          ...Object.fromEntries(
            Object.keys(error).map(key => [key, (error as any)[key]])
          )
        } : null
      });

      if (error) {
        // 에러 코드에 따른 처리
        const errorCode = (error as any).code || error.status;
        const errorMessage = error.message || "";
        
        // 개발 환경에서만 상세 로그 출력
        if (process.env.NODE_ENV === 'development') {
          console.error("❌ 로그인 에러:", {
            message: errorMessage,
            status: error.status,
            code: errorCode,
          });
        }
        
        if (errorCode === "email_not_confirmed" || errorMessage.includes("Email not confirmed")) {
          toast.error("이메일 인증이 필요합니다. 가입 시 받은 이메일의 인증 링크를 클릭해주세요.", {
            duration: 5000,
          });
        } else if (errorMessage.includes("Invalid login credentials") || errorMessage.toLowerCase().includes("invalid")) {
          toast.error("이메일 또는 비밀번호가 올바르지 않습니다. 다시 확인해주세요.");
        } else if (error.status === 400) {
          toast.error("로그인에 실패했습니다. 이메일과 비밀번호를 확인해주세요.");
        } else {
          toast.error("로그인 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
        }
        setIsLoading(false);
        return;
      }

      if (data?.user) {
        console.log("✅ 로그인 성공:", {
          userId: data.user.id,
          email: data.user.email,
        });
        toast.success("로그인되었습니다!");
        setShowLoginDialog(false);
        router.push("/");
      } else {
        console.warn("⚠️ 로그인 응답에 사용자 데이터가 없습니다:", data);
        toast.error("로그인에 실패했습니다. 다시 시도해주세요.");
      }
    } catch (error) {
      console.error("❌ 예상치 못한 로그인 에러:", error);
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else {
        const errorMessage = error instanceof Error ? error.message : "알 수 없는 오류";
        console.error("에러 상세:", {
          error,
          message: errorMessage,
          type: typeof error,
          constructor: error?.constructor?.name,
        });
        toast.error(`로그인 중 오류가 발생했습니다: ${errorMessage}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoginAfterSignUp = async () => {
    setShowLoginDialog(false);
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: signUpEmail,
        password: signUpPassword,
      });

      if (error) {
        // 에러 코드에 따른 처리
        const errorCode = (error as any).code || error.status;
        const errorMessage = error.message || "";
        
        // 개발 환경에서만 상세 로그 출력
        if (process.env.NODE_ENV === 'development') {
          console.error("❌ 자동 로그인 에러:", {
            message: errorMessage,
            status: error.status,
            code: errorCode,
          });
        }
        
        if (errorCode === "email_not_confirmed" || errorMessage.includes("Email not confirmed")) {
          toast.error("이메일 인증이 필요합니다. 가입 시 받은 이메일의 인증 링크를 클릭해주세요.", {
            duration: 5000,
          });
        } else if (errorMessage.includes("Invalid login credentials") || errorMessage.toLowerCase().includes("invalid")) {
          toast.error("이메일 또는 비밀번호가 올바르지 않습니다. 다시 확인해주세요.");
        } else if (error.status === 400) {
          toast.error("로그인에 실패했습니다. 이메일과 비밀번호를 확인해주세요.");
        } else {
          toast.error("로그인 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
        }
        setIsLoading(false);
        return;
      }

      if (data?.user) {
        console.log("✅ 자동 로그인 성공:", {
          userId: data.user.id,
          email: data.user.email,
        });
        toast.success("로그인되었습니다!");
        router.push("/");
      }
    } catch (error) {
      console.error("Unexpected auto-login error:", error);
      toast.error("로그인 중 오류가 발생했습니다");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className="min-h-screen flex items-center justify-center bg-gradient-warm p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-3 text-center">
            <div className="flex items-center justify-center gap-2">
              <div className="p-2 bg-gradient-hero rounded-lg">
                <Image className="h-6 w-6 text-primary-foreground" />
              </div>
              <CardTitle className="text-2xl bg-gradient-hero bg-clip-text text-transparent">
                무도짤아카이브
              </CardTitle>
            </div>
            <CardDescription>
              무한도전 짤을 공유하고 즐기세요
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="signin" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">로그인</TabsTrigger>
                <TabsTrigger value="signup">회원가입</TabsTrigger>
              </TabsList>
              
              <TabsContent value="signin">
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signin-email">이메일</Label>
                    <Input
                      id="signin-email"
                      type="email"
                      placeholder="your@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signin-password">비밀번호</Label>
                    <Input
                      id="signin-password"
                      type="password"
                      placeholder="••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? "로그인 중..." : "로그인"}
                  </Button>
                </form>
              </TabsContent>
              
              <TabsContent value="signup">
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">이메일</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="your@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-nickname">닉네임</Label>
                    <Input
                      id="signup-nickname"
                      type="text"
                      placeholder="닉네임을 입력하세요"
                      value={nickname}
                      onChange={(e) => setNickname(e.target.value)}
                      required
                      minLength={2}
                      maxLength={20}
                    />
                    <p className="text-xs text-muted-foreground">
                      2-20자 사이
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">비밀번호</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder="••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      최소 6자 이상
                    </p>
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? "가입 중..." : "회원가입"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={showLoginDialog} onOpenChange={setShowLoginDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>회원가입 완료</AlertDialogTitle>
            <AlertDialogDescription>
              회원가입이 완료되었습니다. 로그인하시겠습니까?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleLoginAfterSignUp}>
              확인
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

