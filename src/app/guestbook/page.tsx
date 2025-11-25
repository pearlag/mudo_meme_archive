"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { MessageSquare, Send } from "lucide-react";

interface GuestbookEntry {
  id: string;
  author: string;
  message: string;
  created_at: string;
}

export default function GuestbookPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [author, setAuthor] = useState("");
  const [message, setMessage] = useState("");
  const [entries, setEntries] = useState<GuestbookEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  // Fetch guestbook entries
  const fetchEntries = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("guestbook" as any)
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching guestbook entries:", error);
        toast.error("방명록을 불러오는 중 오류가 발생했습니다");
        setEntries([]);
        return;
      }

      if (data && Array.isArray(data)) {
        setEntries(data as unknown as GuestbookEntry[]);
      } else {
        setEntries([]);
      }
    } catch (error) {
      console.error("Unexpected error:", error);
      toast.error("방명록을 불러오는 중 오류가 발생했습니다");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEntries();
  }, []);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!author.trim()) {
      toast.error("작성자 이름을 입력해주세요");
      return;
    }

    if (!message.trim()) {
      toast.error("메시지를 입력해주세요");
      return;
    }

    setIsSubmitting(true);

    try {
      const { data, error } = await supabase
        .from("guestbook" as any)
        .insert([
          {
            author: author.trim(),
            message: message.trim(),
          },
        ])
        .select()
        .single();

      if (error) {
        console.error("Error inserting guestbook entry:", error);
        toast.error("방명록 작성 중 오류가 발생했습니다");
        return;
      }

      toast.success("방명록이 작성되었습니다!");
      setAuthor("");
      setMessage("");
      fetchEntries();
    } catch (error) {
      console.error("Unexpected error:", error);
      toast.error("방명록 작성 중 오류가 발생했습니다");
    } finally {
      setIsSubmitting(false);
    }
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <DashboardLayout
      user={user}
      session={session}
      onSignOut={handleSignOut}
      searchQuery=""
      onSearchChange={() => {}}
      onMenuClick={handleMenuClick}
      activeFilter="all"
    >
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-6 w-6" />
          <h1 className="text-2xl font-bold">방명록</h1>
        </div>

        {/* 방명록 작성 폼 */}
        <Card>
          <CardHeader>
            <CardTitle>방명록 작성</CardTitle>
            <CardDescription>이름과 메시지를 남겨주세요</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="author" className="block text-sm font-medium mb-2">
                  작성자 이름
                </label>
                <Input
                  id="author"
                  type="text"
                  placeholder="이름을 입력하세요"
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  maxLength={50}
                  required
                />
              </div>

              <div>
                <label htmlFor="message" className="block text-sm font-medium mb-2">
                  메시지
                </label>
                <Textarea
                  id="message"
                  placeholder="메시지를 입력하세요"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={5}
                  maxLength={500}
                  required
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {message.length}/500
                </p>
              </div>

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full"
              >
                <Send className="h-4 w-4 mr-2" />
                {isSubmitting ? "작성 중..." : "글 남기기"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* 방명록 목록 */}
        <Card>
          <CardHeader>
            <CardTitle>방명록 ({entries.length}개)</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-20">
                <p className="text-xl text-muted-foreground">로딩 중...</p>
              </div>
            ) : entries.length > 0 ? (
              <div className="space-y-4">
                {entries.map((entry) => (
                  <div
                    key={entry.id}
                    className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="font-semibold text-lg">{entry.author}</div>
                      <div className="text-xs text-muted-foreground">
                        {formatDate(entry.created_at)}
                      </div>
                    </div>
                    <p className="text-sm text-foreground whitespace-pre-wrap">
                      {entry.message}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-20">
                <MessageSquare className="h-16 w-16 mx-auto text-muted-foreground mb-4 opacity-50" />
                <p className="text-xl text-muted-foreground">아직 방명록이 없습니다</p>
                <p className="text-sm text-muted-foreground mt-2">
                  첫 번째 방명록을 남겨보세요!
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}


