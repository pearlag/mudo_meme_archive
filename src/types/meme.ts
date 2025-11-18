export type Category = "유재석" | "박명수" | "정형돈" | "정준하" | "하하" | "노홍철" | "길" | "전체";
export type Emotion = 
  | "웃김" 
  | "화남" 
  | "슬픔" 
  | "감동" 
  | "놀람" 
  | "당황" 
  | "사과" 
  | "현웃"
  | "기쁨"
  | "설렘"
  | "부끄러움"
  | "짜증"
  | "놀림"
  | "멘붕"
  | "허탈"
  | "기대"
  | "실망"
  | "자신감"
  | "겸손"
  | "도전"
  | "승리"
  | "패배"
  | "질투"
  | "의심"
  | "확신"
  | "고민"
  | "결심"
  | "무서움"
  | "안도"
  | "만족"
  | "불만";

export interface Meme {
  id: string;
  imageUrl: string;
  title: string;
  quote: string;
  category: Category;
  tags: Emotion[];
  likes: number;
  isFavorite: boolean;
  isSaved?: boolean;
  userId?: string;
  userNickname?: string;
}
