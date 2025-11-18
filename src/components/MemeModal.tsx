import { X, Heart, Share2, Download, Pencil, Trash2, ChevronDown, ChevronUp, Bookmark } from "lucide-react";
import { Meme } from "@/types/meme";
import { Dialog, DialogContent, DialogTitle } from "./ui/dialog";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { toast } from "sonner";
import { useState, useRef, useEffect } from "react";

interface MemeModalProps {
  meme: Meme | null;
  isOpen: boolean;
  onClose: () => void;
  onLike: (id: string) => void;
  onSave?: (id: string) => void;
  isAdmin?: boolean;
  isOwner?: boolean;
  onEdit?: (meme: Meme) => void;
  onDelete?: (id: string) => void;
}

export const MemeModal = ({ meme, isOpen, onClose, onLike, onSave, isAdmin, isOwner, onEdit, onDelete }: MemeModalProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showMoreButton, setShowMoreButton] = useState(false);
  const textRef = useRef<HTMLParagraphElement>(null);

  // 모달이 닫히거나 meme이 변경될 때 상태 초기화
  useEffect(() => {
    if (!isOpen) {
      setIsExpanded(false);
      setShowMoreButton(false);
    }
  }, [isOpen]);

  // meme이 변경될 때도 상태 초기화
  useEffect(() => {
    setIsExpanded(false);
    setShowMoreButton(false);
  }, [meme?.id]);

  useEffect(() => {
    // 모달이 열릴 때와 텍스트가 변경될 때 체크
    if (!isExpanded && isOpen && meme?.quote) {
      // 약간의 지연을 두어 DOM이 완전히 렌더링된 후 체크
      const timer = setTimeout(() => {
        if (textRef.current) {
          const element = textRef.current;
          
          // line-clamp가 적용되지 않은 상태의 실제 높이를 측정하기 위해
          // 임시로 line-clamp를 제거하고 높이를 측정
          const originalClass = element.className;
          element.classList.remove('line-clamp-5');
          const fullHeight = element.scrollHeight;
          element.className = originalClass; // 원래대로 복원
          
          // line-clamp가 적용된 상태의 높이
          const clampedHeight = element.clientHeight;
          
          // 실제 높이가 제한된 높이보다 크면 버튼 표시
          const isOverflowing = fullHeight > clampedHeight + 10;
          setShowMoreButton(isOverflowing);
        }
      }, 300);
      
      return () => clearTimeout(timer);
    } else if (isExpanded) {
      setShowMoreButton(false);
    } else if (!meme?.quote) {
      setShowMoreButton(false);
    }
  }, [meme?.quote, isExpanded, isOpen]);

  if (!meme) return null;

  const handleShare = () => {
    toast.success("링크가 클립보드에 복사되었습니다!");
  };

  const handleDownload = () => {
    toast.success("다운로드를 시작합니다!");
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl p-0 gap-0 max-h-[90vh] overflow-hidden flex flex-col">
        <DialogTitle className="sr-only">{meme.title}</DialogTitle>
        <div className="flex flex-col md:flex-row gap-0 overflow-hidden">
          <div className="relative flex-shrink-0 md:w-1/2 bg-muted flex items-center justify-center min-h-[300px] max-h-[70vh]">
            <img
              src={meme.imageUrl}
              alt={meme.title}
              className="w-full h-full object-contain max-h-[70vh]"
            />
          </div>

          <div className="p-6 space-y-6 overflow-y-auto flex-1 md:max-h-[70vh]">
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-foreground">{meme.title}</h2>
            </div>

            <div className="space-y-2">
              <span className="text-sm font-medium text-muted-foreground">상황:</span>
              <div className="p-4 bg-muted rounded-lg">
                <div className="relative">
                  <p 
                    ref={textRef}
                    className={`text-sm whitespace-pre-wrap ${!isExpanded ? "line-clamp-5" : ""}`}
                  >
                    {meme.quote}
                  </p>
                  {showMoreButton && !isExpanded && (
                    <div className="flex justify-end mt-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-xs"
                        onClick={() => setIsExpanded(!isExpanded)}
                      >
                        <ChevronDown className="h-3 w-3 mr-1" />
                        더 보기
                      </Button>
                    </div>
                  )}
                  {isExpanded && (
                    <div className="flex justify-end mt-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-xs"
                        onClick={() => setIsExpanded(!isExpanded)}
                      >
                        <ChevronUp className="h-3 w-3 mr-1" />
                        접기
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-muted-foreground">카테고리:</span>
                <Badge variant="default">{meme.category}</Badge>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium text-muted-foreground">태그:</span>
                {meme.tags.map((tag) => (
                  <Badge key={tag} variant="secondary">
                    {tag}
                  </Badge>
                ))}
              </div>

              {meme.userNickname && (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-muted-foreground">업로더:</span>
                  <span className="text-sm">{meme.userNickname}</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-3"
                onClick={() => onLike(meme.id)}
              >
                <Heart className={`h-4 w-4 mr-1.5 ${meme.isFavorite ? "fill-accent text-accent" : ""}`} />
                <span className="text-xs">{meme.likes.toLocaleString()}</span>
              </Button>
              {onSave && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => onSave(meme.id)}
                >
                  <Bookmark className={`h-4 w-4 ${meme.isSaved ? "fill-accent text-accent" : ""}`} />
                </Button>
              )}
              <Button 
                variant="ghost" 
                size="sm"
                className="h-8 w-8 p-0"
                onClick={handleShare}
              >
                <Share2 className="h-4 w-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="sm"
                className="h-8 w-8 p-0"
                onClick={handleDownload}
              >
                <Download className="h-4 w-4" />
              </Button>
            </div>

            {(isAdmin || isOwner) && (
              <div className="flex gap-2 pt-4 border-t">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    onEdit?.(meme);
                    onClose();
                  }}
                >
                  <Pencil className="mr-2 h-4 w-4" />
                  수정
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={() => {
                    onDelete?.(meme.id);
                    onClose();
                  }}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  삭제
                </Button>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
