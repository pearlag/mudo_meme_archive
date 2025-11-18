import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Badge } from "./ui/badge";
import { toast } from "sonner";
import { Upload, X } from "lucide-react";
import { Category, Emotion, Meme } from "@/types/meme";
import { z } from "zod";

const categories: Category[] = ["유재석", "박명수", "정형돈", "정준하", "하하", "노홍철", "길"];
const emotions: Emotion[] = [
  "웃김", 
  "화남", 
  "슬픔", 
  "감동", 
  "놀람", 
  "당황", 
  "사과", 
  "현웃",
  "기쁨",
  "설렘",
  "부끄러움",
  "짜증",
  "놀림",
  "멘붕",
  "허탈",
  "기대",
  "실망",
  "자신감",
  "겸손",
  "도전",
  "승리",
  "패배",
  "질투",
  "의심",
  "확신",
  "고민",
  "결심",
  "무서움",
  "안도",
  "만족",
  "불만"
];

const memeSchema = z.object({
  title: z.string().trim().min(1, "제목을 입력하세요").max(100, "제목은 100자 이내로 입력하세요"),
  quote: z.string().trim().min(1, "상황을 입력하세요").max(500, "상황은 500자 이내로 입력하세요"),
  category: z.string().min(1, "카테고리를 선택하세요"),
});

interface UploadMemeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editingMeme?: Meme | null;
}

