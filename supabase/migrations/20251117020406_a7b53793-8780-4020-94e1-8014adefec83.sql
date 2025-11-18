-- Create role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

-- Create user_roles table
CREATE TABLE public.user_roles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create function to get user role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id uuid)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
  LIMIT 1
$$;

-- RLS policy for user_roles: users can view their own roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- RLS policy for user_roles: only admins can insert roles
CREATE POLICY "Admins can insert roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Update memes RLS policies to allow admins full access
DROP POLICY IF EXISTS "Users can update their own memes" ON public.memes;
DROP POLICY IF EXISTS "Users can delete their own memes" ON public.memes;

CREATE POLICY "Users and admins can update memes"
ON public.memes
FOR UPDATE
TO authenticated
USING (
  auth.uid() = user_id OR public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Users and admins can delete memes"
ON public.memes
FOR DELETE
TO authenticated
USING (
  auth.uid() = user_id OR public.has_role(auth.uid(), 'admin')
);

-- Admins can also insert memes
DROP POLICY IF EXISTS "Authenticated users can insert their own memes" ON public.memes;

CREATE POLICY "Authenticated users can insert memes"
ON public.memes
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id OR public.has_role(auth.uid(), 'admin')
);