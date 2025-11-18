import { Heart, Pencil, Trash2 } from "lucide-react";
import { Meme } from "@/types/meme";
import { Badge } from "./ui/badge";
import { Card } from "./ui/card";
import { Button } from "./ui/button";

interface MemeCardProps {
  meme: Meme;
  onLike: (id: string) => void;
  onClick: (meme: Meme) => void;
  isAdmin?: boolean;
  isOwner?: boolean;
  onEdit?: (meme: Meme) => void;
  onDelete?: (id: string) => void;
}

export const MemeCard = ({ meme, onLike, onClick, isAdmin, isOwner, onEdit, onDelete }: MemeCardProps) => {
  return (
    <Card 
      className="group overflow-hidden cursor-pointer transition-smooth hover:shadow-hover border-2"
      onClick={() => onClick(meme)}
    >
      <div className="relative aspect-square overflow-hidden bg-muted">
        <img
          src={meme.imageUrl}
          alt={meme.title}
          className="w-full h-full object-cover transition-smooth group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-smooth" />
      </div>
      
      <div className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <h3 className="font-bold text-foreground line-clamp-1">{meme.title}</h3>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onLike(meme.id);
            }}
            className="transition-smooth hover:scale-110"
          >
            <Heart
              className={`h-5 w-5 ${
                meme.isFavorite ? "fill-accent text-accent" : "text-muted-foreground"
              }`}
            />
          </button>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {meme.tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            {meme.userNickname && (
              <span className="text-xs">{meme.userNickname}</span>
            )}
          </div>
          <span>{meme.likes.toLocaleString()} 좋아요</span>
        </div>

        {(isAdmin || isOwner) && (
          <div className="flex gap-2 pt-2 border-t">
            <Button
              size="sm"
              variant="outline"
              className="flex-1"
              onClick={(e) => {
                e.stopPropagation();
                onEdit?.(meme);
              }}
            >
              <Pencil className="h-3 w-3 mr-1" />
              수정
            </Button>
            <Button
              size="sm"
              variant="destructive"
              className="flex-1"
              onClick={(e) => {
                e.stopPropagation();
                onDelete?.(meme.id);
              }}
            >
              <Trash2 className="h-3 w-3 mr-1" />
              삭제
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
};
