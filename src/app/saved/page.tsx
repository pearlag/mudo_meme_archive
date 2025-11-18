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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { useUserRole } from "@/hooks/useUserRole";
import { Bookmark } from "lucide-react";

export default function SavedPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [memes, setMemes] = useState<Meme[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<Category>("전체");
  const [selectedMeme, setSelectedMeme] = useState<Meme | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { isAdmin } = useUserRole(user);

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
        
        // 삭제된 Mock 데이터 ID 목록 가져오기
        const deletedMockIds = typeof window !== 'undefined' 
          ? JSON.parse(localStorage.getItem('deletedMockMemeIds') || '[]') as string[]
          : [];
        const availableMockMemes = mockMemes.filter(mock => !deletedMockIds.includes(mock.id));
        
        // 저장된 것만 필터링 (localStorage에서 좋아요 상태 확인)
        const savedMockMemes = availableMockMemes.filter(meme => {
          if (typeof window !== 'undefined') {
            const savedMemes = JSON.parse(localStorage.getItem('savedMemes') || '[]') as string[];
            return savedMemes.includes(meme.id);
          }
          return false;
        });
        
        setMemes(savedMockMemes);
        setIsLoading(false);
        return;
      }

      // 데이터베이스에서 memes 가져오기
      const { data: memesData, error: memesError } = await supabase
        .from("memes")
        .select("*")
        .order("created_at", { ascending: false });

      if (memesError) {
        console.error("Error fetching memes:", memesError);
        toast.error(`데이터 로드 실패: ${memesError.message || "알 수 없는 오류"}`);
        
        const deletedMockIds = typeof window !== 'undefined' 
          ? JSON.parse(localStorage.getItem('deletedMockMemeIds') || '[]') as string[]
          : [];
        const availableMockMemes = mockMemes.filter(mock => !deletedMockIds.includes(mock.id));
        
        const savedMockMemes = availableMockMemes.filter(meme => {
          if (typeof window !== 'undefined') {
            const savedMemes = JSON.parse(localStorage.getItem('savedMemes') || '[]') as string[];
            return savedMemes.includes(meme.id);
          }
          return false;
        });
        
        setMemes(savedMockMemes);
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

        if (profilesError && profilesError.code !== "PGRST116" && profilesError.code !== "42P01") {
          console.warn("Profiles 조회 실패:", profilesError);
        } else if (profilesData) {
          profilesMap = new Map(
            profilesData.map((p: any) => [p.id, p.nickname])
          );
        }
      }

      // 삭제된 Mock 데이터 ID 목록 가져오기
      const deletedMockIds = typeof window !== 'undefined' 
        ? JSON.parse(localStorage.getItem('deletedMockMemeIds') || '[]') as string[]
        : [];
      const availableMockMemes = mockMemes.filter(mock => !deletedMockIds.includes(mock.id));

      if (memesData && Array.isArray(memesData) && memesData.length > 0) {
        // localStorage에서 좋아요한 짤 목록 가져오기
        const likedMemes = typeof window !== 'undefined' 
          ? JSON.parse(localStorage.getItem('likedMemes') || '[]') as string[]
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
          isSaved: true, // 저장된 페이지이므로 모두 저장된 상태
          userId: dbMeme.user_id,
          userNickname: profilesMap.get(dbMeme.user_id) || undefined,
        }));
        
        // 저장된 것만 필터링 (localStorage에서 저장 상태 확인)
        const allMemes = [...dbMemes, ...availableMockMemes];
        const savedMemes = allMemes.filter(meme => {
          if (typeof window !== 'undefined') {
            const savedMemeIds = JSON.parse(localStorage.getItem('savedMemes') || '[]') as string[];
            return savedMemeIds.includes(meme.id);
          }
          return false;
        }).map(meme => ({
          ...meme,
          isSaved: true, // 저장된 페이지이므로 모두 저장된 상태
          isFavorite: likedMemes.includes(meme.id),
        }));
        
        setMemes(savedMemes);
      } else {
        const savedMockMemes = availableMockMemes.filter(meme => {
          if (typeof window !== 'undefined') {
            const savedMemes = JSON.parse(localStorage.getItem('savedMemes') || '[]') as string[];
            return savedMemes.includes(meme.id);
          }
          return false;
        });
        setMemes(savedMockMemes);
      }
    } catch (error) {
      console.error("Unexpected error fetching memes:", error);
      toast.error("데이터를 불러오는 중 오류가 발생했습니다.");
      
      const deletedMockIds = typeof window !== 'undefined' 
        ? JSON.parse(localStorage.getItem('deletedMockMemeIds') || '[]') as string[]
        : [];
      const availableMockMemes = mockMemes.filter(mock => !deletedMockIds.includes(mock.id));
      
      const savedMockMemes = availableMockMemes.filter(meme => {
        if (typeof window !== 'undefined') {
          const savedMemes = JSON.parse(localStorage.getItem('savedMemes') || '[]') as string[];
          return savedMemes.includes(meme.id);
        }
        return false;
      });
      
      setMemes(savedMockMemes);
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

      return matchesSearch && matchesCategory;
    });
  }, [memes, searchQuery, selectedCategory]);

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
      const updated = prev.filter(meme => meme.id !== id); // 저장 해제 시 목록에서 제거
      
      // localStorage 업데이트
      if (typeof window !== 'undefined') {
        const savedMemes = JSON.parse(localStorage.getItem('savedMemes') || '[]') as string[];
        const index = savedMemes.indexOf(id);
        if (index > -1) {
          savedMemes.splice(index, 1);
        }
        localStorage.setItem('savedMemes', JSON.stringify(savedMemes));
        toast.success("저장이 해제되었습니다");
      }
      
      // selectedMeme도 업데이트 (모달이 열려있을 때)
      setSelectedMeme((prev) => {
        if (prev && prev.id === id) {
          return null; // 저장 해제 시 모달 닫기
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

  const handleMenuClick = (menu: "library" | "saved" | "liked") => {
    if (menu === "library") {
      router.push("/");
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
      onMenuClick={handleMenuClick}
      activeFilter="saved"
    >
      <div className="space-y-6">

        {/* 짤 그리드 */}
        <Card>
          <CardHeader>
            <CardTitle>저장된 짤 ({filteredMemes.length}개)</CardTitle>
          </CardHeader>
          <CardContent>
              <div className="pb-4">
                <CategoryFilter selected={selectedCategory} onSelect={setSelectedCategory} />
              </div>
            {isLoading ? (
              <div className="text-center py-20">
                <p className="text-xl text-muted-foreground">로딩 중...</p>
              </div>
            ) : filteredMemes.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredMemes.map((meme) => {
                  const isOwner = user && meme.userId === user.id;
                  return (
                    <MemeCard
                      key={meme.id}
                      meme={meme}
                      onLike={handleLike}
                      onClick={handleMemeClick}
                      isAdmin={isAdmin}
                      isOwner={isOwner}
                    />
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-20">
                <Bookmark className="h-16 w-16 mx-auto text-muted-foreground mb-4 opacity-50" />
                <p className="text-xl text-muted-foreground">저장된 짤이 없습니다</p>
                <p className="text-sm text-muted-foreground mt-2">
                  마음에 드는 짤을 저장해보세요
                </p>
              </div>
            )}
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
      />
    </DashboardLayout>
  );
}

