"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";
import { Meme, Category } from "@/types/meme";
import { mockMemes } from "@/data/mockMemes";
import { DashboardLayout } from "@/components/DashboardLayout";
import { CategoryFilter } from "@/components/CategoryFilter";
import { MemeCard } from "@/components/MemeCard";
import { MemeModal } from "@/components/MemeModal";
import MagicBento from "@/components/MagicBento";
import { UploadMemeDialog } from "@/components/UploadMemeDialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { useUserRole } from "@/hooks/useUserRole";
import Link from "next/link";

export default function HomePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [memes, setMemes] = useState<Meme[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<Category>("전체");
  const [selectedMeme, setSelectedMeme] = useState<Meme | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<"all" | "saved" | "liked">("all");
  const { isAdmin, role } = useUserRole(user);

  // Auth state management
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Fetch memes from database
  const fetchMemes = async () => {
    setIsLoading(true);
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
      
      if (!supabaseUrl || !supabaseKey) {
        console.warn("Supabase 환경 변수가 설정되지 않았습니다. Mock 데이터를 사용합니다.");
        console.warn("설정된 URL:", supabaseUrl ? "있음" : "없음");
        console.warn("설정된 KEY:", supabaseKey ? "있음" : "없음");
        
        // 삭제된 Mock 데이터 ID 목록 가져오기
        const deletedMockIds = typeof window !== 'undefined' 
          ? JSON.parse(localStorage.getItem('deletedMockMemeIds') || '[]') as string[]
          : [];
        const availableMockMemes = mockMemes.filter(mock => !deletedMockIds.includes(mock.id));
        
        setMemes(availableMockMemes);
        setIsLoading(false);
        return;
      }

      // 먼저 memes를 가져오고, 그 다음 profiles를 조회
      const { data: memesData, error: memesError } = await supabase
        .from("memes")
        .select("*")
        .order("created_at", { ascending: false });

      if (memesError) {
        console.error("Error fetching memes:", {
          message: memesError.message,
          details: memesError.details,
          hint: memesError.hint,
          code: memesError.code,
        });
        toast.error(`데이터 로드 실패: ${memesError.message || "알 수 없는 오류"}`);
        
        // 삭제된 Mock 데이터 ID 목록 가져오기
        const deletedMockIds = typeof window !== 'undefined' 
          ? JSON.parse(localStorage.getItem('deletedMockMemeIds') || '[]') as string[]
          : [];
        const availableMockMemes = mockMemes.filter(mock => !deletedMockIds.includes(mock.id));
        
        setMemes(availableMockMemes);
        setIsLoading(false);
        return;
      }

      // 각 meme의 user_id로 profiles 조회
      const userIds = [...new Set(memesData?.map((m: any) => m.user_id) || [])];
      let profilesMap = new Map<string, string>();
      
      if (userIds.length > 0) {
        const { data: profilesData, error: profilesError } = await supabase
          .from("profiles" as any)
          .select("id, nickname")
          .in("id", userIds);

        if (profilesError) {
          // 에러 상세 정보 로깅
          console.error("Error fetching profiles:", {
            message: profilesError.message,
            details: profilesError.details,
            hint: profilesError.hint,
            code: profilesError.code,
            fullError: JSON.stringify(profilesError, null, 2)
          });
          
          // PGRST116은 "0 rows returned" 에러 (데이터가 없음) - 정상적인 경우
          if (profilesError.code === "PGRST116" || profilesError.code === "42P01") {
            // 테이블이 없거나 데이터가 없는 경우 - 정상적으로 처리
            console.log("Profiles 테이블이 없거나 데이터가 없습니다. nickname 없이 표시합니다.");
          } else {
            // 다른 에러인 경우에도 memes는 표시
            console.warn("Profiles 조회 실패했지만 memes는 표시합니다.");
          }
        } else if (profilesData) {
          // profiles를 맵으로 변환하여 빠른 조회
          profilesMap = new Map(
            profilesData.map((p: any) => [p.id, p.nickname])
          );
        }
      }

      // 삭제된 Mock 데이터 ID 목록 가져오기 (localStorage)
      const deletedMockIds = typeof window !== 'undefined' 
        ? JSON.parse(localStorage.getItem('deletedMockMemeIds') || '[]') as string[]
        : [];

      // 삭제되지 않은 Mock 데이터만 필터링
      const availableMockMemes = mockMemes.filter(mock => !deletedMockIds.includes(mock.id));

      if (memesData && Array.isArray(memesData) && memesData.length > 0) {
        console.log(`✅ ${memesData.length}개의 짤을 불러왔습니다.`);
        
        // localStorage에서 좋아요한 짤 목록 가져오기
        const likedMemes = typeof window !== 'undefined' 
          ? JSON.parse(localStorage.getItem('likedMemes') || '[]') as string[]
          : [];
        
        // localStorage에서 저장한 짤 목록 가져오기
        const savedMemes = typeof window !== 'undefined' 
          ? JSON.parse(localStorage.getItem('savedMemes') || '[]') as string[]
          : [];
        
        const dbMemes: Meme[] = memesData.map((dbMeme: any) => ({
          id: dbMeme.id,
          imageUrl: dbMeme.image_url,
          title: dbMeme.title,
          quote: dbMeme.quote,
          category: dbMeme.category as Category,
          tags: dbMeme.tags as any[],
          likes: dbMeme.likes,
          isFavorite: likedMemes.includes(dbMeme.id),
          isSaved: savedMemes.includes(dbMeme.id),
          userId: dbMeme.user_id,
          userNickname: profilesMap.get(dbMeme.user_id) || undefined,
        }));
        
        // Mock 데이터도 좋아요 및 저장 상태 적용
        const mockMemesWithLikes = availableMockMemes.map(meme => ({
          ...meme,
          isFavorite: likedMemes.includes(meme.id),
          isSaved: savedMemes.includes(meme.id),
        }));
        
        setMemes([...dbMemes, ...mockMemesWithLikes]);
      } else {
        // 데이터베이스가 비어있거나 데이터가 없는 경우
        console.log("데이터베이스에 짤이 없습니다. Mock 데이터를 사용합니다.");
        
        // localStorage에서 좋아요한 짤 목록 가져오기
        const likedMemes = typeof window !== 'undefined' 
          ? JSON.parse(localStorage.getItem('likedMemes') || '[]') as string[]
          : [];
        
        // Mock 데이터에 좋아요 상태 적용
        const mockMemesWithLikes = availableMockMemes.map(meme => ({
          ...meme,
          isFavorite: likedMemes.includes(meme.id),
        }));
        
        setMemes(mockMemesWithLikes);
      }
    } catch (error) {
      console.error("Unexpected error fetching memes:", {
        error,
        message: error instanceof Error ? error.message : "알 수 없는 오류",
        stack: error instanceof Error ? error.stack : undefined,
        fullError: JSON.stringify(error, Object.getOwnPropertyNames(error), 2)
      });
      toast.error("데이터를 불러오는 중 오류가 발생했습니다.");
      
      // 삭제된 Mock 데이터 ID 목록 가져오기
      const deletedMockIds = typeof window !== 'undefined' 
        ? JSON.parse(localStorage.getItem('deletedMockMemeIds') || '[]') as string[]
        : [];
      const availableMockMemes = mockMemes.filter(mock => !deletedMockIds.includes(mock.id));
      
      setMemes(availableMockMemes);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMemes();
  }, []);

  const filteredMemes = useMemo(() => {
    return memes.filter((meme) => {
      const matchesSearch =
        meme.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        meme.quote.toLowerCase().includes(searchQuery.toLowerCase()) ||
        meme.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesCategory =
        selectedCategory === "전체" || meme.category === selectedCategory;

      const matchesFilter = 
        activeFilter === "all" || 
        (activeFilter === "saved" && meme.isFavorite) ||
        (activeFilter === "liked" && meme.isFavorite);

      return matchesSearch && matchesCategory && matchesFilter;
    });
  }, [memes, searchQuery, selectedCategory, activeFilter]);

  const handleLike = (id: string) => {
    setMemes((prev) => {
      const updated = prev.map((meme) =>
        meme.id === id
          ? {
              ...meme,
              isFavorite: !meme.isFavorite,
              likes: meme.isFavorite ? Math.max(0, meme.likes - 1) : meme.likes + 1,
            }
          : meme
      );
      
      // localStorage 업데이트
      if (typeof window !== 'undefined') {
        const likedMemes = JSON.parse(localStorage.getItem('likedMemes') || '[]') as string[];
        const meme = updated.find(m => m.id === id);
        if (meme) {
          if (meme.isFavorite) {
            if (!likedMemes.includes(id)) {
              likedMemes.push(id);
            }
          } else {
            const index = likedMemes.indexOf(id);
            if (index > -1) {
              likedMemes.splice(index, 1);
            }
          }
          localStorage.setItem('likedMemes', JSON.stringify(likedMemes));
        }
      }
      
      // selectedMeme도 업데이트 (모달이 열려있을 때)
      setSelectedMeme((prev) => {
        if (prev && prev.id === id) {
          const updatedMeme = updated.find(m => m.id === id);
          return updatedMeme || prev;
        }
        return prev;
      });
      
      return updated;
    });
  };

  const handleSave = (id: string) => {
    setMemes((prev) => {
      const updated = prev.map((meme) =>
        meme.id === id
          ? {
              ...meme,
              isSaved: !meme.isSaved,
            }
          : meme
      );
      
      // localStorage 업데이트
      if (typeof window !== 'undefined') {
        const savedMemes = JSON.parse(localStorage.getItem('savedMemes') || '[]') as string[];
        const meme = updated.find(m => m.id === id);
        if (meme) {
          if (meme.isSaved) {
            if (!savedMemes.includes(id)) {
              savedMemes.push(id);
            }
            toast.success("저장되었습니다");
          } else {
            const index = savedMemes.indexOf(id);
            if (index > -1) {
              savedMemes.splice(index, 1);
            }
            toast.success("저장이 해제되었습니다");
          }
          localStorage.setItem('savedMemes', JSON.stringify(savedMemes));
        }
      }
      
      // selectedMeme도 업데이트 (모달이 열려있을 때)
      setSelectedMeme((prev) => {
        if (prev && prev.id === id) {
          const updatedMeme = updated.find(m => m.id === id);
          return updatedMeme || prev;
        }
        return prev;
      });
      
      return updated;
    });
  };

  const handleMemeClick = (meme: Meme) => {
    setSelectedMeme(meme);
    setIsModalOpen(true);
  };

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error("로그아웃 실패");
    } else {
      toast.success("로그아웃되었습니다");
    }
  };

  const handleUploadClick = () => {
    if (!user) {
      toast.error("로그인이 필요합니다");
      router.push("/auth");
      return;
    }
    setIsUploadOpen(true);
  };

  const [editingMeme, setEditingMeme] = useState<Meme | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedMemeIds, setSelectedMemeIds] = useState<Set<string>>(new Set());

  const handleEdit = (meme: Meme) => {
    // Admin이거나 본인이 업로드한 짤인지 확인
    if (!user) {
      toast.error("로그인이 필요합니다");
      return;
    }
    
    const isOwner = meme.userId === user.id;
    
    // Admin 권한 확인 로깅 (개발 환경)
    if (process.env.NODE_ENV === 'development') {
      console.log("Edit permission check:", {
        isAdmin,
        isOwner,
        userId: user.id,
        memeUserId: meme.userId,
        canEdit: isAdmin || isOwner
      });
    }
    
    if (!isAdmin && !isOwner) {
      toast.error("본인이 업로드한 짤만 수정할 수 있습니다");
      return;
    }
    
    setEditingMeme(meme);
    setIsEditOpen(true);
  };

  const handleDelete = async (id: string) => {
    const memeToDelete = memes.find(m => m.id === id);
    if (!memeToDelete) return;

    if (!user) {
      toast.error("로그인이 필요합니다");
      return;
    }

    // 관리자이거나 본인이 업로드한 짤인지 확인
    const isOwner = memeToDelete.userId === user.id;
    
    // Admin 권한 확인 로깅 (개발 환경)
    if (process.env.NODE_ENV === 'development') {
      console.log("Delete permission check:", {
        isAdmin,
        isOwner,
        userId: user.id,
        memeUserId: memeToDelete.userId,
        canDelete: isAdmin || isOwner
      });
    }
    
    if (!isAdmin && !isOwner) {
      toast.error("본인이 업로드한 짤만 삭제할 수 있습니다");
      return;
    }

    if (!confirm("정말 삭제하시겠습니까?")) {
      return;
    }

    try {
      // Mock 데이터인지 확인 (ID가 UUID 형식이 아니거나 userId가 없는 경우)
      const isMockData = !memeToDelete.userId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
      
      if (isMockData) {
        // Mock 데이터는 로컬 상태에서만 제거하고 localStorage에 저장
        setMemes((prev) => prev.filter((m) => m.id !== id));
        
        // 삭제된 Mock 데이터 ID를 localStorage에 저장
        if (typeof window !== 'undefined') {
          const deletedIds = JSON.parse(localStorage.getItem('deletedMockMemeIds') || '[]') as string[];
          if (!deletedIds.includes(id)) {
            deletedIds.push(id);
            localStorage.setItem('deletedMockMemeIds', JSON.stringify(deletedIds));
          }
        }
        
        toast.success("삭제되었습니다");
        return;
      }

      // 데이터베이스에 있는 데이터 삭제
      if (memeToDelete.imageUrl.includes("supabase")) {
        const urlParts = memeToDelete.imageUrl.split("/");
        const fileName = urlParts.slice(-2).join("/");
        await supabase.storage.from("meme-images").remove([fileName]);
      }

      const { error } = await supabase
        .from("memes")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast.success("삭제되었습니다");
      fetchMemes();
    } catch (error) {
      // 에러 상세 정보 로깅 (강화된 방식)
      const errorInfo: Record<string, unknown> = {
        errorType: typeof error,
        errorConstructor: error?.constructor?.name,
      };
      
      try {
        // Error 인스턴스인 경우
        if (error instanceof Error) {
          errorInfo.message = error.message;
          errorInfo.name = error.name;
          errorInfo.stack = error.stack;
        }
        
        // 객체인 경우 모든 속성 추출 시도
        if (error && typeof error === 'object') {
          // 직접 속성 접근 시도
          const errorAny = error as any;
          if (errorAny.message !== undefined) errorInfo.message = errorAny.message;
          if (errorAny.details !== undefined) errorInfo.details = errorAny.details;
          if (errorAny.hint !== undefined) errorInfo.hint = errorAny.hint;
          if (errorAny.code !== undefined) errorInfo.code = errorAny.code;
          if (errorAny.status !== undefined) errorInfo.status = errorAny.status;
          if (errorAny.statusText !== undefined) errorInfo.statusText = errorAny.statusText;
          
          // Object.keys로 열거 가능한 속성 추출
          try {
            const keys = Object.keys(error);
            errorInfo.enumerableKeys = keys;
            keys.forEach(key => {
              try {
                const value = errorAny[key];
                // 순환 참조 방지
                if (value !== error) {
                  errorInfo[key] = value;
                }
              } catch {
                // 접근 실패 시 무시
              }
            });
          } catch {
            // Object.keys 실패 시 무시
          }
          
          // Object.getOwnPropertyNames로 모든 속성 추출
          try {
            const allKeys = Object.getOwnPropertyNames(error);
            errorInfo.allPropertyNames = allKeys;
          } catch {
            // getOwnPropertyNames 실패 시 무시
          }
        }
        
        // JSON 직렬화 시도
        try {
          errorInfo.jsonString = JSON.stringify(error, Object.getOwnPropertyNames(error), 2);
        } catch {
          errorInfo.jsonString = "JSON 직렬화 실패";
        }
        
        // 문자열 변환
        errorInfo.stringValue = String(error);
        
      } catch (e) {
        console.error("Error parsing error object:", e);
        errorInfo.parseError = String(e);
        errorInfo.rawError = String(error);
      }
      
      console.error("Error deleting meme:", errorInfo);
      console.error("Raw error object:", error);
      
      // 에러 메시지 추출
      let errorMessage = "알 수 없는 오류";
      if (errorInfo.message) {
        errorMessage = String(errorInfo.message);
      } else if (errorInfo.stringValue && errorInfo.stringValue !== "[object Object]") {
        errorMessage = String(errorInfo.stringValue);
      } else if (errorInfo.code) {
        errorMessage = `에러 코드: ${String(errorInfo.code)}`;
      }
      
      toast.error(`삭제 중 오류가 발생했습니다: ${errorMessage}`);
    }
  };

  // 통계 계산
  const totalMemes = memes.length;
  const todayMemes = memes.filter((meme) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    // Mock 데이터는 오늘로 간주
    return true;
  }).length;

  const recentMemes = filteredMemes.slice(0, 5);

  // 전체 선택/해제 핸들러
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedMemeIds(new Set(recentMemes.map(meme => meme.id)));
    } else {
      setSelectedMemeIds(new Set());
    }
  };

  // 개별 선택/해제 핸들러
  const handleSelectMeme = (memeId: string, checked: boolean) => {
    setSelectedMemeIds(prev => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(memeId);
      } else {
        newSet.delete(memeId);
      }
      return newSet;
    });
  };

  // 전체 선택 상태 확인
  const isAllSelected = recentMemes.length > 0 && recentMemes.every(meme => selectedMemeIds.has(meme.id));
  const isIndeterminate = recentMemes.some(meme => selectedMemeIds.has(meme.id)) && !isAllSelected;

  const handleMenuClick = (menu: "library" | "saved" | "liked") => {
    if (menu === "library") {
      setActiveFilter("all");
      setSelectedCategory("전체");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else if (menu === "saved") {
      router.push("/saved");
    } else if (menu === "liked") {
      router.push("/liked");
    }
  };

  return (
    <DashboardLayout
      user={user}
      session={session}
      onSignOut={handleSignOut}
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      onUploadClick={handleUploadClick}
      onMenuClick={handleMenuClick}
      activeFilter={activeFilter}
    >
      <div className="space-y-6">
        {/* 통계 정보 */}
        <div className="flex items-center justify-end gap-6 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">전체 짤:</span>
            <span className="font-semibold">{totalMemes}</span>
            <span className="text-green-500 text-xs">(+{todayMemes} 오늘)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">검색 결과:</span>
            <span className="font-semibold">{filteredMemes.length}</span>
          </div>
        </div>

         {/* 짤 그리드 */}
         <Card>
           <CardContent className="space-y-4">
             <div className="pt-4">
               <CategoryFilter selected={selectedCategory} onSelect={setSelectedCategory} />
             </div>
            {isLoading ? (
              <div className="text-center py-20">
                <p className="text-xl text-muted-foreground">로딩 중...</p>
              </div>
            ) : filteredMemes.length > 0 ? (
              <MagicBento
                cardData={filteredMemes.map((meme) => ({
                  color: 'var(--card)',
                  title: meme.title,
                  description: meme.quote || meme.tags.join(', '),
                  label: '',
                  content: (
                    <div className="w-full h-full flex flex-col">
                      <h2 className="magic-bento-card__title mb-3">{meme.title}</h2>
                      <div className="relative aspect-square overflow-hidden rounded-lg mb-3">
                        <img
                          src={meme.imageUrl}
                          alt={meme.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex items-center justify-between text-xs text-[var(--muted-foreground)] mt-auto">
                        <span>{meme.likes.toLocaleString()} 좋아요</span>
                        {meme.userNickname && <span>{meme.userNickname}</span>}
                      </div>
                    </div>
                  )
                }))}
                enableStars={true}
                enableSpotlight={true}
                enableBorderGlow={true}
                glowColor="220, 100, 200"
                enableTilt={false}
                enableMagnetism={true}
                clickEffect={true}
                onCardClick={(index) => {
                  const meme = filteredMemes[index];
                  if (meme) {
                    handleMemeClick(meme);
                  }
                }}
              />
            ) : (
              <div className="text-center py-20">
                <p className="text-xl text-muted-foreground">검색 결과가 없습니다</p>
                <p className="text-sm text-muted-foreground mt-2">
                  다른 키워드로 검색해보세요
                </p>
              </div>
            )}
          </CardContent>
        </Card>

          {/* 최근 업로드된 짤 목록 */}
          <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>최근 업로드된 짤</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">
                    <input 
                      type="checkbox" 
                      className="rounded" 
                      checked={isAllSelected}
                      ref={(input: HTMLInputElement | null) => {
                        if (input) input.indeterminate = isIndeterminate;
                      }}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                    />
                  </TableHead>
                  <TableHead>제목</TableHead>
                  <TableHead>카테고리</TableHead>
                  <TableHead>태그</TableHead>
                  <TableHead>좋아요</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      로딩 중...
                    </TableCell>
                  </TableRow>
                ) : recentMemes.length > 0 ? (
                  recentMemes.map((meme) => (
                    <TableRow
                      key={meme.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleMemeClick(meme)}
                    >
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <input 
                          type="checkbox" 
                          className="rounded" 
                          checked={selectedMemeIds.has(meme.id)}
                          onChange={(e) => handleSelectMeme(meme.id, e.target.checked)}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{meme.title}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{meme.category}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 flex-wrap">
                          {meme.tags.slice(0, 2).map((tag) => (
                            <Badge key={tag} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                          {meme.tags.length > 2 && (
                            <span className="text-xs text-muted-foreground">+{meme.tags.length - 2}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{meme.likes.toLocaleString()}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      검색 결과가 없습니다
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

      </div>

      {/* Meme Modal */}
      <MemeModal
        meme={selectedMeme}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onLike={handleLike}
        onSave={handleSave}
        isAdmin={isAdmin}
        isOwner={user && selectedMeme?.userId === user.id}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      {/* Upload Dialog */}
      <UploadMemeDialog
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onSuccess={fetchMemes}
      />

      {/* Edit Dialog */}
      <UploadMemeDialog
        isOpen={isEditOpen}
        onClose={() => {
          setIsEditOpen(false);
          setEditingMeme(null);
        }}
        onSuccess={fetchMemes}
        editingMeme={editingMeme}
      />
    </DashboardLayout>
  );
}
