import { Search } from "lucide-react";
import { Input } from "./ui/input";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
}

export const SearchBar = ({ value, onChange }: SearchBarProps) => {
  return (
    <div className="relative w-full max-w-2xl">
      <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
      <Input
        type="text"
        placeholder="대사, 인물, 상황으로 검색하세요..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="pl-12 h-14 text-base border-2 focus-visible:ring-primary focus-visible:border-primary"
      />
    </div>
  );
};
