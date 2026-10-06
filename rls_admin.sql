-- DULCE ABRIL — POLICIES DEL ADMIN
-- Ejecutar en Supabase > SQL Editor estando autenticado como propietario del proyecto.
-- No abre INSERT/UPDATE/DELETE al público (anon). Solo a usuarios authenticated.

-- =========================================================
-- PRODUCTS
-- =========================================================
DROP POLICY IF EXISTS "Authenticated users can insert products" ON public.products;
CREATE POLICY "Authenticated users can insert products"
ON public.products
FOR INSERT
TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can update products" ON public.products;
CREATE POLICY "Authenticated users can update products"
ON public.products
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can delete products" ON public.products;
CREATE POLICY "Authenticated users can delete products"
ON public.products
FOR DELETE
TO authenticated
USING (true);

-- =========================================================
-- INSTAGRAM POSTS
-- =========================================================
DROP POLICY IF EXISTS "Authenticated users can insert instagram posts" ON public.instagram_posts;
CREATE POLICY "Authenticated users can insert instagram posts"
ON public.instagram_posts
FOR INSERT
TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can update instagram posts" ON public.instagram_posts;
CREATE POLICY "Authenticated users can update instagram posts"
ON public.instagram_posts
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can delete instagram posts" ON public.instagram_posts;
CREATE POLICY "Authenticated users can delete instagram posts"
ON public.instagram_posts
FOR DELETE
TO authenticated
USING (true);

-- =========================================================
-- STORAGE: product-images
-- Solo usuarios autenticados pueden subir, reemplazar o borrar.
-- La lectura pública queda a cargo de que el bucket sea público.
-- =========================================================
DROP POLICY IF EXISTS "Authenticated users can upload product images" ON storage.objects;
CREATE POLICY "Authenticated users can upload product images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'product-images');

DROP POLICY IF EXISTS "Authenticated users can update product images" ON storage.objects;
CREATE POLICY "Authenticated users can update product images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'product-images')
WITH CHECK (bucket_id = 'product-images');

DROP POLICY IF EXISTS "Authenticated users can delete product images" ON storage.objects;
CREATE POLICY "Authenticated users can delete product images"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'product-images');