export const UploadMemeDialog = ({ isOpen, onClose, onSuccess, editingMeme }: UploadMemeDialogProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [title, setTitle] = useState("");
  const [situation, setSituation] = useState("");
  const [category, setCategory] = useState<Category | "">("");
  const [selectedTags, setSelectedTags] = useState<Emotion[]>([]);

  const isEditMode = !!editingMeme;

  // 수정 모드일 때 기존 데이터 로드
  useEffect(() => {
    if (editingMeme && isOpen) {
      setTitle(editingMeme.title);
      setSituation(editingMeme.quote);
      setCategory(editingMeme.category);
      setSelectedTags(editingMeme.tags);
      setImagePreview(editingMeme.imageUrl);
      setImageFile(null); // 기존 이미지 사용
    }
  }, [editingMeme, isOpen]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error("이미지 크기는 10MB 이하여야 합니다");
        return;
      }
      if (!file.type.startsWith("image/")) {
        toast.error("이미지 파일만 업로드 가능합니다");
        return;
      }
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const toggleTag = (tag: Emotion) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // Validate form data
      const validated = memeSchema.parse({ title, quote: situation, category });

      if (!isEditMode && !imageFile) {
        toast.error("이미지를 선택하세요");
        return;
      }

      if (selectedTags.length === 0) {
        toast.error("최소 1개의 태그를 선택하세요");
        return;
      }

      setIsLoading(true);

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("로그인이 필요합니다");
        setIsLoading(false);
        return;
      }

      // Mock 데이터인지 확인 (ID가 UUID 형식이 아니거나 userId가 없는 경우)
      const isMockData = isEditMode && editingMeme && (!editingMeme.userId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(editingMeme.id));
      
      if (isMockData) {
        toast.error("Mock 데이터는 수정할 수 없습니다. 데이터베이스에 저장된 짤만 수정할 수 있습니다.");
        setIsLoading(false);
        return;
      }

      let imageUrl = editingMeme?.imageUrl || "";

      // 새 이미지가 업로드된 경우
      if (imageFile) {
        // 수정 모드이고 기존 이미지가 있으면 삭제
        if (isEditMode && editingMeme?.imageUrl && editingMeme.imageUrl.includes("supabase")) {
          const urlParts = editingMeme.imageUrl.split("/");
          const fileName = urlParts.slice(-2).join("/");
          await supabase.storage.from("meme-images").remove([fileName]);
        }

        // 새 이미지 업로드
        const fileExt = imageFile.name.split(".").pop();
        const fileName = `${user.id}/${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from("meme-images")
          .upload(fileName, imageFile);

        if (uploadError) {
          toast.error("이미지 업로드 실패: " + uploadError.message);
          setIsLoading(false);
          return;
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from("meme-images")
          .getPublicUrl(fileName);
        imageUrl = publicUrl;
      }

      if (isEditMode && editingMeme) {
        // Update existing meme
        // 타입 정의에 episode가 필수로 되어 있지만, 실제로는 사용하지 않으므로 타입 단언 사용
        const { error: updateError } = await supabase
          .from("memes")
          .update({
            title: validated.title,
            quote: validated.quote,
            category: validated.category,
            tags: selectedTags,
            ...(imageUrl && { image_url: imageUrl }),
          } as any)
          .eq("id", editingMeme.id);

        if (updateError) {
          toast.error("짤 수정 실패: " + updateError.message);
          setIsLoading(false);
          return;
        }

        toast.success("짤이 성공적으로 수정되었습니다!");
      } else {
        // Insert new meme
        // 타입 정의에 episode가 필수로 되어 있지만, 실제로는 사용하지 않으므로 타입 단언 사용
        const { error: insertError } = await supabase.from("memes").insert({
          user_id: user.id,
          image_url: imageUrl,
          title: validated.title,
          episode: "", // 빈 문자열로 설정 (데이터베이스 스키마 호환성)
          quote: validated.quote,
          category: validated.category,
          tags: selectedTags,
        } as any);

        if (insertError) {
          toast.error("짤 등록 실패: " + insertError.message);
          setIsLoading(false);
          return;
        }

        toast.success("짤이 성공적으로 등록되었습니다!");
      }

      onSuccess();
      resetForm();
      onClose();
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else {
        toast.error("짤 업로드 중 오류가 발생했습니다");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setImageFile(null);
    setImagePreview("");
    setTitle("");
    setSituation("");
    setCategory("");
    setSelectedTags([]);
  };

  // 다이얼로그가 닫힐 때 폼 초기화
  useEffect(() => {
    if (!isOpen) {
      // 약간의 지연을 두어 애니메이션 완료 후 초기화
      const timer = setTimeout(() => {
        if (!editingMeme) {
          resetForm();
        }
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen, editingMeme]);

  return (
      <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditMode ? "무도짤 수정" : "무도짤 업로드"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Image Upload */}
          <div className="space-y-2">
            <Label>이미지 {isEditMode && "(변경하려면 새 이미지를 선택하세요)"}</Label>
            {imagePreview ? (
              <div className="relative">
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="w-full h-64 object-cover rounded-lg"
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2"
                  onClick={() => {
                    setImageFile(null);
                    if (!isEditMode) {
                      setImagePreview("");
                    }
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-lg cursor-pointer bg-muted hover:bg-muted/80 transition-smooth">
                <Upload className="h-12 w-12 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">클릭하여 이미지 업로드</p>
                <input
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={handleImageChange}
                />
              </label>
            )}
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">제목</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="예: 유재석 폭소"
              required
            />
          </div>

          {/* Situation */}
          <div className="space-y-2">
            <Label htmlFor="situation">상황</Label>
            <Textarea
              id="situation"
              value={situation}
              onChange={(e) => setSituation(e.target.value)}
              placeholder="예: 유재석이 폭소하는 장면"
              required
            />
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label>카테고리 (인물)</Label>
            <Select value={category} onValueChange={(value) => setCategory(value as Category)}>
              <SelectTrigger>
                <SelectValue placeholder="인물 선택" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label>태그 (감정/상황)</Label>
            <div className="flex flex-wrap gap-2">
              {emotions.map((emotion) => (
                <Badge
                  key={emotion}
                  variant={selectedTags.includes(emotion) ? "default" : "outline"}
                  className="cursor-pointer transition-smooth hover:scale-105"
                  onClick={() => toggleTag(emotion)}
                >
                  {emotion}
                </Badge>
              ))}
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              취소
            </Button>
            <Button type="submit" disabled={isLoading} className="flex-1">
              {isLoading ? (isEditMode ? "수정 중..." : "업로드 중...") : (isEditMode ? "수정" : "업로드")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
