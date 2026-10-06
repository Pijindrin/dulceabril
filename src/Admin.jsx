import { useEffect, useRef, useState } from "react";
import { supabase } from "./supabase";

function Admin() {
  const [products, setProducts] = useState([]);
  const [instagramPosts, setInstagramPosts] = useState([]);
  const [instagramLoading, setInstagramLoading] = useState(false);
  const [instagramForm, setInstagramForm] = useState({ id: null, post_url: "", position: 1 });
  const [instagramEditing, setInstagramEditing] = useState(false);
  const [instagramAdding, setInstagramAdding] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [categories, setCategories] = useState([]);
  const [imagePreview, setImagePreview] = useState("");

  // Autenticación del panel de administración
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState("");
  const editFormRef = useRef(null);

  // Buscador y filtros
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState("Todos");
  const [categoryFilter, setCategoryFilter] = useState("Todas");
  const [searchOpen, setSearchOpen] = useState(false);
  const [adminSection, setAdminSection] = useState(null);

  const emptyForm = {
    name:"",
    description:"",
    price:"",
    stock:"",
    category_id:"",
    image_url:"",
    imageFiles:[],
    images:[],
    variants:[],
    featured:false,
    promotion:false,
    heroSlide:null,
  };
  const ADMIN_DRAFT_KEY = "dulceAbrilAdminDraft";
  const [form, setForm] = useState(emptyForm);
  const [draftReady, setDraftReady] = useState(false);

  // Guarda temporalmente el formulario para que Android/Chrome no haga perder
  // lo escrito si el selector de archivos provoca una recarga de la página.
  // Los File no se guardan aquí porque no son serializables; las imágenes ya
  // guardadas sí se conservan mediante sus URLs.
  useEffect(() => {
    try {
      const rawDraft = sessionStorage.getItem(ADMIN_DRAFT_KEY);
      if (rawDraft) {
        const draft = JSON.parse(rawDraft);
        const restoredVariants = Array.isArray(draft?.form?.variants)
          ? draft.form.variants.map((variant) => ({ ...variant, imageFiles: [] }))
          : [];

        setForm({
          ...emptyForm,
          ...(draft?.form || {}),
          imageFiles: [],
          variants: restoredVariants,
        });

        if (draft?.editingProductId) {
          setEditingProduct({ id: draft.editingProductId });
        }
        setShowForm(draft?.showForm === true);
        if (draft?.showForm === true) setAdminSection("productos");
      }
    } catch (error) {
      console.warn("No se pudo restaurar el borrador del Admin:", error);
    } finally {
      setDraftReady(true);
    }
  }, []);

  // Persistencia ligera del borrador. Se ejecuta mientras el usuario escribe,
  // de modo que una recarga inesperada no borre el formulario.
  useEffect(() => {
    if (!draftReady || !showForm) return;

    try {
      const draftForm = {
        ...form,
        imageFiles: [],
        variants: (form.variants || []).map((variant) => ({ ...variant, imageFiles: [] })),
      };

      sessionStorage.setItem(
        ADMIN_DRAFT_KEY,
        JSON.stringify({
          form: draftForm,
          editingProductId: editingProduct?.id || null,
          showForm: true,
        })
      );
    } catch (error) {
      console.warn("No se pudo guardar el borrador del Admin:", error);
    }
  }, [draftReady, form, editingProduct, showForm]);

  useEffect(() => {
    let mounted = true;

    async function comprobarSesion() {
      const {
        data: { session: currentSession },
      } = await supabase.auth.getSession();

      if (!mounted) return;

      setSession(currentSession);
      setAuthLoading(false);

      if (currentSession) {
        cargarProductos();
        cargarCategorias();
        cargarInstagramPosts();
      }
    }

    comprobarSesion();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      if (!mounted) return;

      setSession(currentSession);

      if (currentSession) {
        cargarProductos();
        cargarCategorias();
        cargarInstagramPosts();
      } else {
        setProducts([]);
        setCategories([]);
        setShowForm(false);
        setEditingProduct(null);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Cuando se edita un producto desde abajo de la lista,
  // llevar suavemente el formulario hacia la vista.
  useEffect(() => {
    if (showForm && editingProduct && editFormRef.current) {
      requestAnimationFrame(() => {
        setTimeout(() => {
          editFormRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        }, 40);
      });
    }
  }, [showForm, editingProduct]);

  async function iniciarSesion(event) {
    event.preventDefault();

    setLoginLoading(true);
    setLoginError("");

    const { data, error } = await supabase.auth.signInWithPassword({
      email: loginEmail.trim(),
      password: loginPassword,
    });

    if (error) {
      console.error("Error iniciando sesión:", error);
      setLoginError("Correo o contraseña incorrectos.");
      setLoginLoading(false);
      return;
    }

    setSession(data.session);
    setLoginPassword("");
    setLoginLoading(false);
  }

  async function cerrarSesion() {
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("Error cerrando sesión:", error);
      alert("No se pudo cerrar la sesión.");
      return;
    }

    setSession(null);
  }

  async function cargarProductos() {
    setLoading(true);

    const { data, error } = await supabase
      .from("products")
      .select(`
        id,
        name,
        price,
        stock,
        category_id,
        active,
        featured,
        promotion,
        image_url,
        description,
        images,
        variants,
        categories (
          name
        )
      `)
      .order("id", { ascending: true });

    if (error) {
      console.error("ERROR CARGANDO PRODUCTOS:", error);
      alert("Error cargando productos: " + error.message);
      setLoading(false);
      return;
    }

    console.log("PRODUCTOS CARGADOS:", data);

    const normalizedProducts = (data || []).map((product) => ({
      ...product,
      featured:
        product.featured === true ||
        product.featured === "true" ||
        product.featured === 1,
      promotion:
        product.promotion === true ||
        product.promotion === "true" ||
        product.promotion === 1,
      active:
        product.active === true ||
        product.active === "true" ||
        product.active === 1,
    }));

    setProducts(normalizedProducts);
    setLoading(false);
  }

  async function cargarInstagramPosts() {
    setInstagramLoading(true);
    const { data, error } = await supabase
      .from("instagram_posts")
      .select("id, post_url, position, active")
      .eq("active", true)
      .order("position", { ascending: true });

    if (error) {
      console.warn("Instagram administrable todavía no disponible:", error.message);
      setInstagramPosts([]);
      setInstagramLoading(false);
      return;
    }

    setInstagramPosts(data || []);
    setInstagramLoading(false);
  }

  function normalizeInstagramPostUrl(value) {
    try {
      const url = new URL(String(value || "").trim());
      const host = url.hostname.toLowerCase();
      if (host !== "instagram.com" && host !== "www.instagram.com") return "";
      const match = url.pathname.match(/^\/(p|reel|tv)\/([^/]+)/i);
      if (!match) return "";
      return `https://www.instagram.com/${match[1].toLowerCase()}/${match[2]}/`;
    } catch {
      return "";
    }
  }

  function resetInstagramForm() {
    setInstagramForm({ id: null, post_url: "", position: Math.min(3, instagramPosts.length + 1) });
    setInstagramEditing(false);
    setInstagramAdding(false);
  }

  function abrirNuevaInstagramPost() {
    if (instagramPosts.length >= 3) {
      alert("Ya tenés 3 publicaciones de Instagram configuradas. Eliminá o editá una para reemplazarla.");
      return;
    }

    setInstagramForm({
      id: null,
      post_url: "",
      position: Math.min(3, instagramPosts.length + 1),
    });
    setInstagramEditing(false);
    setInstagramAdding(true);
  }

  async function guardarInstagramPost(event) {
    event.preventDefault();

    const postUrl = normalizeInstagramPostUrl(instagramForm.post_url);
    if (!postUrl) {
      alert("Pegá el enlace de una publicación, Reel o video de Instagram. Por ejemplo: https://www.instagram.com/p/ABC123/");
      return;
    }

    const position = Math.max(1, Math.min(3, Number(instagramForm.position) || 1));
    const payload = {
      post_url: postUrl,
      position,
      active: true,
      image_url: null,
      title: null,
      caption: null,
    };

    // Una posición representa una publicación visible. Si ya está ocupada,
    // la publicación anterior queda inactiva para conservar el límite de 3.
    const { error: conflictError } = await supabase
      .from("instagram_posts")
      .update({ active: false })
      .eq("position", position)
      .neq("id", instagramForm.id || -1);
    if (conflictError) {
      alert("No se pudo actualizar la posición: " + conflictError.message);
      return;
    }

    const result = instagramEditing
      ? await supabase.from("instagram_posts").update(payload).eq("id", instagramForm.id)
      : await supabase.from("instagram_posts").insert([payload]);

    if (result.error) {
      alert("No se pudo guardar la publicación: " + result.error.message);
      return;
    }

    const wasEditing = instagramEditing;
    await cargarInstagramPosts();
    resetInstagramForm();
    alert(wasEditing ? "Publicación actualizada." : "Publicación agregada.");
  }

  async function eliminarInstagramPost(id) {
    if (!window.confirm("¿Eliminar esta publicación de Instagram?")) return;
    const { error } = await supabase.from("instagram_posts").delete().eq("id", id);
    if (error) { alert("No se pudo eliminar: " + error.message); return; }
    await cargarInstagramPosts();
  }

  function editarInstagramPost(post) {
    setInstagramForm({ id: post.id, post_url: post.post_url || "", position: post.position || 1 });
    setInstagramEditing(true);
    setInstagramAdding(false);
    window.setTimeout(() => document.getElementById("instagram-admin-section")?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  }

  async function cargarCategorias() {
    const { data, error } = await supabase
      .from("categories")
      .select("id, name")
      .order("id", { ascending: true });

    if (error) {
      console.error("Error cargando categorías:", error);
      return;
    }

    setCategories(data || []);
  }

  const slugifyCategory = (value) =>
    String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

  const [categoryName, setCategoryName] = useState("");
  const [editingCategory, setEditingCategory] = useState(null);
  const [categorySaving, setCategorySaving] = useState(false);

  async function guardarCategoria(event) {
    event.preventDefault();
    const name = categoryName.trim().replace(/\s+/g, " ");
    const slug = slugifyCategory(name);

    if (!name) {
      alert("Escribí un nombre para la categoría.");
      return;
    }
    if (!slug) {
      alert("El nombre elegido no permite generar un identificador válido.");
      return;
    }

    const duplicate = categories.find(
      (category) =>
        category.id !== editingCategory?.id &&
        String(category.name || "").trim().toLowerCase() === name.toLowerCase()
    );

    if (duplicate) {
      alert("Ya existe una categoría con ese nombre.");
      return;
    }

    setCategorySaving(true);

    try {
      const payload = { name, slug };
      const result = editingCategory
        ? await supabase.from("categories").update(payload).eq("id", editingCategory.id)
        : await supabase.from("categories").insert([payload]);

      if (result.error) {
        console.error("ERROR GUARDANDO CATEGORÍA:", result.error);
        alert("No se pudo guardar la categoría: " + result.error.message);
        return;
      }

      setCategoryName("");
      setEditingCategory(null);
      await cargarCategorias();
    } catch (error) {
      console.error("ERROR INESPERADO GUARDANDO CATEGORÍA:", error);
      alert("Ocurrió un error inesperado al guardar la categoría.");
    } finally {
      setCategorySaving(false);
    }
  }

  async function eliminarCategoria(category) {
    const { count, error: countError } = await supabase
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("category_id", category.id);

    if (countError) {
      console.error("ERROR COMPROBANDO PRODUCTOS DE CATEGORÍA:", countError);
      alert("No se pudo comprobar si la categoría está en uso.");
      return;
    }

    if (Number(count || 0) > 0) {
      alert(`No se puede eliminar "${category.name}" porque tiene ${count} producto(s) asociado(s). Primero reasigná esos productos a otra categoría.`);
      return;
    }

    const confirmar = window.confirm(`¿Eliminar la categoría "${category.name}"?\n\nEsta acción no se puede deshacer.`);
    if (!confirmar) return;

    const { error } = await supabase.from("categories").delete().eq("id", category.id);

    if (error) {
      console.error("ERROR ELIMINANDO CATEGORÍA:", error);
      alert("No se pudo eliminar la categoría: " + error.message);
      return;
    }

    if (editingCategory?.id === category.id) {
      setEditingCategory(null);
      setCategoryName("");
    }

    await cargarCategorias();
  }

  async function toggleProductActive(product) {
  try {
    // 1. Comprobar usuario autenticado
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    console.log("USER ROLE:", user?.role);
console.log("USER APP METADATA:", user?.app_metadata);
console.log("USER ID:", user?.id);
console.log("USER EMAIL:", user?.email);

    console.log("USER DESDE SUPABASE:", user);
    console.log("USER ERROR:", userError);

    if (userError || !user) {
      alert("No hay un usuario autenticado.");
      return;
    }

    console.log("USER ID:", user.id);
    console.log("EMAIL:", user.email);

    // 2. Comprobar sesión actual
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    console.log("SESSION EXISTE:", !!session);
    console.log("SESSION ERROR:", sessionError);

    if (!session) {
      alert("No hay una sesión activa.");
      return;
    }

    console.log("ROLE JWT:", session.user?.role);
    console.log("APP METADATA:", session.user?.app_metadata);

    // 3. Intentar actualizar
    const nuevoEstado = !product.active;

    const { data, error } = await supabase
      .from("products")
      .update({
        active: nuevoEstado,
      })
      .eq("id", product.id);

    console.log("RESULTADO UPDATE:", data);
    console.log("ERROR UPDATE:", error);

    if (error) {
      console.error("ERROR COMPLETO:", error);

      alert(
        `Error al cambiar estado:\n\nCódigo: ${error.code}\nMensaje: ${error.message}`
      );

      return;
    }

    console.log("PRODUCTO ACTUALIZADO:", data);

    await cargarProductos();

  } catch (err) {
    console.error("ERROR INESPERADO:", err);
    alert("Ocurrió un error inesperado.");
  }
}



  async function eliminarProducto(product) {
    const confirmar = window.confirm(
      `¿Seguro que querés eliminar "${product.name}"?\n\nEsta acción eliminará definitivamente el producto del catálogo.`
    );

    if (!confirmar) return;

    try {
      const { error } = await supabase
        .from("products")
        .delete()
        .eq("id", product.id);

      if (error) {
        console.error("ERROR ELIMINANDO PRODUCTO:", error);
        alert("No se pudo eliminar el producto: " + error.message);
        return;
      }

      if (editingProduct?.id === product.id) {
        setEditingProduct(null);
        setForm({ ...emptyForm });
        setImagePreview("");
        setShowForm(false);
      }

      await cargarProductos();
      alert("Producto eliminado correctamente.");
    } catch (err) {
      console.error("ERROR INESPERADO ELIMINANDO PRODUCTO:", err);
      alert("Ocurrió un error inesperado al eliminar el producto.");
    }
  }


  // Optimiza las imágenes antes de subirlas a Supabase Storage.
  // No cambia la interfaz ni la forma en que se administran las fotos.
  async function optimizarImagen(file) {
    if (!file || !file.type?.startsWith("image/")) return file;

    // No procesamos GIF/SVG: así evitamos alterar animaciones o gráficos vectoriales.
    if (file.type === "image/gif" || file.type === "image/svg+xml") return file;

    // Si ya es una imagen liviana y de tamaño razonable, la dejamos tal cual.
    if (file.size <= 800 * 1024) {
      try {
        const bitmap = await createImageBitmap(file);
        if (bitmap.width <= 1600 && bitmap.height <= 1600) {
          bitmap.close();
          return file;
        }
        bitmap.close();
      } catch {}
    }

    return new Promise((resolve) => {
      const objectUrl = URL.createObjectURL(file);
      const img = new Image();

      img.onload = () => {
        try {
          const maxSize = 1600;
          const scale = Math.min(1, maxSize / Math.max(img.naturalWidth, img.naturalHeight));
          const width = Math.max(1, Math.round(img.naturalWidth * scale));
          const height = Math.max(1, Math.round(img.naturalHeight * scale));

          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext("2d");
          if (!ctx) {
            URL.revokeObjectURL(objectUrl);
            resolve(file);
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);

          const finalizar = (blob, type) => {
            URL.revokeObjectURL(objectUrl);

            if (!blob) {
              resolve(file);
              return;
            }

            const extension = type === "image/webp" ? "webp" : "jpg";
            const baseName = file.name.replace(/\.[^/.]+$/, "");
            const optimized = new File(
              [blob],
              `${baseName}.${extension}`,
              { type, lastModified: Date.now() }
            );

            // Nunca reemplazamos una imagen por una versión más pesada.
            resolve(optimized.size < file.size ? optimized : file);
          };

          // WebP reduce mucho el peso manteniendo buena calidad.
          canvas.toBlob(
            (blob) => {
              if (blob) {
                finalizar(blob, "image/webp");
              } else {
                canvas.toBlob(
                  (jpgBlob) => finalizar(jpgBlob, "image/jpeg"),
                  "image/jpeg",
                  0.82
                );
              }
            },
            "image/webp",
            0.82
          );
        } catch {
          URL.revokeObjectURL(objectUrl);
          resolve(file);
        }
      };

      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        resolve(file);
      };

      img.src = objectUrl;
    });
  }

  async function guardarProducto(event) {
    event.preventDefault();
    let images = Array.isArray(form.images) ? [...form.images] : [];
    for (const originalFile of form.imageFiles || []) {
      const file = await optimizarImagen(originalFile);
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}-${file.name}`;
      const {error:uploadError}=await supabase.storage.from("product-images").upload(fileName,file,{contentType:file.type || "application/octet-stream"});
      if(uploadError){alert("No se pudo subir una de las imágenes.");return;}
      const {data}=supabase.storage.from("product-images").getPublicUrl(fileName);
      images.push({url:data.publicUrl});
    }

    const variants = [];
    for (const variant of form.variants || []) {
      if (!(variant.name || variant.code)) continue;
      const variantImages = Array.isArray(variant.images) ? [...variant.images] : [];
      for (const originalFile of variant.imageFiles || []) {
        const file = await optimizarImagen(originalFile);
        const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}-${file.name}`;
        const {error:uploadError}=await supabase.storage.from("product-images").upload(fileName,file,{contentType:file.type || "application/octet-stream"});
        if(uploadError){alert(`No se pudo subir una imagen de la variante ${variant.name || variant.code}.`);return;}
        const {data}=supabase.storage.from("product-images").getPublicUrl(fileName);
        variantImages.push({url:data.publicUrl});
      }
      variants.push({
        name: variant.name || "",
        code: variant.code || "",
        stock: Number(variant.stock ?? 0),
        images: variantImages,
      });
    }

    const imageUrl=images[0]?.url || null;
    const heroSlide =
      form.heroSlide === 2 || form.heroSlide === 3
        ? form.heroSlide
        : null;

    const payload={
      name:form.name,
      description:form.description?.trim() || null,
      price:Number(form.price),
      stock:Number(form.stock),
      category_id:Number(form.category_id),
      image_url:imageUrl,
      images,
      variants,
      featured:form.featured,
      promotion:form.promotion,
      hero_slide:heroSlide,
    };

    // Cada posición del Hero puede pertenecer a un solo producto.
    if (heroSlide !== null) {
      const { error: clearHeroError } = await supabase
        .from("products")
        .update({ hero_slide: null })
        .eq("hero_slide", heroSlide)
        .neq("id", editingProduct?.id ?? -1);

      if (clearHeroError) {
        console.error("ERROR LIBERANDO POSICIÓN DEL HERO:", clearHeroError);
        alert("No se pudo actualizar la posición del Hero: " + clearHeroError.message);
        return;
      }
    }

    let result;

    if (editingProduct) {
      result = await supabase
        .from("products")
        .update(payload)
        .eq("id",editingProduct.id);
    } else {
      result = await supabase
        .from("products")
        .insert([{...payload,active:true}]);
    }

    if(result.error){
      console.error("ERROR GUARDANDO PRODUCTO:", result.error);
      alert("No se pudo guardar el producto: "+result.error.message);
      return;
    }
    alert(editingProduct?"Producto actualizado correctamente.":"Producto guardado correctamente.");
    try { sessionStorage.removeItem(ADMIN_DRAFT_KEY); } catch {}
    setForm({...emptyForm}); setEditingProduct(null); setImagePreview(""); setShowForm(false); cargarProductos();
  }

  // =========================
  // ESTADÍSTICAS
  // =========================

  const totalProducts = products.length;

  const activeProducts = products.filter(
    (product) => product.active === true
  ).length;

  const hiddenProducts = products.filter(
    (product) => product.active !== true
  ).length;

  const lowStockProducts = products.filter(
    (product) => Number(product.stock) > 0 && Number(product.stock) <= 5
  ).length;

  const promotionProducts = products.filter(
    (product) => product.promotion === true
  ).length;

  const featuredProducts = products.filter(
    (product) => product.featured === true
  ).length;

  // =========================
  // BUSCADOR Y FILTROS
  // =========================

  const normalizedSearch = searchTerm.trim().toLowerCase();

  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      normalizedSearch === "" ||
      product.name?.toLowerCase().includes(normalizedSearch) ||
      product.categories?.name?.toLowerCase().includes(normalizedSearch);

    const matchesCategory =
      categoryFilter === "Todas" ||
      product.categories?.name === categoryFilter;

    let matchesStatus = true;

    if (activeFilter === "Activos") {
      matchesStatus = product.active === true;
    } else if (activeFilter === "Ocultos") {
      matchesStatus = product.active !== true;
    } else if (activeFilter === "Promociones") {
      matchesStatus = product.promotion === true;
    } else if (activeFilter === "Destacados") {
      matchesStatus = product.featured === true;
    } else if (activeFilter === "Stock bajo") {
      matchesStatus =
        Number(product.stock) > 0 && Number(product.stock) <= 5;
    }

    return matchesSearch && matchesCategory && matchesStatus;
  });

  const hasActiveFilters =
    searchTerm.trim() !== "" ||
    activeFilter !== "Todos" ||
    categoryFilter !== "Todas";

  const limpiarFiltros = () => {
    setSearchTerm("");
    setActiveFilter("Todos");
    setCategoryFilter("Todas");
  };

  if (authLoading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#f8f3f1",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
          fontFamily: "DM Sans, Arial, sans-serif",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: "420px",
            background: "#fff",
            border: "1px solid #eaded9",
            borderRadius: "22px",
            padding: "32px",
            boxShadow: "0 10px 35px rgba(0,0,0,.06)",
            textAlign: "center",
          }}
        >
          <h1 style={{ margin: 0, color: "#8d5966", fontFamily: "Playfair Display, Georgia, serif" }}>
            Dulce Abril
          </h1>
          <p style={{ color: "#777", marginBottom: 0 }}>Verificando acceso...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div
        className="admin-page"
        style={{
          minHeight: "100vh",
          background: "#f8f3f1",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
          fontFamily: "DM Sans, Arial, sans-serif",
        }}
      >
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Playfair+Display:wght@500;600&display=swap');
          .admin-login-page, .admin-login-page * { box-sizing: border-box; }

        /* ===== RESUMEN COMO FILTROS ===== */
        .admin-summary {
          display:grid !important;
          grid-template-columns:repeat(6,minmax(0,1fr)) !important;
          gap:0 !important;
          margin:0 0 24px !important;
          border-top:1px solid #ead7d5;
          border-bottom:1px solid #ead7d5;
          background:transparent;
        }
        .admin-summary-card {
          appearance:none;
          -webkit-appearance:none;
          border:0 !important;
          border-radius:0 !important;
          background:transparent !important;
          min-height:88px !important;
          padding:16px 12px !important;
          display:flex !important;
          flex-direction:column !important;
          align-items:center !important;
          justify-content:center !important;
          gap:3px !important;
          position:relative;
          cursor:pointer;
          color:#8b7b7f;
          transition:background .2s ease;
          font-family:'DM Sans',Arial,sans-serif;
        }
        .admin-summary-card + .admin-summary-card::before {
          content:""; position:absolute; left:0; top:18px; bottom:18px; width:1px; background:#ead7d5;
        }
        .admin-summary-card:hover, .admin-summary-card.is-selected { background:rgba(150,93,109,.06) !important; }
        .admin-summary-card span { color:#8b7b7f !important; font-size:11px !important; line-height:1.2; letter-spacing:.08em; text-transform:uppercase; white-space:nowrap; }
        .admin-summary-card strong { color:#8d5966 !important; font-family:'Playfair Display',Georgia,serif !important; font-size:28px !important; line-height:1; font-weight:500 !important; }
        .admin-filter-buttons { display:none !important; }
        .admin-clear-filters-compact { margin-top:8px; border:0; background:transparent; color:#965d6d; font-family:'DM Sans',Arial,sans-serif; font-size:12px; cursor:pointer; text-decoration:underline; text-underline-offset:3px; }
        @media (max-width:700px) {
          .admin-summary { grid-template-columns:repeat(3,minmax(0,1fr)) !important; margin-bottom:20px !important; }
          .admin-summary-card { min-height:70px !important; padding:10px 5px !important; }
          .admin-summary-card span { font-size:8px !important; letter-spacing:.045em; }
          .admin-summary-card strong { font-size:22px !important; }
          .admin-summary-card:nth-child(n+4) { border-top:1px solid #ead7d5 !important; }
          .admin-summary-card:nth-child(3n+1)::before { display:none; }
          .admin-summary-card:nth-child(n+4)::before { top:12px; bottom:12px; }
        }
        `}</style>

        <form
          className="admin-login-page"
          onSubmit={iniciarSesion}
          style={{
            width: "100%",
            maxWidth: "420px",
            background: "#fff",
            border: "1px solid #eaded9",
            borderRadius: "22px",
            padding: "32px",
            boxShadow: "0 10px 35px rgba(0,0,0,.06)",
          }}
        >
          <div style={{ textAlign: "center", marginBottom: "28px" }}>
            <div
              style={{
                width: "58px",
                height: "58px",
                borderRadius: "50%",
                background: "#f4e9e5",
                color: "#8d5966",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 14px",
                fontSize: "25px",
              }}
            >
              🔐
            </div>

            <h1
              style={{
                margin: 0,
                color: "#8d5966",
                fontFamily: "Playfair Display, Georgia, serif",
                fontSize: "30px",
              }}
            >
              Dulce Abril
            </h1>

            <p style={{ color: "#777", margin: "8px 0 0", fontSize: "14px" }}>
              Acceso al panel de administración
            </p>
          </div>

          <label style={{ display: "block", marginBottom: "15px" }}>
            <span
              style={{
                display: "block",
                marginBottom: "7px",
                color: "#5f5558",
                fontSize: "13px",
                fontWeight: 600,
              }}
            >
              Correo electrónico
            </span>

            <input
              type="email"
              value={loginEmail}
              onChange={(e) => setLoginEmail(e.target.value)}
              placeholder="tu correo"
              autoComplete="email"
              required
              style={{
                width: "100%",
                minHeight: "48px",
                border: "1px solid #dfd1ce",
                borderRadius: "11px",
                padding: "12px 14px",
                fontSize: "15px",
                outline: "none",
              }}
            />
          </label>

          <label style={{ display: "block", marginBottom: "18px" }}>
            <span
              style={{
                display: "block",
                marginBottom: "7px",
                color: "#5f5558",
                fontSize: "13px",
                fontWeight: 600,
              }}
            >
              Contraseña
            </span>

            <input
              type="password"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              placeholder="Tu contraseña"
              autoComplete="current-password"
              required
              style={{
                width: "100%",
                minHeight: "48px",
                border: "1px solid #dfd1ce",
                borderRadius: "11px",
                padding: "12px 14px",
                fontSize: "15px",
                outline: "none",
              }}
            />
          </label>

          {loginError && (
            <div
              style={{
                background: "#fff0f0",
                border: "1px solid #f0caca",
                color: "#a33",
                borderRadius: "10px",
                padding: "11px 12px",
                fontSize: "13px",
                marginBottom: "16px",
              }}
            >
              {loginError}
            </div>
          )}

          <button
            type="submit"
            disabled={loginLoading}
            style={{
              width: "100%",
              border: "none",
              background: loginLoading ? "#b99aa3" : "#8d5966",
              color: "#fff",
              padding: "13px 18px",
              borderRadius: "12px",
              cursor: loginLoading ? "default" : "pointer",
              fontSize: "15px",
              fontWeight: 600,
            }}
          >
            {loginLoading ? "Ingresando..." : "Ingresar al panel"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div
      className="admin-page"
      style={{
        minHeight: "100vh",
        background: "#f8f3f1",
        padding: "40px 20px",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Playfair+Display:wght@500;600&display=swap');

        .admin-page,
        .admin-page * {
          font-family: 'DM Sans', Arial, Helvetica, sans-serif;
        }

        .admin-page h1,
        .admin-page h2,
        .admin-page h3 {
          font-family: 'Playfair Display', Georgia, serif;
        }

        .admin-page * {
          box-sizing: border-box;
        }

        .admin-panel {
          width: 100%;
        }

        .admin-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 20px;
          margin-bottom: 30px;
          flex-wrap: wrap;
        }

        .admin-add-button {
          white-space: nowrap;
        }

        .admin-summary {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 10px;
          margin-bottom: 12px;
        }

        .admin-instagram-manager {
          border: 1px solid #eaded9;
          border-radius: 18px;
          padding: 22px;
          background: linear-gradient(135deg, #fffaf8, #fff4f2);
        }
        .admin-instagram-manager-head {
          display:flex; justify-content:space-between; align-items:flex-start; gap:18px; margin-bottom:18px;
        }
        .admin-instagram-eyebrow {
          display:block; color:#9b6071; font-size:9px; letter-spacing:.24em; font-weight:700; margin-bottom:7px;
        }
        .admin-instagram-manager h2 { margin:0 0 6px; color:#30292b; font-size:28px; }
        .admin-instagram-manager-head p { margin:0; color:#756b6d; font-size:12px; line-height:1.6; max-width:620px; }
        .admin-instagram-new { border:1px solid #dfc5ca; background:#fff; color:#8f5969; border-radius:999px; padding:10px 15px; font-weight:700; cursor:pointer; white-space:nowrap; }
        .admin-instagram-form { border:1px solid #eaded9; border-radius:15px; padding:18px; background:#fff; margin-bottom:18px; }
        .admin-instagram-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:14px; }
        .admin-instagram-current-image { display:block; margin-top:6px; color:#8a7b7e; font-size:11px; }
        .admin-instagram-list { display:grid; gap:10px; }
        .admin-instagram-empty { margin:0; padding:18px; border:1px dashed #dfc5ca; border-radius:14px; color:#7c6f72; text-align:center; background:#fff; font-size:12px; }
        .admin-instagram-item { display:grid; grid-template-columns:52px 1fr auto; gap:14px; align-items:center; padding:12px; border:1px solid #eee1de; border-radius:14px; background:#fff; }
        .admin-instagram-item-icon { width:52px; height:52px; display:grid; place-items:center; border:1px solid #ead9d8; border-radius:13px; background:#fff8f7; color:#9b6071; }
        .admin-instagram-item-icon svg { width:27px; height:27px; }
        .admin-instagram-item-info { min-width:0; display:grid; gap:3px; }
        .admin-instagram-item-info span { color:#9b6071; font-size:9px; text-transform:uppercase; letter-spacing:.12em; font-weight:700; }
        .admin-instagram-item-info strong { color:#30292b; font-size:13px; }
        .admin-instagram-item-info small { color:#756b6d; font-size:11px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .admin-instagram-item-actions { display:flex; gap:7px; }
        .admin-instagram-item-actions button { border:1px solid #ead9d8; background:#fffaf8; color:#825264; border-radius:9px; padding:8px 10px; cursor:pointer; font-size:11px; }
        .admin-instagram-help { display:block; margin-top:7px; color:#8a7b7e; font-size:11px; line-height:1.5; }
        .admin-instagram-url-note { margin:0 0 14px; padding:10px 12px; border-radius:10px; background:#fff7f5; border:1px solid #f0dfdc; color:#756b6d; font-size:11px; line-height:1.5; }
        .admin-instagram-url-note strong { color:#825264; }
        @media (max-width: 700px) {
          .admin-instagram-manager { padding:16px; }
          .admin-instagram-manager-head { flex-direction:column; }
          .admin-instagram-new { width:100%; }
          .admin-instagram-grid { grid-template-columns:1fr; }
          .admin-instagram-item { grid-template-columns:52px 1fr; }
          .admin-instagram-item-actions { grid-column:1 / -1; }
          .admin-instagram-item-actions button { flex:1; }
        }

        .admin-products-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 20px;
        }

        .admin-product-card {
          min-width: 0;
          height: 100%;
          display: flex;
          flex-direction: column;
        }

        .admin-product-content {
          flex: 1 1 auto;
          display: flex;
          flex-direction: column;
        }

        .admin-product-actions {
          margin-top: auto !important;
          align-items: stretch;
        }

        .admin-product-actions button {
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          text-align: center !important;
          line-height: 1 !important;
          box-sizing: border-box !important;
          margin: 0 !important;
        }

        .admin-product-image {
          width: 100%;
          height: 190px;
          object-fit: cover;
          display: block;
        }

        .admin-form-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 15px;
        }

        .admin-form-actions,
        .admin-product-actions {
          display: flex;
          gap: 8px;
        }

        .admin-search-filters {
          background: #faf7f5;
          border: 1px solid #eaded9;
          border-radius: 16px;
          padding: 12px;
          margin-bottom: 12px;
        }

        .admin-search-row {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 220px;
          gap: 10px;
          margin-bottom: 12px;
        }

        .admin-search-input,
        .admin-category-select {
          width: 100%;
          min-height: 40px;
          border: 1px solid #ddd0ca;
          border-radius: 10px;
          background: #fff;
          padding: 10px 12px;
          font-size: 15px;
          color: #333;
          outline: none;
        }

        .admin-filter-buttons {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          align-items: center;
        }

        .admin-filter-button {
          border: 1px solid #d9c4ca;
          background: #fff;
          color: #8d5966;
          padding: 8px 12px;
          border-radius: 20px;
          cursor: pointer;
          font-size: 13px;
        }

        .admin-filter-button.active {
          background: #8d5966;
          color: #fff;
          border-color: #8d5966;
        }

        .admin-clear-filters {
          border: none;
          background: transparent;
          color: #777;
          padding: 8px 4px;
          cursor: pointer;
          font-size: 13px;
        }

        .admin-results-count {
          margin: 0 0 18px;
          color: #777;
          font-size: 14px;
        }

        .admin-form {
          scroll-margin-top: 18px;
        }

        .admin-form-title {
          margin: 0;
          color: #332a2d;
          font-size: 30px;
          font-weight: 500;
        }

        .admin-form-subtitle {
          margin: 8px 0 22px;
          color: #776d6f;
          font-size: 14px;
          line-height: 1.5;
        }

        .admin-field {
          display: flex;
          flex-direction: column;
          gap: 7px;
        }

        .admin-field-label {
          color: #5f5558;
          font-size: 12px;
          font-weight: 600;
          letter-spacing: .02em;
        }

        .admin-form-input,
        .admin-form-select {
          width: 100%;
          min-height: 48px;
          border: 1px solid #dfd1ce;
          border-radius: 11px;
          background: #fff;
          color: #332a2d;
          padding: 12px 14px;
          font-family: 'DM Sans', Arial, sans-serif;
          font-size: 14px;
          outline: none;
          transition: border-color .2s ease, box-shadow .2s ease;
        }

        .admin-form-input:focus,
        .admin-form-select:focus {
          border-color: #a36a78;
          box-shadow: 0 0 0 3px rgba(141, 89, 102, .10);
        }
        .admin-stock-input {
          text-align:center;
          font-variant-numeric:tabular-nums;
        }
        .admin-stock-input::-webkit-inner-spin-button,
        .admin-stock-input::-webkit-outer-spin-button {
          -webkit-appearance:none;
          margin:0;
        }

        .admin-file-field {
          grid-column: 1 / -1;
        }

        .admin-description-field {
          grid-column: 1 / -1;
        }

        .admin-description-input {
          min-height: 150px !important;
          height: 150px !important;
          resize: vertical;
          line-height: 1.55;
          font-family: 'DM Sans', Arial, sans-serif;
          box-sizing: border-box;
          overflow-y: auto;
          white-space: pre-wrap;
        }

        @media (max-width: 820px) {
          .admin-description-input {
            min-height: 280px !important;
            height: 280px !important;
            max-height: 55vh;
            overflow-y: auto;
            -webkit-overflow-scrolling: touch;
          }
        }

        .admin-field-help {
          color: #8a7d80;
          font-size: 12px;
          line-height: 1.45;
        }

        .admin-file-input {
          width: 100%;
          min-height: 48px;
          border: 1px dashed #d5c1c4;
          border-radius: 11px;
          background: #fff;
          padding: 8px;
          color: #776d6f;
          font-family: 'DM Sans', Arial, sans-serif;
          font-size: 13px;
        }

        .admin-file-input::file-selector-button {
          border: 0;
          border-radius: 8px;
          background: #f1e3e5;
          color: #8d5966;
          padding: 9px 12px;
          margin-right: 10px;
          cursor: pointer;
          font-family: 'DM Sans', Arial, sans-serif;
          font-weight: 600;
        }

        .admin-image-preview {
          margin-top: 10px;
          width: 86px;
          height: 86px;
          border-radius: 10px;
          object-fit: cover;
          border: 1px solid #ead9d8;
        }

        .admin-checks {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
          margin-top: 18px;
        }

        .admin-check {
          display: flex;
          align-items: center;
          gap: 10px;
          min-height: 48px;
          padding: 10px 12px;
          border: 1px solid #ead9d8;
          border-radius: 11px;
          background: #fff;
          color: #5f5558;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
        }

        .admin-check input {
          width: 18px;
          height: 18px;
          accent-color: #8d5966;
          cursor: pointer;
        }

        .admin-form-actions {
          margin-top: 20px;
          display: flex;
          gap: 10px;
          justify-content: flex-end;
        }

        .admin-form-cancel,
        .admin-form-submit {
          min-height: 46px;
          padding: 11px 20px;
          border-radius: 11px;
          cursor: pointer;
          font-family: 'DM Sans', Arial, sans-serif;
          font-size: 13px;
          font-weight: 600;
        }

        .admin-form-cancel {
          border: 1px solid #d8cbca;
          background: #fff;
          color: #6c6164;
        }

        .admin-form-submit {
          border: 1px solid #8d5966;
          background: #8d5966;
          color: #fff;
        }

        .admin-form-submit:hover {
          background: #7e4d5a;
        }

        .admin-editing-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          margin-bottom: 10px;
          padding: 6px 10px;
          border-radius: 999px;
          background: #f3e6e8;
          color: #8d5966;
          font-size: 10.5px;
          font-weight: 600;
        }

        .admin-form-heading {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 18px;
          margin-bottom: 22px;
          padding-bottom: 18px;
          border-bottom: 1px solid #eaded9;
        }

        .admin-form-heading-icon {
          width: 42px;
          height: 42px;
          flex: 0 0 42px;
          display: grid;
          place-items: center;
          border-radius: 14px;
          background: #f3e6e8;
          color: #8d5966;
          font-size: 20px;
        }

        .admin-image-preview-wrap {
          display: inline-flex;
          flex-direction: column;
          gap: 6px;
          margin-top: 10px;
          color: #8d5966;
          font-size: 10.5px;
          font-weight: 600;
        }

        .admin-image-preview {
          margin-top: 0;
          width: 104px;
          height: 104px;
          border-radius: 14px;
          object-fit: cover;
          border: 1px solid #ead9d8;
          box-shadow: 0 4px 12px rgba(80, 45, 55, .08);
        }

        .admin-check {
          transition: border-color .2s ease, background .2s ease, transform .2s ease;
        }

        .admin-check:hover {
          border-color: #cbaab2;
          background: #fffafa;
          transform: translateY(-1px);
        }

        .admin-form-submit,
        .admin-form-cancel {
          transition: transform .2s ease, box-shadow .2s ease, background .2s ease;
        }

        .admin-form-submit:hover,
        .admin-form-cancel:hover {
          transform: translateY(-1px);
          box-shadow: 0 5px 14px rgba(80, 45, 55, .08);
        }

        /* ESCRITORIO: dashboard compacto y aprovechado */
        @media (min-width: 821px) {
          .admin-page {
            padding: 18px 14px !important;
          }

          .admin-panel > div {
            padding: 18px !important;
          }

          .admin-header {
            margin-bottom: 14px !important;
          }

          .admin-header h1 {
            font-size: 28px !important;
          }

          .admin-header p {
            font-size: 12px !important;
            margin-top: 3px !important;
          }

          .admin-add-button {
            padding: 8px 14px !important;
            font-size: 12px !important;
            min-height: 34px !important;
          }

          .admin-summary {
            gap: 7px !important;
            margin-bottom: 12px !important;
          }

          .admin-summary-card {
            padding: 8px !important;
            min-height: 58px !important;
          }

          .admin-summary-card div {
            font-size: 11px !important;
            margin-bottom: 1px !important;
          }

          .admin-summary-card strong {
            font-size: 20px !important;
          }

          .admin-search-filters {
            padding: 9px !important;
            margin-bottom: 12px !important;
          }

          .admin-search-row {
            gap: 7px !important;
            margin-bottom: 7px !important;
          }

          .admin-search-input,
          .admin-category-select {
            min-height: 34px !important;
            height: 34px !important;
            padding: 6px 9px !important;
            font-size: 12px !important;
          }

          .admin-filter-buttons {
            gap: 5px !important;
          }

          .admin-filter-button {
            min-height: 30px !important;
            padding: 5px 9px !important;
            font-size: 11px !important;
          }

          .admin-results-count {
            margin-bottom: 8px !important;
            font-size: 11px !important;
          }

          .admin-products-grid {
            gap: 10px !important;
          }

          .admin-product-image {
            height: 145px !important;
          }
        }

        /* CELULAR: ultra compacto, sin perder comodidad táctil */
        @media (max-width: 820px) {
          .admin-page {
            padding: 2px !important;
            background: #f8f3f1 !important;
          }

          .admin-panel {
            border-radius: 12px !important;
          }

          .admin-panel > div {
            padding: 10px !important;
            border-radius: 13px !important;
            box-shadow: none !important;
          }

          .admin-header {
            display: grid !important;
            grid-template-columns: minmax(0, 1fr) auto !important;
            align-items: center !important;
            gap: 8px !important;
            margin-bottom: 9px !important;
          }

          .admin-header h1 {
            font-size: 22px !important;
            line-height: 1 !important;
            text-align: left !important;
            white-space: nowrap;
          }

          .admin-header p {
            margin-top: 3px !important;
            font-size: 10px !important;
            text-align: left !important;
          }

          .admin-add-button {
            width: auto !important;
            margin-top: 0 !important;
            min-height: 34px !important;
            padding: 7px 10px !important;
            border-radius: 18px !important;
            font-size: 10px !important;
          }

          /* Estadísticas: 2x2, pero muy bajas */
          .admin-summary {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
            gap: 5px !important;
            margin-bottom: 9px !important;
          }

          .admin-summary-card {
            min-height: 47px !important;
            height: 47px !important;
            padding: 4px 6px !important;
            border-radius: 10px !important;
            display: flex !important;
            flex-direction: row !important;
            align-items: center !important;
            justify-content: space-between !important;
            text-align: left !important;
          }

          .admin-summary-card div {
            font-size: 10px !important;
            line-height: 1 !important;
            margin: 0 !important;
            white-space: nowrap;
          }

          .admin-summary-card strong {
            font-size: 17px !important;
            line-height: 1 !important;
          }

          .admin-search-filters {
            padding: 7px !important;
            margin-bottom: 8px !important;
            border-radius: 10px !important;
          }

          /* Buscador + categoría en una misma fila */
          .admin-search-row {
            grid-template-columns: minmax(0, 1.45fr) minmax(112px, .8fr) !important;
            gap: 5px !important;
            margin-bottom: 5px !important;
          }

          .admin-search-input,
          .admin-category-select {
            min-height: 34px !important;
            height: 34px !important;
            padding: 5px 7px !important;
            font-size: 10.5px !important;
            border-radius: 8px !important;
          }

          .admin-filter-buttons {
            display: grid !important;
            grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
            gap: 4px !important;
          }

          .admin-filter-button {
            width: 100% !important;
            min-height: 30px !important;
            height: 30px !important;
            padding: 3px 2px !important;
            border-radius: 15px !important;
            font-size: 9.5px !important;
            white-space: nowrap;
          }

          .admin-clear-filters {
            min-height: 22px !important;
            font-size: 9px !important;
            padding: 1px !important;
          }

          .admin-results-count {
            margin: 0 0 5px !important;
            font-size: 10px !important;
          }

          .admin-form {
            padding: 10px !important;
            margin-bottom: 8px !important;
            border-radius: 11px !important;
            scroll-margin-top: 6px !important;
          }

          .admin-form-title {
            font-size: 19px !important;
          }

          .admin-form-subtitle {
            margin: 3px 0 8px !important;
            font-size: 11px !important;
          }

          .admin-form-grid {
            gap: 6px !important;
          }

          .admin-field {
            gap: 4px !important;
          }

          .admin-field-label {
            font-size: 9.5px !important;
          }

          .admin-form-input,
          .admin-form-select {
            min-height: 35px !important;
            height: 35px !important;
            padding: 6px 8px !important;
            font-size: 11px !important;
            border-radius: 8px !important;
          }

          .admin-checks {
            gap: 5px !important;
            margin-top: 7px !important;
          }

          .admin-check {
            min-height: 32px !important;
            padding: 5px 7px !important;
            gap: 6px !important;
            font-size: 10px !important;
            border-radius: 8px !important;
          }

          .admin-check input {
            width: 15px !important;
            height: 15px !important;
          }

          .admin-form-actions {
            margin-top: 8px !important;
            gap: 5px !important;
          }

          .admin-form-cancel,
          .admin-form-submit {
            min-height: 35px !important;
            padding: 6px 10px !important;
            font-size: 11px !important;
            border-radius: 8px !important;
          }

          .admin-products-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
            gap: 6px !important;
          }

          .admin-product-image {
            height: 105px !important;
          }

          .admin-product-content {
            padding: 7px !important;
          }

          .admin-product-actions {
            gap: 4px !important;
          }

          .admin-product-actions button {
            min-height: 32px !important;
            font-size: 10px !important;
            padding: 5px 6px !important;
          }

          .admin-editing-badge {
            margin-bottom: 5px !important;
            padding: 4px 6px !important;
            font-size: 9px !important;
          }
        }

        /* TARJETAS DE PRODUCTO: compactas y orientadas a administración */
        .admin-product-card {
          transition: transform .18s ease, box-shadow .18s ease;
        }

        .admin-product-card:hover {
          transform: translateY(-1px);
          box-shadow: 0 5px 16px rgba(80, 45, 55, .07);
        }

        @media (min-width: 821px) {
          .admin-product-image {
            height: 125px !important;
          }

          .admin-product-content {
            padding: 10px !important;
          }

          .admin-product-content > div:first-child {
            font-size: 11px !important;
            margin-bottom: 3px !important;
          }

          .admin-product-content h3 {
            font-size: 17px !important;
            line-height: 1.15 !important;
            margin: 0 0 5px !important;
          }

          .admin-product-content strong {
            font-size: 17px !important;
            margin-bottom: 4px !important;
          }

          .admin-product-content p {
            font-size: 11px !important;
            margin: 0 0 7px !important;
          }

          .admin-product-content > div:nth-last-child(2) {
            gap: 4px !important;
            margin-bottom: 7px !important;
          }

          .admin-product-content > div:nth-last-child(2) span {
            font-size: 10px !important;
            padding: 4px 6px !important;
            border-radius: 8px !important;
          }

          .admin-product-actions button {
            min-height: 30px !important;
            padding: 5px 7px !important;
            border-radius: 8px !important;
            font-size: 11px !important;
          }
        }

        @media (max-width: 820px) {
          .admin-product-image {
            height: 82px !important;
          }

          .admin-product-content {
            padding: 6px !important;
          }

          .admin-product-content > div:first-child {
            font-size: 9px !important;
            line-height: 1 !important;
            margin-bottom: 3px !important;
          }

          .admin-product-content h3 {
            font-size: 15px !important;
            line-height: 1.12 !important;
            margin: 0 0 4px !important;
          }

          .admin-product-content strong {
            font-size: 16px !important;
            line-height: 1.05 !important;
            margin-bottom: 3px !important;
          }

          .admin-product-content p {
            font-size: 10px !important;
            line-height: 1.1 !important;
            margin: 0 0 6px !important;
          }

          .admin-product-content > div:nth-last-child(2) {
            gap: 3px !important;
            margin-bottom: 6px !important;
          }

          .admin-product-content > div:nth-last-child(2) span {
            font-size: 8.5px !important;
            line-height: 1 !important;
            padding: 4px 5px !important;
            border-radius: 7px !important;
          }

          .admin-product-actions {
            gap: 3px !important;
          }

          .admin-product-actions button {
            min-height: 29px !important;
            height: 29px !important;
            padding: 4px 5px !important;
            border-radius: 8px !important;
            font-size: 9.5px !important;
          }
        }

        @media (max-width: 480px) {
          .admin-product-image {
            height: 76px !important;
          }

          .admin-product-content {
            padding: 5px !important;
          }

          .admin-product-content h3 {
            font-size: 14px !important;
          }

          .admin-product-content strong {
            font-size: 15px !important;
          }

          .admin-product-content p {
            font-size: 9.5px !important;
            margin-bottom: 5px !important;
          }

          .admin-product-content > div:nth-last-child(2) span {
            font-size: 8px !important;
            padding: 3px 4px !important;
          }

          .admin-product-actions button {
            min-height: 27px !important;
            height: 27px !important;
            font-size: 9px !important;
          }
        }

        @media (max-width: 480px) {
          .admin-panel > div {
            padding: 9px !important;
          }

          .admin-header h1 {
            font-size: 21px !important;
          }

          .admin-add-button {
            font-size: 9.5px !important;
            padding: 7px 9px !important;
          }

          .admin-summary-card {
            min-height: 44px !important;
            height: 44px !important;
            padding: 4px 7px !important;
          }

          .admin-summary-card div {
            font-size: 9.5px !important;
          }

          .admin-summary-card strong {
            font-size: 16px !important;
          }

          .admin-search-row {
            grid-template-columns: minmax(0, 1fr) 112px !important;
          }

          .admin-filter-button {
            font-size: 9px !important;
          }

          .admin-product-image {
            height: 100px !important;
          }
        }
        /* V7 - ESCRITORIO MÁS ANCHO Y SIN "CAJA" GIGANTE */
        @media (min-width: 821px) {
          .admin-page {
            padding: 14px 18px !important;
          }

          .admin-panel {
            max-width: 1200px !important;
          }

          .admin-panel > div {
            padding: 10px 4px !important;
            background: transparent !important;
            box-shadow: none !important;
            border-radius: 0 !important;
          }

          .admin-products-section {
            border-top: 1px solid #eaded9 !important;
          }

          .admin-products-grid {
            grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
            gap: 12px !important;
          }
        }

        /* V6 - CABECERA Y FILTROS MÁS COMPACTOS */
        .admin-products-section > h2 {
          margin-bottom: 6px !important;
          font-size: 25px !important;
          line-height: 1.05 !important;
        }

        @media (min-width: 821px) {
          .admin-products-section {
            padding-top: 12px !important;
          }

          .admin-products-section > h2 {
            font-size: 22px !important;
          }
        }

        @media (max-width: 820px) {
          .admin-page {
            padding: 0 !important;
          }

          .admin-panel > div {
            padding: 8px !important;
            border-radius: 10px !important;
          }

          .admin-header {
            gap: 6px !important;
            margin-bottom: 6px !important;
          }

          .admin-header h1 {
            font-size: 20px !important;
            line-height: .95 !important;
          }

          .admin-header p {
            margin-top: 2px !important;
            font-size: 9px !important;
          }

          .admin-add-button {
            min-height: 31px !important;
            padding: 6px 9px !important;
            font-size: 9.5px !important;
            border-radius: 16px !important;
          }

          /* Las 4 estadísticas pasan a una sola fila */
          .admin-summary {
            grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
            gap: 4px !important;
            margin-bottom: 6px !important;
          }

          .admin-summary-card {
            min-width: 0 !important;
            height: 36px !important;
            min-height: 36px !important;
            padding: 3px 5px !important;
            border-radius: 8px !important;
          }

          .admin-summary-card div {
            font-size: 8px !important;
            overflow: hidden !important;
            text-overflow: ellipsis !important;
          }

          .admin-summary-card strong {
            font-size: 14px !important;
          }

          .admin-search-filters {
            padding: 5px !important;
            margin-bottom: 6px !important;
            border-radius: 9px !important;
          }

          .admin-search-row {
            grid-template-columns: minmax(0, 1.55fr) minmax(105px, .8fr) !important;
            gap: 4px !important;
            margin-bottom: 4px !important;
          }

          .admin-search-input,
          .admin-category-select {
            min-height: 30px !important;
            height: 30px !important;
            padding: 4px 6px !important;
            font-size: 9.5px !important;
            border-radius: 7px !important;
          }

          .admin-filter-buttons {
            gap: 3px !important;
          }

          .admin-filter-button {
            min-height: 27px !important;
            height: 27px !important;
            padding: 2px 2px !important;
            border-radius: 13px !important;
            font-size: 8.5px !important;
          }

          .admin-products-section {
            padding-top: 7px !important;
          }

          .admin-products-section > h2 {
            font-size: 22px !important;
            margin: 0 0 3px !important;
            line-height: 1 !important;
          }

          .admin-results-count {
            margin: 0 0 4px !important;
            font-size: 9px !important;
          }
        }

        @media (max-width: 480px) {
          .admin-summary-card {
            height: 34px !important;
            min-height: 34px !important;
            padding: 3px 4px !important;
          }

          .admin-summary-card div {
            font-size: 7.5px !important;
          }

          .admin-summary-card strong {
            font-size: 13px !important;
          }

          .admin-search-row {
            grid-template-columns: minmax(0, 1fr) 108px !important;
          }

          .admin-search-input,
          .admin-category-select {
            min-height: 29px !important;
            height: 29px !important;
            font-size: 9px !important;
          }

          .admin-filter-button {
            min-height: 26px !important;
            height: 26px !important;
            font-size: 8px !important;
          }

          .admin-products-section > h2 {
            font-size: 21px !important;
          }
        }

        /* V5 - TARJETAS DE PRODUCTO ULTRA COMPACTAS */
        @media (min-width: 821px) {
          .admin-products-grid { grid-template-columns: repeat(4, minmax(0, 1fr)) !important; gap: 8px !important; }
          .admin-product-image { height: 125px !important; }
          .admin-product-content { padding: 8px !important; }
          .admin-product-content > div:first-child { font-size: 10px !important; margin-bottom: 2px !important; }
          .admin-product-content h3 { font-size: 14px !important; line-height: 1.1 !important; margin: 0 0 4px !important; }
          .admin-product-content strong { font-size: 15px !important; margin-bottom: 3px !important; }
          .admin-product-content p { font-size: 10px !important; margin: 0 0 5px !important; }
          .admin-product-content > div:nth-last-child(2) { gap: 3px !important; margin-bottom: 5px !important; }
          .admin-product-content > div:nth-last-child(2) span { font-size: 8.5px !important; padding: 3px 5px !important; border-radius: 7px !important; }
          .admin-product-actions { gap: 4px !important; }
          .admin-product-actions button { min-height: 27px !important; height: 27px !important; padding: 4px 5px !important; border-radius: 7px !important; font-size: 10px !important; }
        }
        @media (max-width: 820px) {
          .admin-products-grid { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; gap: 5px !important; }
          .admin-product-image { height: 70px !important; }
          .admin-product-content { padding: 5px !important; }
          .admin-product-content > div:first-child { font-size: 8px !important; line-height: 1 !important; margin-bottom: 2px !important; }
          .admin-product-content h3 { font-size: 12.5px !important; line-height: 1.08 !important; margin: 0 0 3px !important; }
          .admin-product-content strong { font-size: 14px !important; line-height: 1 !important; margin-bottom: 3px !important; }
          .admin-product-content p { font-size: 9px !important; line-height: 1 !important; margin: 0 0 4px !important; }
          .admin-product-content > div:nth-last-child(2) { gap: 2px !important; margin-bottom: 4px !important; }
          .admin-product-content > div:nth-last-child(2) span { font-size: 7.5px !important; line-height: 1 !important; padding: 3px 4px !important; border-radius: 6px !important; }
          .admin-product-actions { gap: 3px !important; }
          .admin-product-actions button { min-height: 25px !important; height: 25px !important; padding: 3px 4px !important; border-radius: 7px !important; font-size: 8.5px !important; }
        }
        @media (max-width: 480px) {
          .admin-product-image { height: 64px !important; }
          .admin-product-content { padding: 4px !important; }
          .admin-product-content h3 { font-size: 11.5px !important; }
          .admin-product-content strong { font-size: 13px !important; }
          .admin-product-content p { font-size: 8.5px !important; }
          .admin-product-content > div:nth-last-child(2) span { font-size: 7px !important; padding: 2px 3px !important; }
          .admin-product-actions button { min-height: 24px !important; height: 24px !important; font-size: 8px !important; }
        }

        /* NUEVO DISEÑO DULCE ABRIL */
        .admin-page {
          font-family: 'DM Sans', Arial, Helvetica, sans-serif !important;
        }
        .admin-page h1,
        .admin-page h2,
        .admin-page h3 {
          font-family: 'Playfair Display', Georgia, serif !important;
        }

        .admin-brand {
          display:flex;
          align-items:center;
          gap:12px;
        }
        .admin-brand-logo {
          width:44px;
          height:44px;
          object-fit:contain;
          display:block;
        }
        .admin-brand h1 {
          font-family:'Playfair Display', Georgia, serif !important;
          font-weight:500 !important;
          letter-spacing:-.02em;
        }

        .admin-top-actions {
          display:flex;
          align-items:center;
          gap:10px;
        }
        .admin-account-button,
        .admin-add-button {
          min-height:40px !important;
          padding:0 16px !important;
          border-radius:12px !important;
          font-family:'DM Sans',Arial,sans-serif !important;
          font-size:13px !important;
          font-weight:500 !important;
          cursor:pointer;
          transition:all .2s ease;
        }
        .admin-account-button {
          border:1px solid #e0d0d4 !important;
          background:#fff !important;
          color:#765f66 !important;
        }
        .admin-account-button:hover {
          background:#fff9f8 !important;
          border-color:#cdaeb7 !important;
        }
        .admin-add-button {
          border:1px solid #965d6d !important;
          background:#965d6d !important;
          color:#fff !important;
          box-shadow:0 4px 12px rgba(150,93,109,.16);
        }
        .admin-add-button:hover {
          background:#875262 !important;
          transform:translateY(-1px);
        }

        .admin-summary {
          display:flex !important;
          align-items:stretch;
          gap:0 !important;
          border-top:1px solid #ead7d5;
          border-bottom:1px solid #ead7d5;
          background:transparent !important;
          margin:0 0 22px !important;
        }
        .admin-summary-card {
          flex:1;
          min-height:66px !important;
          padding:12px 18px !important;
          border:0 !important;
          border-radius:0 !important;
          background:transparent !important;
          display:flex;
          flex-direction:column;
          justify-content:center;
          position:relative;
        }
        .admin-summary-card + .admin-summary-card::before {
          content:"";
          position:absolute;
          left:0;
          top:16px;
          bottom:16px;
          width:1px;
          background:#ead7d5;
        }
        .admin-summary-card div {
          color:#8b7b7f !important;
          font-size:10px !important;
          letter-spacing:.08em;
          text-transform:uppercase;
        }
        .admin-summary-card strong {
          color:#8d5966 !important;
          font-family:'Playfair Display', Georgia, serif !important;
          font-size:24px !important;
          font-weight:500 !important;
        }

        .admin-search-filters {
          background:transparent !important;
          border:0 !important;
          padding:0 !important;
          margin-bottom:22px !important;
        }
        .admin-search-row {
          display:flex !important;
          align-items:center;
          gap:8px !important;
          margin-bottom:12px !important;
        }
        .admin-search-trigger {
          width:42px;
          height:42px;
          flex:0 0 42px;
          border:1px solid #dfd1ce;
          border-radius:50%;
          background:#fff;
          color:#8d5966;
          cursor:pointer;
          font-size:19px;
          display:grid;
          place-items:center;
          transition:.2s ease;
        }
        .admin-search-trigger:hover {
          border-color:#b98b97;
          background:#fffafa;
        }
        .admin-search-input {
          min-height:42px !important;
          border-radius:999px !important;
          max-width:440px;
          transition:all .2s ease;
        }
        .admin-search-input.admin-search-hidden {
          width:0;
          min-width:0;
          max-width:0;
          opacity:0;
          padding-left:0;
          padding-right:0;
          border-color:transparent;
          overflow:hidden;
          pointer-events:none;
        }
        .admin-search-close {
          width:38px;
          height:38px;
          flex:0 0 38px;
          border:1px solid #dfd1ce;
          border-radius:50%;
          background:#fff;
          color:#8d5966;
          cursor:pointer;
          font-size:22px;
          line-height:1;
        }
        .admin-category-select {
          width:auto !important;
          min-width:190px;
          min-height:42px !important;
          border-radius:999px !important;
          margin-left:auto;
        }

        .admin-filter-buttons {
          gap:7px !important;
        }
        .admin-filter-button {
          border:1px solid #ead7d5 !important;
          background:#fff !important;
          color:#80666d !important;
          border-radius:999px !important;
          padding:8px 13px !important;
          font-size:11px !important;
        }
        .admin-filter-button.active {
          background:#965d6d !important;
          border-color:#965d6d !important;
          color:#fff !important;
        }

        .admin-product-card {
          border:1px solid #ead7d5 !important;
          border-radius:18px !important;
          background:#fff !important;
          box-shadow:0 5px 18px rgba(90,50,60,.045);
          transition:transform .2s ease, box-shadow .2s ease;
        }
        .admin-product-card:hover {
          transform:translateY(-2px);
          box-shadow:0 10px 25px rgba(90,50,60,.08);
        }
        .admin-product-content {
          padding:15px !important;
        }
        .admin-product-content h3 {
          font-family:'Playfair Display', Georgia, serif !important;
          font-weight:500 !important;
        }

        .admin-bottom-nav {
          display:none;
        }

        @media (max-width:820px) {
          .admin-page {
            padding:0 0 78px !important;
          }
          .admin-panel {
            width:100% !important;
          }
          .admin-panel > div {
            padding:14px 12px 18px !important;
            border-radius:0 !important;
            background:#fcf8f6 !important;
          }
          .admin-header {
            margin-bottom:16px !important;
            padding:4px 2px 0 !important;
          }
          .admin-brand {
            gap:9px;
          }
          .admin-brand-logo {
            width:38px;
            height:38px;
          }
          .admin-brand h1 {
            font-size:24px !important;
          }
          .admin-brand p {
            font-size:10px !important;
          }
          .admin-top-actions .admin-account-button {
            display:none;
          }
          .admin-top-actions .admin-add-button {
            display:none;
          }

          .admin-summary {
            margin-bottom:18px !important;
          }
          .admin-summary-card {
            min-height:56px !important;
            padding:9px 7px !important;
            text-align:center;
          }
          .admin-summary-card + .admin-summary-card::before {
            top:12px;
            bottom:12px;
          }
          .admin-summary-card div {
            font-size:8px !important;
            letter-spacing:.04em;
          }
          .admin-summary-card strong {
            font-size:19px !important;
          }

          .admin-search-row {
            display:none !important;
            margin-bottom:10px !important;
          }
          .admin-search-filters.search-is-open .admin-search-row {
            display:flex !important;
            padding:0 0 4px;
          }
          .admin-search-close {
            width:40px;
            height:40px;
            flex-basis:40px;
          }
          .admin-search-trigger {
            display:none !important;
          }
          .admin-search-input {
            max-width:none !important;
            flex:1 !important;
            min-width:0 !important;
            width:100% !important;
            opacity:1 !important;
            pointer-events:auto !important;
          }
          .admin-search-input.admin-search-hidden {
            width:100% !important;
            min-width:0 !important;
            max-width:none !important;
            opacity:1 !important;
            padding-left:12px !important;
            padding-right:12px !important;
            border-color:#dfd1ce !important;
            pointer-events:auto !important;
          }
          .admin-category-select {
            display:none !important;
          }
          .admin-filter-buttons {
            flex-wrap:nowrap !important;
            overflow-x:auto;
            padding-bottom:4px;
            scrollbar-width:none;
          }
          .admin-filter-buttons::-webkit-scrollbar {
            display:none;
          }
          .admin-filter-button {
            flex:0 0 auto;
            padding:7px 11px !important;
          }
          .admin-clear-filters {
            flex:0 0 auto;
          }

          .admin-products-section {
            border-top:0 !important;
            padding-top:4px !important;
          }
          .admin-products-section > h2 {
            font-size:25px !important;
            margin:0 0 4px !important;
          }
          .admin-products-grid {
            grid-template-columns:repeat(2,minmax(0,1fr)) !important;
            gap:9px !important;
          }
          .admin-product-image {
            height:145px !important;
          }
          .admin-product-content {
            padding:11px !important;
          }
          .admin-product-actions {
            gap:5px !important;
          }
          .admin-product-actions button {
            min-width:0;
            padding:8px 4px !important;
            border-radius:9px !important;
            font-size:9px !important;
          }

          .admin-bottom-nav {
            position:fixed;
            display:grid;
            grid-template-columns:repeat(4,1fr);
            left:0;
            right:0;
            bottom:0;
            z-index:100;
            height:68px;
            padding:7px 8px calc(7px + env(safe-area-inset-bottom));
            background:rgba(255,250,248,.97);
            border-top:1px solid #ead7d5;
            box-shadow:0 -5px 22px rgba(80,45,55,.08);
            backdrop-filter:blur(12px);
          }
          .admin-bottom-nav button {
            border:0;
            background:transparent;
            color:#75676b;
            display:flex;
            flex-direction:column;
            align-items:center;
            justify-content:center;
            gap:2px;
            font-family:'DM Sans',Arial,sans-serif;
            font-size:10px;
            cursor:pointer;
          }
          .admin-bottom-nav button span:first-child {
            font-size:20px;
            line-height:1;
          }
          .admin-bottom-nav button.primary {
            color:#965d6d;
            font-weight:600;
          }
        }


        /* =========================================================
           DULCE ABRIL — CORRECCIÓN MÓVIL DEL RESUMEN
           Las 6 estadísticas deben formar una grilla 3 x 2.
           Evita que los textos se superpongan en celulares.
           PC no se modifica.
           ========================================================= */
        @media (max-width: 820px) {
          .admin-summary {
            display: grid !important;
            grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
            gap: 0 !important;
            width: 100% !important;
            overflow: hidden !important;
          }

          .admin-summary-card {
            flex: none !important;
            width: auto !important;
            min-width: 0 !important;
            min-height: 56px !important;
            height: 56px !important;
            padding: 8px 5px !important;
            display: flex !important;
            flex-direction: column !important;
            align-items: center !important;
            justify-content: center !important;
            text-align: center !important;
            border-radius: 0 !important;
            overflow: hidden !important;
          }

          .admin-summary-card:nth-child(n+4) {
            border-top: 1px solid #ead7d5 !important;
          }

          .admin-summary-card:nth-child(3n+1)::before {
            display: none !important;
          }

          .admin-summary-card div,
          .admin-summary-card span {
            display: block !important;
            max-width: 100% !important;
            overflow: hidden !important;
            text-overflow: ellipsis !important;
            white-space: nowrap !important;
            font-size: 8px !important;
            line-height: 1.15 !important;
            letter-spacing: .035em !important;
          }

          .admin-summary-card strong {
            display: block !important;
            margin-top: 3px !important;
            font-size: 20px !important;
            line-height: 1 !important;
          }
        }

        @media (max-width: 480px) {
          .admin-summary-card {
            min-height: 53px !important;
            height: 53px !important;
            padding: 7px 3px !important;
          }

          .admin-summary-card div,
          .admin-summary-card span {
            font-size: 7.5px !important;
          }

          .admin-summary-card strong {
            font-size: 19px !important;
          }
        }

            /* ENCABEZADO FINAL: logo grande, centrado y título debajo */
        .admin-header {
          position: relative !important;
          display: flex !important;
          justify-content: center !important;
          align-items: center !important;
          min-height: 132px !important;
          margin-bottom: 22px !important;
        }
        .admin-brand {
          width: 100% !important;
          display: flex !important;
          flex-direction: column !important;
          align-items: center !important;
          justify-content: center !important;
          gap: 8px !important;
          text-align: center !important;
        }
        .admin-brand-logo {
          width: 88px !important;
          height: 88px !important;
          object-fit: contain !important;
        }
        .admin-brand p {
          margin: 0 !important;
          color: #786b6e !important;
          font-family: 'DM Sans', Arial, sans-serif !important;
          font-size: 16px !important;
          font-weight: 500 !important;
          letter-spacing: .02em !important;
          text-align: center !important;
        }
        .admin-top-actions {
          position: absolute !important;
          right: 0 !important;
          top: 0 !important;
        }
        @media (max-width: 820px) {
          .admin-header {
            display: flex !important;
            min-height: 126px !important;
            margin-bottom: 16px !important;
            justify-content: center !important;
          }
          .admin-brand-logo {
            width: 82px !important;
            height: 82px !important;
          }
          .admin-brand p {
            font-size: 14px !important;
          }
          .admin-top-actions {
            position: absolute !important;
            right: 0 !important;
            top: 0 !important;
          }
        }
            /* =========================================================
               DULCE ABRIL — DESCRIPCIÓN MÓVIL FINAL
               Esta regla va al final para evitar que la regla general
               .admin-form-input de móvil vuelva a reducir el textarea.
               ========================================================= */
            @media (max-width: 820px) {
              .admin-field.admin-description-field .admin-description-input {
                width: 100% !important;
                min-height: 220px !important;
                height: 220px !important;
                max-height: 50vh !important;
                padding: 12px 14px !important;
                font-size: 14px !important;
                line-height: 1.55 !important;
                box-sizing: border-box !important;
                overflow-y: auto !important;
                resize: vertical !important;
                white-space: pre-wrap !important;
              }
            }

            /* =========================================================
               DULCE ABRIL — ADMIN: SECCIONES DESPLEGABLES
               Solo organiza visualmente Instagram, Categorías y Productos.
               ========================================================= */
            .admin-accordion-section {
              margin-bottom: 16px;
              border: 1px solid #eaded9;
              border-radius: 18px;
              background: #fff;
              overflow: hidden;
            }
            .admin-accordion-trigger {
              width: 100%;
              min-height: 62px;
              display: flex;
              align-items: center;
              justify-content: space-between;
              gap: 16px;
              padding: 16px 20px;
              border: 0;
              background: #fff;
              color: #332a2d;
              font-family: 'DM Sans', Arial, Helvetica, sans-serif;
              font-size: 16px;
              font-weight: 700;
              text-align: left;
              cursor: pointer;
              transition: background .18s ease;
            }
            .admin-accordion-trigger:hover {
              background: #fffaf8;
            }
            .admin-accordion-chevron {
              width: 30px;
              height: 30px;
              display: grid;
              place-items: center;
              flex: 0 0 30px;
              border: 1px solid #eaded9;
              border-radius: 50%;
              color: #8d5966;
              font-size: 18px;
              line-height: 1;
            }
            .admin-accordion-content {
              padding: 0 18px 18px;
            }
            .admin-accordion-content > .admin-instagram-manager {
              margin: 0 !important;
              border: 0 !important;
              border-radius: 0 !important;
              padding: 4px 4px 0 !important;
            }
            .admin-categories-inner {
              padding: 4px 4px 0;
            }
            .admin-products-accordion .admin-products-section {
              border-top: 0 !important;
              padding-top: 4px !important;
            }
            @media (max-width: 600px) {
              .admin-accordion-trigger {
                min-height: 58px;
                padding: 14px 16px;
                font-size: 15px;
              }
              .admin-accordion-content {
                padding: 0 10px 14px;
              }
            }
        /* AJUSTE PUNTUAL — botones del formulario en escritorio */
        @media (min-width: 821px) {
          .admin-form-cancel,
          .admin-form-submit {
            width: auto !important;
            min-width: 0 !important;
            flex: 0 0 auto !important;
            min-height: 34px !important;
            height: 34px !important;
            padding: 6px 12px !important;
            font-size: 11px !important;
            border-radius: 8px !important;
          }
        }
            `}

</style>
      <div
        className="admin-panel"
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
        }}
      >
        <div
          style={{
            background: "#ffffff",
            borderRadius: "20px",
            padding: "22px",
            boxShadow: "0 5px 25px rgba(0,0,0,0.06)",
          }}
        >
          {/* ENCABEZADO */}
          <div className="admin-header">
            <div className="admin-brand">
              <img
                className="admin-brand-logo"
                src="/dulce-abril-logo.png"
                alt="Dulce Abril"
              />
              <p>Administración de la tienda</p>
            </div>

            <div className="admin-top-actions">
              <button
                className="admin-account-button"
                type="button"
                onClick={cerrarSesion}
              >
                Cerrar sesión
              </button>

              <button
                className="admin-add-button"
                type="button"
                onClick={() => {
                  try { sessionStorage.removeItem(ADMIN_DRAFT_KEY); } catch {}
                  setEditingProduct(null);
                  setImagePreview("");
                  setForm({ ...emptyForm });
                  setShowForm(true);
                  setAdminSection("productos");
                }}
              >
                + Agregar producto
              </button>
            </div>
          </div>

          {/* RESUMEN / FILTROS */}
          <div className="admin-summary" aria-label="Filtros de productos">
            {[
              { label: "Productos", value: totalProducts, filter: "Todos" },
              { label: "Activos", value: activeProducts, filter: "Activos" },
              { label: "Ocultos", value: hiddenProducts, filter: "Ocultos" },
              { label: "Promociones", value: promotionProducts, filter: "Promociones" },
              { label: "Destacados", value: featuredProducts, filter: "Destacados" },
              { label: "Stock bajo", value: lowStockProducts, filter: "Stock bajo" },
            ].map((item) => (
              <button
                key={item.filter}
                type="button"
                className={`admin-summary-card ${activeFilter === item.filter ? "is-selected" : ""}`}
                onClick={() => setActiveFilter(item.filter)}
                aria-pressed={activeFilter === item.filter}
              >
                <span>{item.label}</span>
                <strong>{item.value}</strong>
              </button>
            ))}
          </div>

          {/* INSTAGRAM DESTACADO */}
          <section id="instagram-admin-section" className={`admin-accordion-section ${adminSection === "instagram" ? "is-open" : ""}`}>
            <button
              type="button"
              className="admin-accordion-trigger"
              aria-expanded={adminSection === "instagram"}
              onClick={() => setAdminSection((value) => value === "instagram" ? null : "instagram")}
            >
              <span>📸 Instagram destacado</span>
              <span className="admin-accordion-chevron">{adminSection === "instagram" ? "⌃" : "⌄"}</span>
            </button>

            {adminSection === "instagram" && <div className="admin-accordion-content admin-instagram-manager">
              <div className="admin-instagram-manager-head">
                <div>
                  <span className="admin-instagram-eyebrow">PRESENCIA DIGITAL</span>
                  <h2>Instagram destacado</h2>
                  <p>Elegí hasta 3 publicaciones reales para mostrar en la Home. La dueña puede cambiarlas sin tocar código.</p>
                </div>
                <button type="button" className="admin-instagram-new" onClick={abrirNuevaInstagramPost}>+ Nueva publicación</button>
              </div>

            {instagramEditing || instagramAdding || !instagramPosts.length ? (
              <form className="admin-instagram-form" onSubmit={guardarInstagramPost}>
                <div className="admin-instagram-grid">
                  <div className="admin-field admin-instagram-url-field">
                    <label className="admin-field-label">Enlace de la publicación</label>
                    <input
                      className="admin-form-input"
                      type="url"
                      value={instagramForm.post_url}
                      onChange={(e) => setInstagramForm({ ...instagramForm, post_url: e.target.value })}
                      placeholder="Pegá el enlace de Instagram de la publicación"
                      required
                    />
                    <small className="admin-instagram-help">
                      Solo necesitás copiar y pegar el enlace de la publicación o Reel. La web se encarga de mostrar la publicación real de Instagram.
                    </small>
                  </div>
                  <div className="admin-field">
                    <label className="admin-field-label">Posición</label>
                    <select className="admin-form-select" value={instagramForm.position} onChange={(e) => setInstagramForm({ ...instagramForm, position: e.target.value })}>
                      <option value="1">1 — Principal</option>
                      <option value="2">2 — Secundaria</option>
                      <option value="3">3 — Secundaria</option>
                    </select>
                  </div>
                </div>
                <div className="admin-instagram-url-note">
                  <strong>Así de simple:</strong> Instagram → publicación → Compartir → Copiar enlace → pegar acá.
                </div>
                <div className="admin-form-actions">
                  {(instagramEditing || instagramAdding) && <button type="button" className="admin-form-cancel" onClick={resetInstagramForm}>Cancelar</button>}
                  <button type="submit" className="admin-form-submit">{instagramEditing ? "Guardar publicación" : "Agregar publicación"}</button>
                </div>
              </form>
            ) : null}

            <div className="admin-instagram-list">
              {instagramLoading ? <p>Cargando publicaciones...</p> : instagramPosts.length === 0 ? <p className="admin-instagram-empty">Todavía no hay publicaciones configuradas. Pegá hasta 3 enlaces reales de Instagram para que aparezcan en la Home.</p> : instagramPosts.map((post) => (
                <article className="admin-instagram-item" key={post.id}>
                  <div className="admin-instagram-item-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="5" />
                      <circle cx="12" cy="12" r="4" />
                      <circle cx="17.3" cy="6.7" r="1" fill="currentColor" stroke="none" />
                    </svg>
                  </div>
                  <div className="admin-instagram-item-info">
                    <span>Posición {post.position}</span>
                    <strong>Publicación de Instagram</strong>
                    <small>{post.post_url}</small>
                  </div>
                  <div className="admin-instagram-item-actions">
                    <button type="button" onClick={() => window.open(post.post_url, "_blank", "noopener,noreferrer")}>Ver</button>
                    <button type="button" onClick={() => editarInstagramPost(post)}>Editar</button>
                    <button type="button" onClick={() => eliminarInstagramPost(post.id)}>Eliminar</button>
                  </div>
                </article>
              ))}
              </div>
            </div>}
          </section>

          {/* FORMULARIO */}
          {adminSection === "productos" && showForm && (
            <form
              ref={editFormRef}
              className="admin-form"
              onSubmit={guardarProducto}
              style={{
                background: "#faf7f5",
                borderRadius: "16px",
                padding: "25px",
                marginBottom: "30px",
                border: "1px solid #eaded9",
              }}
            >
              <div className="admin-form-heading">
                <div>
                  {editingProduct && (
                    <div className="admin-editing-badge">
                      ✏️ Editando producto
                    </div>
                  )}
                  <h2 className="admin-form-title">
                    {editingProduct ? "Editar producto" : "Nuevo producto"}
                  </h2>
                  <p className="admin-form-subtitle">
                    {editingProduct
                      ? "Actualizá los datos y guardá los cambios."
                      : "Completá los datos para agregar un nuevo producto."}
                  </p>
                </div>
                <div className="admin-form-heading-icon">✦</div>
              </div>

              <div className="admin-form-grid">
                <div className="admin-field">
                  <label className="admin-field-label">Nombre del producto</label>
                  <input
                    className="admin-form-input"
                    type="text"
                    placeholder="Ej. Mate Imperial"
                    value={form.name}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        name: e.target.value,
                      })
                    }
                  />
                </div>

                <div className="admin-field">
                  <label className="admin-field-label">Precio</label>
                  <input
                    className="admin-form-input"
                    type="number"
                    min="0"
                    placeholder="Ej. 25000"
                    value={form.price}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        price: e.target.value,
                      })
                    }
                  />
                </div>

                <div className="admin-field">
                  <label className="admin-field-label">Stock</label>
                  <input
                    className="admin-form-input admin-stock-input"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    placeholder="Cantidad disponible"
                    value={form.stock}
                    onFocus={(e) => e.currentTarget.select()}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, "");
                      setForm({ ...form, stock: value });
                    }}
                  />
                </div>

                <div className="admin-field">
                  <label className="admin-field-label">Categoría</label>
                  <select
                    className="admin-form-select"
                    value={form.category_id}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        category_id: e.target.value,
                      })
                    }
                  >
                    <option value="">Seleccionar categoría</option>

                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="admin-field admin-description-field">
                  <label className="admin-field-label">Descripción del producto</label>
                  <textarea
                    className="admin-form-input admin-description-input"
                    placeholder="Escribí una descripción, características, detalles, códigos o información útil del producto..."
                    value={form.description}
                    rows={7}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        description: e.target.value,
                      })
                    }
                  />
                  <span className="admin-field-help">Podés usar varios párrafos, características, códigos y emojis.</span>
                </div>

                <div className="admin-field admin-file-field">
                  <label className="admin-field-label">Imágenes del producto</label>
                  <input
                    className="admin-file-input"
                    type="file"
                    multiple
                    onChange={(e) => {
                      const selected = Array.from(e.target.files || []);
                      if (!selected.length) return;
                      setForm((prev) => ({
                        ...prev,
                        imageFiles: [...(prev.imageFiles || []), ...selected],
                      }));
                      e.target.value = "";
                    }}
                  />
                  <small style={{display:"block",marginTop:8,color:"#777"}}>Podés seleccionar varias fotos juntas o agregarlas de a una. La primera será la principal.</small>
                  {((form.images||[]).length>0 || (form.imageFiles||[]).length>0) && <div style={{display:"flex",gap:10,flexWrap:"wrap",marginTop:12}}>
                    {(form.images||[]).map((img,i)=>img?.url?(
                      <div key={'old'+i} style={{position:"relative",width:76,height:76}}>
                        <img src={img.url} alt="" style={{width:76,height:76,objectFit:"cover",borderRadius:10}}/>
                        <button type="button" onClick={() => setForm(prev => ({...prev, images: prev.images.filter((_,idx)=>idx!==i)}))} aria-label="Eliminar imagen" style={{position:"absolute",top:-6,right:-6,width:22,height:22,border:"none",borderRadius:"50%",background:"#8d5966",color:"#fff",fontSize:14,lineHeight:"22px",padding:0,cursor:"pointer"}}>×</button>
                      </div>
                    ):null)}
                    {(form.imageFiles||[]).map((file,i)=>(
                      <div key={'new'+i} style={{position:"relative",width:76,height:76}}>
                        <img src={URL.createObjectURL(file)} alt="" style={{width:76,height:76,objectFit:"cover",borderRadius:10}}/>
                        <button type="button" onClick={() => setForm(prev => ({...prev, imageFiles: prev.imageFiles.filter((_,idx)=>idx!==i)}))} aria-label="Eliminar imagen" style={{position:"absolute",top:-6,right:-6,width:22,height:22,border:"none",borderRadius:"50%",background:"#8d5966",color:"#fff",fontSize:14,lineHeight:"22px",padding:0,cursor:"pointer"}}>×</button>
                      </div>
                    ))}
                  </div>}
                </div>
                <div className="admin-field" style={{gridColumn:"1 / -1"}}>
                  <label className="admin-field-label">Variantes / colores / modelos</label>
                  <div style={{display:"grid",gap:14}}>
                    {(form.variants||[]).map((v,i)=><div key={i} style={{border:"1px solid #eadfe4",borderRadius:14,padding:12,background:"#fff"}}>
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 120px auto",gap:8,alignItems:"center"}}>
                        <input className="admin-form-input" placeholder="Color o modelo" value={v.name||""} onChange={e=>{let a=[...(form.variants||[])];a[i]={...a[i],name:e.target.value};setForm({...form,variants:a})}}/>
                        <input className="admin-form-input" placeholder="Código" value={v.code||""} onChange={e=>{let a=[...(form.variants||[])];a[i]={...a[i],code:e.target.value};setForm({...form,variants:a})}}/>
                        <input
                          className="admin-form-input admin-stock-input"
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          placeholder="Stock"
                          value={v.stock ?? ""}
                          onFocus={(e) => e.currentTarget.select()}
                          onChange={(e) => {
                            const value = e.target.value.replace(/\D/g, "");
                            const a = [...(form.variants || [])];
                            a[i] = { ...a[i], stock: value };
                            setForm({ ...form, variants: a });
                          }}
                        />
                        <button type="button" onClick={()=>setForm({...form,variants:(form.variants||[]).filter((_,j)=>j!==i)})}>✕</button>
                      </div>
                      <div style={{marginTop:10}}>
                        <label className="admin-field-label">Fotos de esta variante</label>
                        <input
                          className="admin-file-input"
                          type="file"
                          multiple
                          onChange={(e) => {
                            const selected = Array.from(e.target.files || []);
                            if (!selected.length) return;
                            setForm((prev) => {
                              const variants = [...(prev.variants || [])];
                              variants[i] = {
                                ...variants[i],
                                imageFiles: [
                                  ...(variants[i]?.imageFiles || []),
                                  ...selected,
                                ],
                              };
                              return { ...prev, variants };
                            });
                            e.target.value = "";
                          }}
                        />
                        <small style={{display:"block",marginTop:6,color:"#777"}}>Podés seleccionar varias fotos juntas o agregarlas de a una. Se mostrarán cuando el cliente elija este color/modelo.</small>
                        {((v.images||[]).length>0 || (v.imageFiles||[]).length>0) && <div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:10}}>
                          {(v.images||[]).map((img,j)=>img?.url?<img key={'oldv'+j} src={img.url} alt="" style={{width:64,height:64,objectFit:"cover",borderRadius:9}}/>:null)}
                          {(v.imageFiles||[]).map((file,j)=><img key={'newv'+j} src={URL.createObjectURL(file)} alt="" style={{width:64,height:64,objectFit:"cover",borderRadius:9}}/>)}
                        </div>}
                      </div>
                    </div>)}
                    <button type="button" onClick={()=>setForm({...form,variants:[...(form.variants||[]),{name:"",code:"",stock:0,images:[],imageFiles:[]}]})}>+ Agregar color / modelo</button>
                  </div>
                </div>

                <div className="admin-checks">
                <label className="admin-check">
                  <input
                    type="checkbox"
                    checked={form.featured}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        featured: e.target.checked,
                      })
                    }
                  />
                  <span>⭐ Producto destacado</span>
                </label>

                <label className="admin-check">
                  <input
                    type="checkbox"
                    checked={form.promotion}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        promotion: e.target.checked,
                      })
                    }
                  />
                  <span>🏷️ Producto en promoción</span>
                </label>
              </div>

              <div
                style={{
                  marginTop: "18px",
                  padding: "18px",
                  border: "1px solid #ead7dc",
                  borderRadius: "16px",
                  background: "linear-gradient(180deg, #fffafb 0%, #fff 100%)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
                  <span style={{ fontSize: "20px" }}>🎞️</span>
                  <strong style={{ color: "#4b343a", fontSize: "15px" }}>
                    Posición en el Hero
                  </strong>
                </div>

                <p style={{ margin: "0 0 14px", color: "#7d6a70", fontSize: "13px", lineHeight: 1.5 }}>
                  Elegí dónde querés mostrar este producto en el carrusel principal.
                  Solo puede haber un producto en cada posición.
                </p>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "10px" }}>
                  {[
                    { value: null, label: "Sin posición", icon: "—" },
                    { value: 2, label: "Slide 2", icon: "②" },
                    { value: 3, label: "Slide 3", icon: "③" },
                  ].map((option) => {
                    const selected = form.heroSlide === option.value;

                    return (
                      <button
                        key={String(option.value)}
                        type="button"
                        onClick={() =>
                          setForm((prev) => ({
                            ...prev,
                            heroSlide: option.value,
                          }))
                        }
                        style={{
                          border: selected ? "2px solid #8d5966" : "1px solid #e3d7da",
                          background: selected ? "#f7e9ee" : "#fff",
                          color: selected ? "#8d5966" : "#5f5256",
                          borderRadius: "12px",
                          padding: "11px 8px",
                          cursor: "pointer",
                          fontWeight: selected ? "700" : "600",
                          transition: "all .18s ease",
                        }}
                      >
                        <span style={{ display: "block", fontSize: "18px", marginBottom: "3px" }}>
                          {option.icon}
                        </span>
                        {option.label}
                      </button>
                    );
                  })}
                </div>

                {form.heroSlide && (
                  <div
                    style={{
                      marginTop: "12px",
                      padding: "9px 11px",
                      borderRadius: "10px",
                      background: "#f9f1f3",
                      color: "#8d5966",
                      fontSize: "12px",
                      fontWeight: "600",
                    }}
                  >
                    Este producto aparecerá automáticamente en el {form.heroSlide === 2 ? "Slide 2" : "Slide 3"} del Hero.
                  </div>
                )}
              </div>

              <div className="admin-form-actions">
                <button
                  className="admin-form-cancel"
                  type="button"
                  onClick={() => {
                    try { sessionStorage.removeItem(ADMIN_DRAFT_KEY); } catch {}
                    setShowForm(false);
                    setEditingProduct(null);
                    setImagePreview("");
                  }}
                >
                  Cancelar
                </button>

                <button
                  className="admin-form-submit"
                  type="submit"
                >
                  {editingProduct ? "Guardar cambios" : "Guardar producto"}
                </button>
              </div>
              </div>
            </form>
          )}

          {/* CATEGORÍAS */}
          <section className={`admin-accordion-section admin-categories-manager ${adminSection === "categorias" ? "is-open" : ""}`}>
            <button
              type="button"
              className="admin-accordion-trigger"
              aria-expanded={adminSection === "categorias"}
              onClick={() => setAdminSection((value) => value === "categorias" ? null : "categorias")}
            >
              <span>🏷️ Categorías</span>
              <span className="admin-accordion-chevron">{adminSection === "categorias" ? "⌃" : "⌄"}</span>
            </button>
            {adminSection === "categorias" && <div className="admin-accordion-content">
            <div
              className="admin-categories-inner"
            style={{
              marginBottom: "28px",
              padding: "24px",
              border: "1px solid #eaded9",
              borderRadius: "18px",
              background: "#fff",
            }}
          >
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:"18px",flexWrap:"wrap",marginBottom:"18px"}}>
              <div>
                <h2 style={{margin:"0 0 6px",color:"#332a2d",fontFamily:"Playfair Display, Georgia, serif",fontSize:"26px"}}>Categorías</h2>
                <p style={{margin:0,color:"#776d6f",fontSize:"13px",lineHeight:1.5}}>
                  Agregá o renombrá categorías desde el panel. Los cambios aparecen automáticamente en la tienda.
                </p>
              </div>
              <span style={{padding:"7px 11px",borderRadius:"999px",background:"#f8edf2",color:"#8d5966",fontSize:"12px",fontWeight:600}}>
                {categories.length} {categories.length === 1 ? "categoría" : "categorías"}
              </span>
            </div>

            <form onSubmit={guardarCategoria} style={{display:"grid",gridTemplateColumns:"minmax(0,1fr) auto",gap:"10px",marginBottom:"18px"}}>
              <input
                className="admin-form-input"
                type="text"
                value={categoryName}
                onChange={(e) => setCategoryName(e.target.value)}
                placeholder="Ej. Accesorios"
                maxLength={60}
                disabled={categorySaving}
                aria-label="Nombre de categoría"
              />
              <button
                type="submit"
                className="admin-form-submit"
                disabled={categorySaving}
                style={{minWidth:"150px",opacity:categorySaving?.7:1}}
              >
                {categorySaving ? "Guardando..." : editingCategory ? "Guardar cambios" : "+ Agregar categoría"}
              </button>
            </form>

            {editingCategory && (
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:"12px",padding:"10px 12px",marginBottom:"14px",background:"#faf4f6",borderRadius:"10px",fontSize:"12px",color:"#6f5960"}}>
                <span>Editando: <strong>{editingCategory.name}</strong></span>
                <button
                  type="button"
                  onClick={() => { setEditingCategory(null); setCategoryName(""); }}
                  style={{border:0,background:"transparent",color:"#8d5966",cursor:"pointer",fontWeight:600}}
                >
                  Cancelar
                </button>
              </div>
            )}

            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(190px,1fr))",gap:"10px"}}>
              {categories.map((category) => (
                <div key={category.id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:"8px",padding:"12px 13px",border:"1px solid #eaded9",borderRadius:"12px",background:"#fcfaf9"}}>
                  <div style={{minWidth:0}}>
                    <strong style={{display:"block",fontSize:"13px",color:"#41373a",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{category.name}</strong>
                    <small style={{display:"block",marginTop:"3px",color:"#a08f94",fontSize:"10px"}}>{category.slug || slugifyCategory(category.name)}</small>
                  </div>
                  <div style={{display:"flex",gap:"5px",flexShrink:0}}>
                    <button
                      type="button"
                      title={`Editar ${category.name}`}
                      onClick={() => { setEditingCategory(category); setCategoryName(category.name); }}
                      style={{border:"1px solid #dfd1ce",background:"#fff",color:"#8d5966",borderRadius:"8px",padding:"7px 9px",cursor:"pointer",fontSize:"12px"}}
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      title={`Eliminar ${category.name}`}
                      onClick={() => eliminarCategoria(category)}
                      style={{border:"1px solid #ead1d6",background:"#fff",color:"#a45b6b",borderRadius:"8px",padding:"7px 9px",cursor:"pointer",fontSize:"12px"}}
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              ))}
            </div>
            </div>
            </div>}
          </section>

          {/* PRODUCTOS */}
          <section className={`admin-accordion-section admin-products-accordion ${adminSection === "productos" ? "is-open" : ""}`}>
            <button
              type="button"
              className="admin-accordion-trigger"
              aria-expanded={adminSection === "productos"}
              onClick={() => setAdminSection((value) => value === "productos" ? null : "productos")}
            >
              <span>📦 Productos</span>
              <span className="admin-accordion-chevron">{adminSection === "productos" ? "⌃" : "⌄"}</span>
            </button>
            {adminSection === "productos" && <div className="admin-accordion-content">
          <div
            className="admin-products-section"
            style={{
              borderTop: "1px solid #eee",
              paddingTop: "25px",
            }}
          >
            {/* BUSCADOR Y FILTROS */}
            <div className={`admin-search-filters ${searchOpen ? "search-is-open" : ""}`}> 
              <div className="admin-search-row">
                <button
                  type="button"
                  className="admin-search-trigger"
                  aria-label="Buscar producto"
                  onClick={() => setSearchOpen((value) => !value)}
                >
                  🔍
                </button>

                <input
                  className={`admin-search-input ${
                    searchOpen ? "" : "admin-search-hidden"
                  }`}
                  type="search"
                  placeholder="Buscar producto..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />

                {searchOpen && (
                  <button
                    type="button"
                    className="admin-search-close"
                    aria-label="Cerrar búsqueda"
                    onClick={() => {
                      setSearchOpen(false);
                      setSearchTerm("");
                    }}
                  >
                    ×
                  </button>
                )}

                <select
                  className="admin-category-select"
                  aria-label="Filtrar por categoría"
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                >
                  <option value="Todas">Todas las categorías</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.name}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>

              {(activeFilter !== "Todos" || categoryFilter !== "Todas" || searchTerm.trim() !== "") && (
                <button
                  type="button"
                  className="admin-clear-filters admin-clear-filters-compact"
                  onClick={limpiarFiltros}
                >
                  Limpiar filtros
                </button>
              )}
            </div>

            <h2
              style={{
                marginTop: 0,
                color: "#333",
              }}
            >
              Productos
            </h2>

            {loading ? (
              <p>Cargando productos...</p>
            ) : products.length === 0 ? (
              <p>No hay productos cargados.</p>
            ) : filteredProducts.length === 0 ? (
              <div
                style={{
                  background: "#faf7f5",
                  border: "1px solid #eaded9",
                  borderRadius: "14px",
                  padding: "30px 20px",
                  textAlign: "center",
                  color: "#777",
                }}
              >
                <div
                  style={{
                    fontSize: "34px",
                    marginBottom: "8px",
                  }}
                >
                  🔎
                </div>
                <strong
                  style={{
                    display: "block",
                    color: "#555",
                    marginBottom: "6px",
                  }}
                >
                  No encontramos productos
                </strong>
                <span>
                  Probá con otro nombre o cambiá los filtros.
                </span>
              </div>
            ) : (
              <>
                <p className="admin-results-count">
                  Mostrando <strong>{filteredProducts.length}</strong> de{" "}
                  <strong>{products.length}</strong> productos
                </p>

                <div
                  className="admin-products-grid"
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(auto-fill, minmax(280px, 1fr))",
                    gap: "20px",
                  }}
                >
                  {filteredProducts.map((product) => (
                  <div
                    className="admin-product-card"
                    key={product.id}
                    style={{
                      border: "1px solid #eee",
                      borderRadius: "16px",
                      overflow: "hidden",
                      background: "#fff",
                      height: "100%",
                      display: "flex",
                      flexDirection: "column",
                    }}
                  >
                    {/* IMAGEN */}
                    {product.image_url ? (
                      <img
                        className="admin-product-image"
                        src={product.image_url}
                        alt={product.name}
                        style={{
                          width: "100%",
                          height: "220px",
                          objectFit: "cover",
                          display: "block",
                        }}
                      />
                    ) : (
                      <div
                        className="admin-product-image"
                        style={{
                          height: "220px",
                          background: "#f4e9e5",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "#999",
                        }}
                      >
                        Sin imagen
                      </div>
                    )}

                    <div
                      className="admin-product-content"
                      style={{
                        padding: "18px",
                        flex: "1 1 auto",
                        display: "flex",
                        flexDirection: "column",
                      }}
                    >
                      {/* CATEGORÍA */}
                      <div
                        style={{
                          fontSize: "13px",
                          color: "#9b7180",
                          marginBottom: "6px",
                        }}
                      >
                        {product.categories?.name ||
                          "Sin categoría"}
                      </div>

                      {/* NOMBRE */}
                      <h3
                        style={{
                          margin: "0 0 10px",
                          color: "#333",
                        }}
                      >
                        {product.name}
                      </h3>

                      {/* PRECIO */}
                      <strong
                        style={{
                          display: "block",
                          fontSize: "20px",
                          color: "#8d5966",
                          marginBottom: "8px",
                        }}
                      >
                        $
                        {Number(product.price).toLocaleString(
                          "es-AR"
                        )}
                      </strong>

                      {/* STOCK */}
                      <p
                        style={{
                          margin: "0 0 15px",
                          color: "#666",
                        }}
                      >
                        Stock: {product.stock}
                      </p>

                      {/* INDICADORES */}
                      <div
                        style={{
                          display: "flex",
                          gap: "6px",
                          flexWrap: "wrap",
                          marginBottom: "15px",
                        }}
                      >
                        {/* ESTADO */}
                        {product.active ? (
                          <span
                            style={{
                              fontSize: "12px",
                              background: "#e7f3e4",
                              color: "#4f7d4a",
                              padding: "5px 8px",
                              borderRadius: "10px",
                              fontWeight: "600",
                            }}
                          >
                            🟢 Activo
                          </span>
                        ) : (
                          <span
                            style={{
                              fontSize: "12px",
                              background: "#eeeeee",
                              color: "#777",
                              padding: "5px 8px",
                              borderRadius: "10px",
                              fontWeight: "600",
                            }}
                          >
                            🔴 Oculto
                          </span>
                        )}

                        {/* DESTACADO */}
                        {product.featured && (
                          <span
                            style={{
                              fontSize: "12px",
                              background: "#f4e4ea",
                              color: "#8d5966",
                              padding: "5px 8px",
                              borderRadius: "10px",
                              fontWeight: "600",
                            }}
                          >
                            ⭐ Destacado
                          </span>
                        )}

                        {/* PROMOCIÓN */}
                        {product.promotion && (
                          <span
                            style={{
                              fontSize: "12px",
                              background: "#f8e7d0",
                              color: "#9a6427",
                              padding: "5px 8px",
                              borderRadius: "10px",
                              fontWeight: "600",
                            }}
                          >
                            🏷️ Promoción
                          </span>
                        )}
                      </div>

                      {/* BOTONES */}
                      <div
                        className="admin-product-actions"
                        style={{
                          display: "flex",
                          gap: "8px",
                        }}
                      >
                        {/* EDITAR */}
                        <button
                          type="button"
                          onClick={async () => {
                            try { sessionStorage.removeItem(ADMIN_DRAFT_KEY); } catch {}
                            setEditingProduct(product);

                            // Cargar el registro directamente para traer la descripción
                            // actual de Supabase al formulario de edición.
                            const { data: productoCompleto, error: errorProducto } = await supabase
                              .from("products")
                              .select(`
                                id, name, description, price, stock, category_id, image_url,
                                images, variants, featured, promotion, hero_slide
                              `)
                              .eq("id", product.id)
                              .single();

                            if (errorProducto) {
                              console.error("Error cargando producto para editar:", errorProducto);
                              alert("No se pudo cargar el producto para editar.");
                              return;
                            }

                            setForm({
                              name: productoCompleto?.name || "",
                              description: productoCompleto?.description || "",
                              price: productoCompleto?.price ?? "",
                              stock: productoCompleto?.stock ?? "",
                              category_id: productoCompleto?.category_id ?? "",
                              image_url: productoCompleto?.image_url || "",
                              imageFiles: [],
                              images: Array.isArray(productoCompleto?.images) && productoCompleto.images.length > 0
                                ? productoCompleto.images.map((img) => ({ ...img }))
                                : (productoCompleto?.image_url
                                    ? [{ url: productoCompleto.image_url }]
                                    : []),
                              variants: Array.isArray(productoCompleto?.variants)
                                ? productoCompleto.variants.map((variant) => ({
                                    name: variant?.name || "",
                                    code: variant?.code || "",
                                    stock: String(variant?.stock ?? ""),
                                    images: Array.isArray(variant?.images)
                                      ? variant.images.map((img) => ({ ...img }))
                                      : [],
                                    imageFiles: [],
                                  }))
                                : [],
                              featured: productoCompleto?.featured === true,
                              promotion: productoCompleto?.promotion === true,
                              heroSlide:
                                productoCompleto?.hero_slide === 2 ||
                                productoCompleto?.hero_slide === 3
                                  ? productoCompleto.hero_slide
                                  : null,
                            });

                            setShowForm(true);
                            setAdminSection("productos");
                          }}
                          style={{
                            flex: 1,
                            padding: "10px",
                            borderRadius: "10px",
                            border:
                              "1px solid #8d5966",
                            background: "#fff",
                            color: "#8d5966",
                            cursor: "pointer",
                          }}
                        >
                          Editar
                        </button>

                        {/* OCULTAR / ACTIVAR */}
                        <button
                          type="button"
                          onClick={() =>
                            toggleProductActive(product)
                          }
                          style={{
                            flex: 1,
                            padding: "10px",
                            borderRadius: "10px",
                            border: "none",
                            background: product.active
                              ? "#eee"
                              : "#d9ead3",
                            color: "#555",
                            cursor: "pointer",
                          }}
                        >
                          {product.active
                            ? "Ocultar"
                            : "Activar"}
                        </button>

                        {/* ELIMINAR DEFINITIVAMENTE */}
                        <button
                          type="button"
                          onClick={() => eliminarProducto(product)}
                          style={{
                            flex: 1,
                            padding: "10px",
                            borderRadius: "10px",
                            border: "1px solid #d8aeb7",
                            background: "#fff5f6",
                            color: "#a44f60",
                            cursor: "pointer",
                            fontWeight: 600,
                          }}
                        >
                          Eliminar
                        </button>
                      </div>
                    </div>
                  </div>
                  ))}
                </div>
              </>
            )}
          </div>
            </div>}
          </section>
        </div>

        {/* NAVEGACIÓN MÓVIL */}
        <nav className="admin-bottom-nav" aria-label="Navegación del administrador">
          <button type="button" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
            <span>⌂</span>
            <span>Inicio</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setSearchOpen(true);
              requestAnimationFrame(() =>
                document.querySelector(".admin-search-filters")?.scrollIntoView({ behavior: "smooth", block: "start" })
              );
            }}
          >
            <span>⌕</span>
            <span>Buscar</span>
          </button>
          <button
            type="button"
            className="primary"
            onClick={() => {
              try { sessionStorage.removeItem(ADMIN_DRAFT_KEY); } catch {}
              setEditingProduct(null);
              setImagePreview("");
              setForm({ ...emptyForm });
              setShowForm(true);
              setAdminSection("productos");
              requestAnimationFrame(() =>
                editFormRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
              );
            }}
          >
            <span>＋</span>
            <span>Agregar</span>
          </button>
          <button type="button" onClick={cerrarSesion}>
            <span>♙</span>
            <span>Salir</span>
          </button>
        </nav>
      </div>
    </div>
  );
}

export default Admin;