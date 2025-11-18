"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";
import { User, Session } from "@supabase/supabase-js";
import { useState, useEffect } from "react";
import {
  Image as ImageIcon,
  Bookmark,
  Heart,
  Upload,
  LogOut,
  LogIn,
  Shield,
  Search,
  User as UserIcon,
  Menu,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";

interface DashboardLayoutProps {
  children: React.ReactNode;
  user: User | null;
  session: Session | null;
  onSignOut: () => void;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onUploadClick?: () => void;
  onMenuClick?: (menu: "library" | "saved" | "liked") => void;
  activeFilter?: "all" | "saved" | "liked";
}

export function DashboardLayout({
  children,
  user,
  session,
  onSignOut,
  searchQuery,
  onSearchChange,
  onUploadClick,
  onMenuClick,
  activeFilter = "all",
}: DashboardLayoutProps) {
  const router = useRouter();
  const { isAdmin } = useUserRole(user);
  const [nickname, setNickname] = useState<string | null>(null);
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Fetch user nickname
  useEffect(() => {
    const fetchNickname = async () => {
      if (!user) {
        setNickname(null);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("profiles" as any)
          .select("nickname")
          .eq("id", user.id)
          .maybeSingle();

        if (error && error.code !== "PGRST116" && error.code !== "42P01") {
          console.warn("닉네임 조회 실패:", error);
        } else if (data && (data as any).nickname) {
          setNickname((data as any).nickname);
        }
      } catch (error) {
        console.error("닉네임 조회 중 오류:", error);
      }
    };

    fetchNickname();
  }, [user]);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <Sidebar className="border-r">
          <SidebarHeader className="p-4">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10 cursor-pointer">
                <AvatarImage src={user?.user_metadata?.avatar_url} alt={user?.email || "User"} />
                <AvatarFallback>
                  {user?.email?.charAt(0).toUpperCase() || <UserIcon className="h-5 w-5" />}
                </AvatarFallback>
              </Avatar>
              {user && (
                <div className="flex-1 min-w-0">
                  {nickname ? (
                    <p className="text-sm font-medium truncate">{nickname}</p>
                  ) : (
                    <p className="text-sm font-medium truncate">{user.email}</p>
                  )}
                  <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                  {isAdmin && (
                    <Badge variant="default" className="mt-1 text-xs">
                      <Shield className="h-3 w-3 mr-1" />
                      관리자
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </SidebarHeader>

          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>MAIN</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      onClick={() => onMenuClick?.("library")}
                      isActive={activeFilter === "all"}
                      className={activeFilter === "all" ? "!bg-slate-200 dark:!bg-slate-800" : ""}
                    >
                      <ImageIcon className="h-4 w-4" />
                      <span>짤 라이브러리</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>

                  <SidebarMenuItem>
                    <SidebarMenuButton
                      onClick={() => {
                        onMenuClick?.("saved");
                        router.push("/saved");
                      }}
                      isActive={activeFilter === "saved"}
                      className={activeFilter === "saved" ? "!bg-slate-200 dark:!bg-slate-800" : ""}
                    >
                      <Bookmark className="h-4 w-4" />
                      <span>저장됨</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>

                  <SidebarMenuItem>
                    <SidebarMenuButton
                      onClick={() => {
                        onMenuClick?.("liked");
                        router.push("/liked");
                      }}
                      isActive={activeFilter === "liked"}
                      className={activeFilter === "liked" ? "!bg-slate-200 dark:!bg-slate-800" : ""}
                    >
                      <Heart className="h-4 w-4" />
                      <span>좋아요</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>

          <SidebarFooter className="p-4">
            {user ? (
              <div className="space-y-2">
                <Button 
                  onClick={onUploadClick || (() => router.push("/upload"))} 
                  className="w-full" 
                  size="sm"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  업로드
                </Button>
                <Button onClick={onSignOut} variant="outline" className="w-full" size="sm">
                  <LogOut className="h-4 w-4 mr-2" />
                  로그아웃
                </Button>
              </div>
            ) : (
              <Button onClick={() => router.push("/auth")} className="w-full" size="sm">
                <LogIn className="h-4 w-4 mr-2" />
                로그인
              </Button>
            )}
          </SidebarFooter>
        </Sidebar>

        <SidebarInset className="flex-1">
          <header className="sticky top-0 z-50 flex h-16 items-center gap-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-6 relative">
            <SidebarTrigger />
            <div className="flex-1 flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded bg-primary flex items-center justify-center">
                  <Image src="/favicon-32x32.png" alt="logo" width={32} height={32} />
                </div>
                <span className="font-semibold text-lg">무도짤아카이브</span>
              </div>
              <div className="flex-1 max-w-md">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={(e) => onSearchChange(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
            </div>
            {mounted && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="h-9 w-9 absolute right-6"
              >
                {theme === "dark" ? (
                  <Sun className="h-4 w-4" />
                ) : (
                  <Moon className="h-4 w-4" />
                )}
                <span className="sr-only">다크 모드 전환</span>
              </Button>
            )}
          </header>
          <main className="flex-1 p-6">{children}</main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}

