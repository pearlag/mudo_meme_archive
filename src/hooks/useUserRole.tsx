import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";

export type UserRole = "admin" | "moderator" | "user" | null;

export const useUserRole = (user: User | null) => {
  const [role, setRole] = useState<UserRole>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchUserRole = async () => {
      if (!user) {
        setRole(null);
        setIsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .maybeSingle();

        if (error) {
          // 에러 상세 정보 로깅 (안전한 방식)
          const errorInfo: Record<string, unknown> = {};
          try {
            errorInfo.message = error.message;
            errorInfo.details = error.details;
            errorInfo.hint = error.hint;
            errorInfo.code = error.code;
            
            // 에러 객체의 모든 속성 추출
            if (error instanceof Error) {
              errorInfo.name = error.name;
              errorInfo.stack = error.stack;
            }
            
            // 추가 속성들
            Object.keys(error).forEach(key => {
              if (!errorInfo[key]) {
                try {
                  errorInfo[key] = (error as any)[key];
                } catch {
                  // 접근 불가능한 속성은 무시
                }
              }
            });
          } catch (e) {
            console.error("Error parsing error object:", e);
            errorInfo.rawError = String(error);
          }
          
          console.error("Error fetching user role:", errorInfo);
          
          // PGRST116은 "0 rows returned" 에러 (데이터가 없음) - 정상적인 경우
          const errorCode = errorInfo.code as string;
          if (errorCode === "PGRST116") {
            // 사용자 역할이 없는 경우 기본값 "user"로 설정
            setRole("user");
          } else {
            // 다른 에러인 경우에도 기본값으로 설정
            setRole("user");
          }
        } else if (data) {
          // 데이터가 있는 경우
          const userRole = data.role as UserRole || "user";
          setRole(userRole);
          
          // Admin 권한 확인 로깅 (개발 환경)
          if (process.env.NODE_ENV === 'development') {
            console.log("User role loaded:", {
              userId: user.id,
              email: user.email,
              role: userRole,
              isAdmin: userRole === "admin"
            });
          }
        } else {
          // 데이터가 없는 경우 (maybeSingle은 null 반환 가능)
          setRole("user");
          
          // 개발 환경에서 로깅
          if (process.env.NODE_ENV === 'development') {
            console.log("No role found for user, defaulting to 'user':", {
              userId: user.id,
              email: user.email
            });
          }
        }
      } catch (error) {
        console.error("Unexpected error fetching user role:", {
          error,
          message: error instanceof Error ? error.message : "알 수 없는 오류",
          stack: error instanceof Error ? error.stack : undefined,
        });
        setRole("user");
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserRole();
  }, [user]);

  return { role, isLoading, isAdmin: role === "admin" };
};
