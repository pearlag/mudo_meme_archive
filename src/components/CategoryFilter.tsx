import { Category } from "@/types/meme";
import { Badge } from "./ui/badge";

interface CategoryFilterProps {
  selected: Category;
  onSelect: (category: Category) => void;
}

const categories: Category[] = ["전체", "유재석", "박명수", "정형돈", "정준하", "하하", "노홍철", "길"];

export const CategoryFilter = ({ selected, onSelect }: CategoryFilterProps) => {
  return (
    <div className="flex flex-wrap gap-2 justify-center">
      {categories.map((category) => (
        <Badge
          key={category}
          variant={selected === category ? "default" : "outline"}
          className="cursor-pointer px-4 py-2 text-sm transition-smooth hover:scale-105"
          onClick={() => onSelect(category)}
        >
          {category}
        </Badge>
      ))}
    </div>
  );
};
