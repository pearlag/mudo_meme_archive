-- Create memes table for user-uploaded memes
CREATE TABLE public.memes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  image_url TEXT NOT NULL,
  title TEXT NOT NULL,
  episode TEXT NOT NULL,
  quote TEXT NOT NULL,
  category TEXT NOT NULL,
  tags TEXT[] NOT NULL DEFAULT '{}',
  likes INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.memes ENABLE ROW LEVEL SECURITY;

-- Allow anyone to view memes
CREATE POLICY "Anyone can view memes"
ON public.memes
FOR SELECT
USING (true);

-- Only authenticated users can insert their own memes
CREATE POLICY "Authenticated users can insert their own memes"
ON public.memes
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Users can update their own memes
CREATE POLICY "Users can update their own memes"
ON public.memes
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Users can delete their own memes
CREATE POLICY "Users can delete their own memes"
ON public.memes
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_memes_updated_at
BEFORE UPDATE ON public.memes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for meme images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('meme-images', 'meme-images', true);

-- Storage policies for meme images
CREATE POLICY "Anyone can view meme images"
ON storage.objects
FOR SELECT
USING (bucket_id = 'meme-images');

CREATE POLICY "Authenticated users can upload meme images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'meme-images');

CREATE POLICY "Users can update their own meme images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'meme-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own meme images"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'meme-images' AND auth.uid()::text = (storage.foldername(name))[1]);