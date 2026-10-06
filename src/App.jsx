import { useEffect, useRef, useState } from "react";
import "./App.css";
import { supabase } from "./supabase";

function NavIcon({ type, size = 22 }) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.8",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": "true",
  };

  if (type === "home") {
    return (
      <svg {...common}>
        <path d="M3.5 10.5 12 3.5l8.5 7" />
        <path d="M5.5 9.5V20h13V9.5" />
        <path d="M9.5 20v-5.5h5V20" />
      </svg>
    );
  }

  if (type === "search") {
    return (
      <svg {...common}>
        <circle cx="10.8" cy="10.8" r="6.6" />
        <path d="m16 16 4.7 4.7" />
      </svg>
    );
  }

  if (type === "cart") {
    return (
      <svg {...common}>
        <path d="M4 5h2l1.3 9.2a2 2 0 0 0 2 1.8h7.3a2 2 0 0 0 2-1.7L20 8H7" />
        <circle cx="10" cy="19" r="1.2" />
        <circle cx="17" cy="19" r="1.2" />
      </svg>
    );
  }

  if (type === "instagram") {
    return (
      <svg {...common}>
        <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.4" cy="6.7" r="1" fill="currentColor" stroke="none" />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <circle cx="12" cy="8" r="3.2" />
      <path d="M5.5 20a6.5 6.5 0 0 1 13 0" />
    </svg>
  );
}


function SocialLogo({ type, size = 20 }) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "currentColor",
    "aria-hidden": "true",
    focusable: "false",
  };

  if (type === "whatsapp") {
    return (
      <svg {...common}>
        <path d="M20.52 3.48A11.84 11.84 0 0 0 12.08 0C5.53 0 .2 5.33.2 11.88c0 2.09.55 4.13 1.59 5.93L.1 24l6.34-1.66a11.84 11.84 0 0 0 5.64 1.43h.01c6.55 0 11.88-5.33 11.88-11.88 0-3.17-1.23-6.15-3.45-8.41ZM12.09 21.7h-.01a9.82 9.82 0 0 1-5.01-1.37l-.36-.21-3.76.98 1-3.67-.23-.38a9.82 9.82 0 0 1-1.51-5.17C2.21 6.47 6.64 2.04 12.09 2.04c2.64 0 5.12 1.03 6.98 2.9a9.8 9.8 0 0 1 2.9 6.97c0 5.45-4.43 9.79-9.88 9.79Zm5.39-7.34c-.3-.15-1.77-.87-2.04-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.46-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.49s1.07 2.89 1.22 3.09c.15.2 2.1 3.2 5.09 4.49.71.31 1.27.49 1.7.63.71.23 1.36.2 1.87.12.57-.09 1.77-.72 2.02-1.42.25-.7.25-1.3.17-1.42-.07-.12-.27-.2-.57-.35Z"/>
      </svg>
    );
  }

  return (
    <svg {...common}>
      <rect x="3.2" y="3.2" width="17.6" height="17.6" rx="5.2" ry="5.2" fill="none" stroke="currentColor" strokeWidth="2"/>
      <circle cx="12" cy="12" r="4.1" fill="none" stroke="currentColor" strokeWidth="2"/>
      <circle cx="17.7" cy="6.5" r="1.15"/>
    </svg>
  );
}

function normalizeInstagramPostUrl(value) {
  try {
    const url = new URL(String(value || '').trim());
    const host = url.hostname.toLowerCase();
    if (host !== 'instagram.com' && host !== 'www.instagram.com') return '';
    const match = url.pathname.match(/^\/(p|reel|tv)\/([^/]+)/i);
    if (!match) return '';
    return `https://www.instagram.com/${match[1].toLowerCase()}/${match[2]}/`;
  } catch {
    return '';
  }
}

function slugifyProductName(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function getProductSharePath(product) {
  if (!product?.id) return "/";
  return `/producto/${slugifyProductName(product.name)}-${product.id}`;
}

function App() {
  const [cart, setCart] = useState(() => {
    try {
      const savedCart = JSON.parse(localStorage.getItem("dulceAbrilCart") || "[]");
      return Array.isArray(savedCart) ? savedCart : [];
    } catch (error) {
      console.warn("No se pudo recuperar el carrito:", error);
      return [];
    }
  });
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [deliveryMethod, setDeliveryMethod] = useState("delivery");
  const [checkoutForm, setCheckoutForm] = useState({
    name: "",
    phone: "",
    locality: "",
    address: "",
    reference: "",
  });
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedVariantIndex, setSelectedVariantIndex] = useState(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [imageLightboxOpen, setImageLightboxOpen] = useState(false);
  const [imageZoom, setImageZoom] = useState(1);


  useEffect(() => {
    try {
      localStorage.setItem("dulceAbrilCart", JSON.stringify(cart));
    } catch (error) {
      console.warn("No se pudo guardar el carrito:", error);
    }
  }, [cart]);
  const [selectedCategory, setSelectedCategory] = useState("Todos");
  const [productSearch, setProductSearch] = useState("");
  const searchInputRef = useRef(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileCategoriesExpanded, setMobileCategoriesExpanded] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const mobileSearchInputRef = useRef(null);

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [productsError, setProductsError] = useState(false);
  const [instagramPosts, setInstagramPosts] = useState([]);
  const [instagramLoading, setInstagramLoading] = useState(true);
  const [instagramIndex, setInstagramIndex] = useState(0);
  const [instagramAutoplayPaused, setInstagramAutoplayPaused] = useState(false);
  const instagramResumeTimerRef = useRef(null);

  const pauseInstagramAutoplay = () => {
    setInstagramAutoplayPaused(true);

    if (instagramResumeTimerRef.current) {
      window.clearTimeout(instagramResumeTimerRef.current);
    }

    // Instagram embeds live inside a cross-origin iframe, so the parent page
    // cannot reliably receive Play/Pause events from the native player.
    // We pause on interaction and give the Reel enough time to be watched.
    instagramResumeTimerRef.current = window.setTimeout(() => {
      setInstagramAutoplayPaused(false);
      instagramResumeTimerRef.current = null;
    }, 60000);
  };

  useEffect(() => () => {
    if (instagramResumeTimerRef.current) {
      window.clearTimeout(instagramResumeTimerRef.current);
    }
  }, []);

  useEffect(() => {
    if (instagramPosts.length <= 1 || instagramAutoplayPaused) return undefined;

    // Al tocar el reproductor de Instagram, el clic ocurre dentro de un
    // iframe de otro dominio. Detectamos cuando ese iframe recibe el foco
    // para detener la rotación antes de que pueda cambiar la publicación.
    const focusTimer = window.setInterval(() => {
      const shell = document.querySelector(".instagram-embed-shell");
      const iframe = shell?.querySelector("iframe");
      if (iframe && document.activeElement === iframe) {
        pauseInstagramAutoplay();
      }
    }, 300);

    return () => window.clearInterval(focusTimer);
  }, [instagramPosts.length, instagramIndex, instagramAutoplayPaused]);

  useEffect(() => {
    cargarProductos();
    cargarCategorias();
    cargarInstagramPosts();
  }, []);

  async function cargarInstagramPosts() {
    setInstagramLoading(true);

    const { data, error } = await supabase
      .from("instagram_posts")
      .select("id, post_url, position, active")
      .eq("active", true)
      .order("position", { ascending: true });

    if (error) {
      // La Home sigue funcionando aunque la tabla todavía no exista.
      console.warn("Instagram administrable todavía no disponible:", error.message);
      setInstagramPosts([]);
      setInstagramLoading(false);
      return;
    }

    const validPosts = (data || [])
      .map((post) => ({
        ...post,
        post_url: normalizeInstagramPostUrl(post.post_url),
      }))
      .filter((post) => post.post_url);

    setInstagramPosts(validPosts);
    setInstagramIndex((current) => Math.min(current, Math.max(validPosts.length - 1, 0)));
    setInstagramLoading(false);
  }

  // Instagram transforma todos los blockquotes en publicaciones reales mediante su script oficial.
  // Los embeds se mantienen montados para que cambiar entre publicaciones sea
  // instantáneo y no destruya el iframe activo. Solo una capa queda visible.
  useEffect(() => {
    if (!instagramPosts.length) return undefined;

    let cancelled = false;
    let timer = null;

    const processEmbeds = () => {
      if (cancelled) return;
      window.instgrm?.Embeds?.process?.();
    };

    const scheduleProcess = () => {
      requestAnimationFrame(() => {
        if (cancelled) return;
        requestAnimationFrame(() => {
          if (cancelled) return;
          processEmbeds();
          timer = window.setTimeout(processEmbeds, 250);
        });
      });
    };

    if (window.instgrm?.Embeds) {
      scheduleProcess();
      return () => {
        cancelled = true;
        if (timer) window.clearTimeout(timer);
      };
    }

    const existingScript = document.querySelector('script[data-dulce-instagram-embed="true"]');
    if (existingScript) {
      existingScript.addEventListener('load', scheduleProcess);
      return () => {
        cancelled = true;
        existingScript.removeEventListener('load', scheduleProcess);
        if (timer) window.clearTimeout(timer);
      };
    }

    const script = document.createElement('script');
    script.src = 'https://www.instagram.com/embed.js';
    script.async = true;
    script.dataset.dulceInstagramEmbed = 'true';
    script.addEventListener('load', scheduleProcess);
    document.body.appendChild(script);

    return () => {
      cancelled = true;
      script.removeEventListener('load', scheduleProcess);
      if (timer) window.clearTimeout(timer);
    };
  }, [instagramPosts]);

  // Autoplay: cambia la publicación destacada cada 15 segundos.
  // Como todos los embeds permanecen montados, el cambio es instantáneo
  // y no hay un momento en el que el contenedor quede blanco.
  useEffect(() => {
    if (instagramPosts.length <= 1 || instagramAutoplayPaused) return undefined;

    const timer = window.setTimeout(() => {
      setInstagramIndex((current) => (current + 1) % instagramPosts.length);
    }, 15000);

    return () => window.clearTimeout(timer);
  }, [instagramPosts.length, instagramIndex, instagramAutoplayPaused]);

  const goToInstagramPost = (nextIndex) => {
    if (instagramResumeTimerRef.current) {
      window.clearTimeout(instagramResumeTimerRef.current);
      instagramResumeTimerRef.current = null;
    }
    setInstagramAutoplayPaused(false);
    setInstagramIndex(nextIndex);
  };


  // Mantener el carrito alineado con el stock real de Supabase.
  // Si un producto/variante quedó sin stock, se quita del carrito;
  // si bajó el stock, la cantidad se ajusta al máximo disponible.
  useEffect(() => {
    if (!products.length) return;

    setCart((currentCart) =>
      currentCart
        .map((item) => {
          const product = products.find((p) => String(p.id) === String(item.id));
          if (!product) return null;

          let availableStock = Number(product.stock ?? 0);

          if (item.variant) {
            const variant = (product.variants || []).find(
              (v) =>
                String(v.code || "") === String(item.variant.code || "") &&
                String(v.name || "") === String(item.variant.name || "")
            );
            if (!variant) return null;
            availableStock = Number(variant.stock ?? 0);
          }

          if (availableStock <= 0) return null;

          return {
            ...item,
            stock: item.variant ? item.stock : product.stock,
            variant: item.variant
              ? {
                  ...item.variant,
                  stock: availableStock,
                }
              : item.variant,
            quantity: Math.min(Number(item.quantity || 1), availableStock),
          };
        })
        .filter(Boolean)
    );
  }, [products]);

  async function cargarCategorias() {
    try {
      const { data, error } = await supabase
        .from("categories")
        .select("id, name")
        .order("id", { ascending: true });

      if (error) {
        console.error("ERROR CARGANDO CATEGORÍAS PÚBLICAS:", error);
        return;
      }

      setCategories(Array.isArray(data) ? data : []);
    } catch (requestError) {
      console.error("ERROR DE RED CARGANDO CATEGORÍAS PÚBLICAS:", requestError);
    }
  }

  async function cargarProductos() {
    setLoadingProducts(true);
    setProductsError(false);

    let data = null;
    let error = null;

    try {
      ({ data, error } = await supabase
        .from("products")
        .select(`
          id,
          name,
          description,
          price,
          stock,
          image_url,
          images,
          variants,
          featured,
          promotion,
          hero_slide,
          active,
          categories (
            name
          )
        `)
        .eq("active", true)
        .order("id", { ascending: true }));
    } catch (requestError) {
      console.error("ERROR DE RED CARGANDO PRODUCTOS PÚBLICOS:", requestError);
      setProducts([]);
      setProductsError(true);
      setLoadingProducts(false);
      return;
    }

    if (error) {
      console.error("ERROR CARGANDO PRODUCTOS PÚBLICOS:", error);
      setProducts([]);
      setProductsError(true);
      setLoadingProducts(false);
      return;
    }

    const normalizeImage = (image) => {
      if (!image) return "";
      if (typeof image === "string") return image;
      return image.url || image.publicUrl || image.path || "";
    };

    const normalizeImages = (images) =>
      Array.isArray(images)
        ? images
            .map((image) => ({ url: normalizeImage(image) }))
            .filter((image) => image.url)
        : [];

    const productosAdaptados = (data || []).map((product) => {
      const productImages = normalizeImages(product.images);
      const variants = Array.isArray(product.variants)
        ? product.variants.map((variant) => ({
            ...variant,
            images: normalizeImages(variant.images),
          }))
        : [];

      const mainImage =
        productImages[0]?.url ||
        normalizeImage(product.image_url) ||
        variants[0]?.images?.[0]?.url ||
        "";

      return {
        id: product.id,
        name: product.name,
        category: product.categories?.name || "",
        price: Number(product.price),
        image: mainImage,
        images: productImages.length
          ? productImages
          : mainImage
            ? [{ url: mainImage }]
            : [],
        variants,
        description: product.description || "",
        stock: Number(product.stock ?? 0),
        featured:
          product.featured === true ||
          product.featured === "true" ||
          product.featured === 1,
        promotion:
          product.promotion === true ||
          product.promotion === "true" ||
          product.promotion === 1,
        heroSlide: Number(product.hero_slide ?? 0) || null,
      };
    });

    setProducts(productosAdaptados);
    setLoadingProducts(false);
  }

  // Si se abre una URL compartida de producto, mostrar directamente ese producto.
  useEffect(() => {
    if (!products.length) return;

    const match = window.location.pathname.match(/^\/producto\/(.+)-(\d+)\/?$/i);
    if (!match) return;

    const productId = match[2];
    const product = products.find((item) => String(item.id) === String(productId));
    if (!product) return;

    setSelectedProduct({ ...product, image: product.image });
    setSelectedVariantIndex(null);
    setSelectedImageIndex(0);
  }, [products]);

  const shareProduct = async () => {
    if (!selectedProduct) return;

    const path = getProductSharePath(selectedProduct);
    const shareUrl = `${window.location.origin}${path}`;

    const shareData = {
      title: selectedProduct.name,
      text: `Mirá este producto de Dulce Abril: ${selectedProduct.name}`,
      url: shareUrl,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl);
        alert("Enlace del producto copiado.");
      } else {
        window.prompt("Copiá el enlace del producto:", shareUrl);
      }
    } catch (error) {
      if (error?.name !== "AbortError") {
        try {
          await navigator.clipboard?.writeText(shareUrl);
          alert("Enlace del producto copiado.");
        } catch {
          window.prompt("Copiá el enlace del producto:", shareUrl);
        }
      }
    }
  };

  // Destacados, promociones y posiciones del Hero se controlan desde el Admin de Supabase.
  const featuredProducts = products
    .filter((product) => product.featured)
    .slice(0, 4);

  // Si la dueña definió una posición explícita, esa selección tiene prioridad.
  // Los fallbacks mantienen compatibilidad con productos existentes que todavía
  // no tengan configurada una posición del Hero.
  const heroSlide2Product =
    products.find((product) => product.heroSlide === 2) ||
    featuredProducts[0] ||
    products[0] ||
    null;

  const heroSlide3Product =
    products.find(
      (product) =>
        product.heroSlide === 3 &&
        product.id !== heroSlide2Product?.id
    ) ||
    products.find(
      (product) =>
        product.promotion &&
        product.id !== heroSlide2Product?.id
    ) ||
    featuredProducts.find(
      (product) =>
        product.id !== heroSlide2Product?.id
    ) ||
    products.find(
      (product) =>
        product.id !== heroSlide2Product?.id
    ) ||
    heroSlide2Product ||
    null;

  const heroSlides = [
    {
      type: "welcome",
      eyebrow: "TUS MOMENTOS. MÁS DULCES",
      tagline: "REGALOS QUE ENAMORAN",
      text: "Regalos, mates, termos y mucho más...",
      button: "Ver productos",
      action: "products",
    },
    ...(heroSlide2Product ? [{
      type: "featured",
      eyebrow: heroSlide2Product.category || "MATES",
      tagline: heroSlide2Product.name || "MATE TORPEDO PREMIUM",
      text: "Una pieza especial para acompañar tus momentos y convertirlos en recuerdos.",
      button: "Ver producto",
      action: "featured",
      image: heroSlide2Product.image,
      product: heroSlide2Product,
    }] : []),
    ...(heroSlide3Product ? [{
      type: "promotion",
      eyebrow: heroSlide3Product.promotion ? "PROMOCIONES" : "IDEAS PARA REGALAR",
      tagline: heroSlide3Product.promotion ? "UN DETALLE QUE SE DISFRUTA" : "ENCONTRÁ TU PRÓXIMO REGALO",
      text: heroSlide3Product.promotion
        ? (heroSlide3Product.name || "Propuestas especiales para regalar.")
        : "Mate Artesanal Premium",
      button: heroSlide3Product.promotion ? "Ver promociones" : "Ver producto",
      action: heroSlide3Product.promotion ? "promotions" : "featured",
      image: heroSlide3Product.image,
      product: heroSlide3Product,
    }] : []),
  ];

  const [heroIndex, setHeroIndex] = useState(0);
  const [heroPaused, setHeroPaused] = useState(false);
  const heroTouchStartX = useRef(null);

  useEffect(() => {
    if (heroIndex >= heroSlides.length) setHeroIndex(0);
  }, [heroIndex, heroSlides.length]);

  useEffect(() => {
    if (heroSlides.length <= 1 || heroPaused) return undefined;
    const timer = window.setInterval(() => {
      setHeroIndex((current) => (current + 1) % heroSlides.length);
    }, 6000);
    return () => window.clearInterval(timer);
  }, [heroPaused, heroSlides.length]);

  const changeHeroSlide = (direction) => {
    if (heroSlides.length <= 1) return;
    setHeroPaused(true);
    setHeroIndex((current) => (current + direction + heroSlides.length) % heroSlides.length);
    window.setTimeout(() => setHeroPaused(false), 8500);
  };

  const handleHeroAction = (slide) => {
    setHeroPaused(true);
    if (slide.action === "featured" && slide.product) {
      setSelectedProduct({ ...slide.product, image: slide.product.image });
      setSelectedVariantIndex(null);
      setSelectedImageIndex(0);
      return;
    }
    if (slide.action === "promotions") {
      setSelectedCategory("Promociones");
      setProductSearch("");
      goTo("productos");
      return;
    }
    goToProducts();
  };

  const handleHeroTouchStart = (event) => {
    heroTouchStartX.current = event.touches?.[0]?.clientX ?? null;
  };

  const handleHeroTouchEnd = (event) => {
    if (heroTouchStartX.current == null) return;
    const endX = event.changedTouches?.[0]?.clientX ?? heroTouchStartX.current;
    const delta = endX - heroTouchStartX.current;
    heroTouchStartX.current = null;
    if (Math.abs(delta) < 45 || heroSlides.length <= 1) return;
    changeHeroSlide(delta < 0 ? 1 : -1);
  };

  // Búsqueda profesional: combina categoría + nombre + descripción + variantes.
  // Se normalizan tildes y mayúsculas para que la búsqueda sea más natural.
  const normalizeSearchText = (value) =>
    String(value ?? "")
      .normalize("NFD")
      .replace(/[\\u0300-\\u036f]/g, "")
      .toLowerCase()
      .trim();

  const searchTerms = normalizeSearchText(productSearch)
    .split(/\\s+/)
    .filter(Boolean);

  const productsByCategory =
    selectedCategory === "Todos"
      ? products
      : selectedCategory === "Promociones"
        ? products.filter((product) => product.promotion)
        : products.filter((product) => product.category === selectedCategory);

  const promotionProducts = products
    .filter((product) => product.promotion)
    .slice(0, 4);

  const filteredProducts = productsByCategory.filter((product) => {
    if (!searchTerms.length) return true;

    const variantText = (product.variants || [])
      .flatMap((variant) => [
        variant.name,
        variant.code,
        ...(variant.images || []).map((image) => image.url),
      ])
      .join(" ");

    const searchableText = normalizeSearchText(
      [
        product.name,
        product.category,
        product.description,
        variantText,
      ].join(" ")
    );

    return searchTerms.every((term) => searchableText.includes(term));
  });

  const dynamicCategories = [
    ...categories
      .map((category) => String(category?.name || "").trim())
      .filter(Boolean),
    ...products
      .map((product) => String(product?.category || "").trim())
      .filter(Boolean),
  ].filter((category, index, list) => list.indexOf(category) === index);

  const categoryOptions = ["Todos", ...dynamicCategories, "Promociones"];

  const getItemStock = (item) => {
    const stock = item?.variant ? item.variant.stock : item?.stock;
    return Number(stock ?? 0);
  };

  const addToCart = (product, variant = null) => {
    if (Number(product?.price ?? 0) === 0) return;

    const availableStock = Number(variant?.stock ?? product?.stock ?? 0);
    if (availableStock <= 0) return;

    const cartKey = variant ? `${product.id}-${variant.code || variant.name}` : String(product.id);
    setCart((currentCart) => {
      const existingProduct = currentCart.find((item) => item.cartKey === cartKey);

      if (existingProduct) {
        if (existingProduct.quantity >= availableStock) return currentCart;
        return currentCart.map((item) =>
          item.cartKey === cartKey
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }

      return [...currentCart, { ...product, variant, cartKey, quantity: 1 }];
    });
  };
  const handleImageError = (event, product, variant = null) => {
    const image = event.currentTarget;

    if (image.dataset.fallbackApplied === "true") {
      image.style.display = "none";
      return;
    }

    // Nunca saltamos a la imagen de OTRA variante.
    // Si la variante activa tiene galería propia, el fallback queda
    // limitado a esa galería y, como último recurso, a las fotos generales.
    const scopedImages = Array.isArray(variant?.images) && variant.images.length
      ? variant.images
      : Array.isArray(product?.images)
        ? product.images
        : [];

    const fallback = scopedImages.find(
      (item) => item?.url && item.url !== image.src
    )?.url || "";

    if (fallback) {
      image.dataset.fallbackApplied = "true";
      image.src = fallback;
    } else {
      image.style.display = "none";
    }
  };

  const increaseQuantity = (cartKey) => {
    setCart((currentCart) =>
      currentCart.map((item) => {
        const stock = getItemStock(item);
        if (item.cartKey !== cartKey || stock <= 0 || item.quantity >= stock) return item;
        return { ...item, quantity: item.quantity + 1 };
      })
    );
  };
  const decreaseQuantity = (cartKey) => {
    setCart((currentCart) =>
      currentCart
        .map((item) =>
          item.cartKey === cartKey ? { ...item, quantity: item.quantity - 1 } : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const removeFromCart = (cartKey) => {
    setCart((currentCart) => currentCart.filter((item) => item.cartKey !== cartKey));
  };

  const cartItemsCount = cart.reduce(
    (total, item) => total + item.quantity,
    0
  );

  const cartTotal = cart.reduce(
    (total, item) => total + item.price * item.quantity,
    0
  );

  const goTo = (id) => {
    setMobileMenuOpen(false);

    if (id === "inicio") {
      // Inicio debe ser una navegación real a la Home, no solamente
      // un scroll hacia el comienzo de la categoría actual.
      setSelectedCategory("Todos");
      setProductSearch("");
      setMobileCategoriesExpanded(false);
      setHeroIndex(0);
      setHeroPaused(false);

      window.requestAnimationFrame(() => {
        window.scrollTo({
          top: 0,
          behavior: "smooth",
        });
      });
      return;
    }

    document.getElementById(id)?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  const goToProducts = () => goTo("productos");

  const goToPromotions = () => {
    setSelectedCategory("Promociones");
    setProductSearch("");
    goTo("productos");
  };

  const goToCategories = () => goTo("categorias");

  const goToSearch = () => {
    setMobileMenuOpen(false);
    setMobileSearchOpen(true);
    window.setTimeout(() => {
      mobileSearchInputRef.current?.focus();
    }, 80);
  };

  useEffect(() => {
    if (!mobileSearchOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [mobileSearchOpen]);

  const openInstagram = () => {
    window.open(
      "https://www.instagram.com/dulce_abril0?stkn=ZGpmNXp5Z29jM2E0",
      "_blank"
    );
  };

  const sendToWhatsApp = () => {
    const phoneNumber = "5493876745397";

    const name = checkoutForm.name.trim();
    const phone = checkoutForm.phone.trim();
    const locality = checkoutForm.locality.trim();
    const address = checkoutForm.address.trim();
    const reference = checkoutForm.reference.trim();

    if (!name || !phone || (deliveryMethod === "delivery" && (!locality || !address))) {
      alert("Completá los datos necesarios para continuar con el pedido.");
      return;
    }

    const orderDetails = cart
      .map((item) => {
        const variantName = item.variant?.name || item.variant?.code || item.variantName || "";
        const variantCode = item.variant?.code || item.variantCode || "";
        const variantText = variantName ? ` — ${variantName}` : "";
        const codeText = variantCode && variantCode !== variantName ? ` (${variantCode})` : "";
        return `• ${item.name}${variantText}${codeText} x${item.quantity} — $${(item.price * item.quantity).toLocaleString("es-AR")}`;
      })
      .join("\n");

    const deliveryText = deliveryMethod === "pickup"
      ? "Retiro en el local"
      : "Envío a domicilio";

    const deliveryData = deliveryMethod === "pickup"
      ? `Modalidad: ${deliveryText}`
      : [
          `Modalidad: ${deliveryText}`,
          `Localidad: ${locality}`,
          `Dirección: ${address}`,
          reference ? `Referencia: ${reference}` : "",
        ].filter(Boolean).join("\n");

    const message =
      `Hola! Quiero hacer un pedido en Dulce Abril:\n\n` +
      `${orderDetails}\n\n` +
      `Total: $${cartTotal.toLocaleString("es-AR")}\n\n` +
      `DATOS DEL CLIENTE\n` +
      `Nombre: ${name}\n` +
      `WhatsApp: ${phone}\n` +
      `${deliveryData}\n` +
      `Forma de pago: A coordinar por WhatsApp\n\n` +
      `¡Gracias!`;

    const whatsappUrl =
      `https://wa.me/${phoneNumber}?text=` +
      encodeURIComponent(message);

    // El pedido ya fue preparado para WhatsApp: vaciamos el carrito
    // inmediatamente y también limpiamos su persistencia local para que
    // al volver al sitio no aparezca nuevamente el pedido enviado.
    try {
      localStorage.removeItem("dulceAbrilCart");
    } catch (error) {
      console.warn("No se pudo limpiar el carrito guardado:", error);
    }

    setCart([]);
    setCheckoutForm({
      name: "",
      phone: "",
      locality: "",
      address: "",
      reference: "",
    });
    setCheckoutOpen(false);
    setCartOpen(false);

    window.open(whatsappUrl, "_blank");
  };

  const sendPriceInquiry = (product, variant = null) => {
    if (!product) return;
    const phoneNumber = "5493876745397";
    const variantText = variant?.name ? `\nModelo/color: ${variant.name}` : "";
    const message = `Hola! Quería consultar el precio de "${product.name}".${variantText}\n\n¿Me pasan el precio, por favor?`;
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=` + encodeURIComponent(message);
    window.open(whatsappUrl, "_blank", "noopener,noreferrer");
  };

  const openCheckout = () => setCheckoutOpen(true);


  return (
    <div className="app">


      {/* ===== AJUSTE VISUAL DULCE ABRIL ===== */}

      {/* ================= HEADER ================= */}

      <header className="header">
        <div className="header-inner">

          <button
            className="menu-button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Abrir menú"
          >
            <span></span>
            <span></span>
            <span></span>
          </button>

          <button
            className="brand"
            onClick={() => goTo("inicio")}
            aria-label="Dulce Abril"
          >
            <img
              className="brand-logo-image"
              src="/dulce-abril-logo.png"
              alt="Dulce Abril — Tienda de Ideas"
            />
          </button>

          <nav className="desktop-nav">
            <a href="#inicio" onClick={(e) => { e.preventDefault(); goTo("inicio"); }}>Inicio</a>
            <a href="#productos" onClick={(e) => { e.preventDefault(); goTo("productos"); }}>Productos</a>
            <a href="#categorias" onClick={(e) => { e.preventDefault(); goTo("categorias"); }}>Categorías</a>
            <a href="#promociones" onClick={(e) => { e.preventDefault(); goToPromotions(); }}>Promociones</a>
            <a href="#instagram" onClick={(e) => { e.preventDefault(); goTo("instagram"); }}>Instagram</a>
          </nav>

          <button
            className="cart-button"
            onClick={() => setCartOpen(true)}
            aria-label="Carrito"
          >
            <span className="cart-icon">
              <NavIcon type="cart" size={25} />
            </span>

            {cartItemsCount > 0 && (
              <span className="cart-count">
                {cartItemsCount}
              </span>
            )}
          </button>

        </div>
      </header>

      {/* ================= MENU MÓVIL ================= */}

      <div
        className={`mobile-menu-overlay ${mobileMenuOpen ? "is-open" : ""}`}
        aria-hidden={!mobileMenuOpen}
          onClick={() => setMobileMenuOpen(false)}
        >
          <div
            className="mobile-menu"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              className="mobile-menu-close"
              onClick={() => setMobileMenuOpen(false)}
            >
              ×
            </button>

            <div className="mobile-menu-brand">
              <img
                className="mobile-menu-logo"
                src="/dulce-abril-logo.png"
                alt="Dulce Abril"
              />
              <small>REGALOS QUE ENAMORAN</small>
            </div>

            <button onClick={() => goTo("inicio")}>
              Inicio
            </button>

            <button onClick={() => goTo("productos")}>
              Productos
            </button>

            <button
              type="button"
              className="mobile-menu-category-toggle"
              onClick={() => setMobileCategoriesExpanded((open) => !open)}
              aria-expanded={mobileCategoriesExpanded}
            >
              <span>Categorías</span>
              <span className="mobile-menu-category-chevron">{mobileCategoriesExpanded ? "⌃" : "⌄"}</span>
            </button>

            {mobileCategoriesExpanded && (
              <div className="mobile-menu-category-list">
                {(categoryOptions).map((category) => (
                  <button
                    type="button"
                    key={category}
                    className={selectedCategory === category ? "active" : ""}
                    onClick={() => {
                      setSelectedCategory(category);
                      setProductSearch("");
                      setMobileCategoriesExpanded(false);
                      setMobileMenuOpen(false);
                      window.setTimeout(() => {
                        document.getElementById("productos")?.scrollIntoView({
                          behavior: "smooth",
                          block: "start",
                        });
                      }, 40);
                    }}
                  >
                    <span>{category}</span>
                    {category !== "Todos" && (
                      <span className="mobile-menu-category-count">
                        {category === "Promociones"
                          ? products.filter((product) => product.promotion).length
                          : products.filter((product) => product.category === category).length}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}

            <button onClick={goToPromotions}>
              Promociones
            </button>

            <button onClick={openInstagram}>
              Instagram
            </button>
          </div>
        </div>

      {/* ================= CARRITO ================= */}

      <div
        className={`cart-overlay ${cartOpen ? "is-open" : ""}`}
        aria-hidden={!cartOpen}
          onClick={() => setCartOpen(false)}
        >
          <aside
            className="cart-panel"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="cart-header">
              <div>
                <span>TU COMPRA</span>
                <h2>Tu carrito</h2>
              </div>

              <button
                className="cart-close"
                onClick={() => setCartOpen(false)}
              >
                ×
              </button>
            </div>

            {cart.length === 0 ? (
              <div className="empty-cart">
                <div className="empty-cart-icon"><NavIcon type="cart" size={45} /></div>

                <h3>Tu carrito está vacío</h3>

                <p>
                  Agregá algunos productos para comenzar tu compra.
                </p>

                <button
                  className="button-primary"
                  onClick={() => {
                    setCartOpen(false);
                    goToProducts();
                  }}
                >
                  Ver productos
                </button>
              </div>
            ) : (
              <>
                <div className="cart-items">
                  {cart.map((item) => (
                    <div className="cart-item" key={item.cartKey || item.id}>

                      <div className="cart-item-image">
                        <img
                          src={item.image}
                          alt={item.name}
                          onError={(event) => handleImageError(event, item)}
                        />
                      </div>

                      <div className="cart-item-info">
                        <span>{item.category}</span>

                        <h3>{item.name}</h3>
                        {item.variant && (
                          <small style={{display:"block",margin:"3px 0",color:"#756b6e"}}>
                            {item.variant.name || item.variant.code}{item.variant.code && item.variant.name ? ` · ${item.variant.code}` : ""}
                          </small>
                        )}

                        <strong>
                          ${item.price.toLocaleString("es-AR")} c/u
                        </strong>

                        <div className="quantity-controls">
                          <button
                            onClick={() =>
                              decreaseQuantity(item.cartKey || item.id)
                            }
                          >
                            −
                          </button>

                          <span>{item.quantity}</span>

                          <button
                            onClick={() => increaseQuantity(item.cartKey || item.id)}
                            disabled={getItemStock(item) <= 0 || item.quantity >= getItemStock(item)}
                            title={item.quantity >= getItemStock(item) ? "Stock máximo alcanzado" : "Aumentar cantidad"}
                            style={{opacity: item.quantity >= getItemStock(item) ? 0.35 : 1, cursor: item.quantity >= getItemStock(item) ? "not-allowed" : "pointer"}}
                          >
                            +
                          </button>
                        </div>
                      </div>

                      <button
                        className="remove-item"
                        onClick={() =>
                          removeFromCart(item.cartKey || item.id)
                        }
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>

                <div className="cart-summary">

                  <div className="cart-total">
                    <span>Subtotal</span>

                    <strong>
                      ${cartTotal.toLocaleString("es-AR")}
                    </strong>
                  </div>

                  <button
                    className="checkout-button"
                    onClick={() => setCheckoutOpen(true)}
                  >
                    Continuar con el pedido →
                  </button>


                  <button
                    className="continue-shopping"
                    onClick={() => setCartOpen(false)}
                  >
                    Seguir comprando
                  </button>

                </div>
              </>
            )}
          </aside>
        </div>

      {/* ================= CHECKOUT ================= */}

      {checkoutOpen && (
        <div
          className="checkout-overlay"
          onClick={() => setCheckoutOpen(false)}
        >
          <div
            className="checkout-modal"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <button
              className="checkout-close"
              onClick={() =>
                setCheckoutOpen(false)
              }
            >
              ×
            </button>

            <span>HACÉ TU PEDIDO</span>

            <h2>¿Cómo querés recibir tu pedido?</h2>

            <p className="checkout-intro">
              Completá estos datos y te enviamos el pedido listo para coordinar por WhatsApp.
            </p>

            <div className="delivery-methods" role="group" aria-label="Modalidad de entrega">
              <button
                type="button"
                className={`delivery-method ${deliveryMethod === "delivery" ? "active" : ""}`}
                onClick={() => setDeliveryMethod("delivery")}
              >
                <span className="delivery-method-icon">🚚</span>
                <span>
                  <strong>Envío a domicilio</strong>
                  <small>Coordinamos el envío</small>
                </span>
              </button>

              <button
                type="button"
                className={`delivery-method ${deliveryMethod === "pickup" ? "active" : ""}`}
                onClick={() => setDeliveryMethod("pickup")}
              >
                <span className="delivery-method-icon">🏪</span>
                <span>
                  <strong>Retiro en el local</strong>
                  <small>Coordinamos la entrega</small>
                </span>
              </button>
            </div>

            <div className="checkout-form">
              <label>
                Nombre y apellido
                <input
                  type="text"
                  value={checkoutForm.name}
                  onChange={(event) => setCheckoutForm((current) => ({ ...current, name: event.target.value }))}
                  placeholder="Ej. María González"
                  autoComplete="name"
                />
              </label>

              <label>
                WhatsApp
                <input
                  type="tel"
                  value={checkoutForm.phone}
                  onChange={(event) => setCheckoutForm((current) => ({ ...current, phone: event.target.value }))}
                  placeholder="Ej. 387 555 1234"
                  autoComplete="tel"
                />
              </label>

              {deliveryMethod === "delivery" && (
                <>
                  <label className="checkout-field-wide">
                    Localidad
                    <input
                      type="text"
                      value={checkoutForm.locality}
                      onChange={(event) => setCheckoutForm((current) => ({ ...current, locality: event.target.value }))}
                      placeholder="Ej. San José de Metán"
                      autoComplete="address-level2"
                    />
                  </label>
                  <label className="checkout-field-wide">
                    Dirección
                    <input
                      type="text"
                      value={checkoutForm.address}
                      onChange={(event) => setCheckoutForm((current) => ({ ...current, address: event.target.value }))}
                      placeholder="Calle y número"
                      autoComplete="street-address"
                    />
                  </label>

                  <label className="checkout-field-wide">
                    Referencia <em>opcional</em>
                    <textarea
                      value={checkoutForm.reference}
                      onChange={(event) => setCheckoutForm((current) => ({ ...current, reference: event.target.value }))}
                      placeholder="Barrio, entre calles, indicación para encontrar el domicilio..."
                      rows="2"
                    />
                  </label>
                </>
              )}
            </div>

            <div className="checkout-delivery-note">
              <strong>{deliveryMethod === "delivery" ? "Envío" : "Retiro"}</strong>
              <span>
                {deliveryMethod === "delivery"
                  ? "El costo y la forma de envío se coordinan por WhatsApp."
                  : "Te confirmamos por WhatsApp cuándo y dónde retirar tu pedido."}
              </span>
            </div>

            <button
              type="button"
              className="checkout-option whatsapp checkout-confirm"
              onClick={sendToWhatsApp}
            >
              <span className="social-button-content">
                <SocialLogo type="whatsapp" size={18} />
                <span>Confirmar pedido</span>
              </span>
            </button>

            <button
              type="button"
              className="checkout-option instagram checkout-secondary"
              onClick={() => {
                setCheckoutOpen(false);
                setCartOpen(false);
                openInstagram();
              }}
            >
              <span className="social-button-content">
                <SocialLogo type="instagram" size={18} />
                <span>Consultar</span>
              </span>
            </button>
          </div>
        </div>
      )}

            {/* ================= PRODUCTO ================= */}

      {selectedProduct && (
        <div
          className="product-detail-overlay"
          onClick={() => { setSelectedProduct(null); setSelectedVariantIndex(null); setSelectedImageIndex(0); setImageLightboxOpen(false); setImageZoom(1); }}
        >
          <div
            className="product-detail-modal"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <button
              className="product-detail-close"
              onClick={() => { setSelectedProduct(null); setSelectedVariantIndex(null); setSelectedImageIndex(0); setImageLightboxOpen(false); setImageZoom(1); }}
            >
              ×
            </button>

            {(() => {
              const variants = selectedProduct.variants || [];
              const activeVariant = selectedVariantIndex != null ? variants[selectedVariantIndex] : null;
              const gallery = activeVariant?.images?.length ? activeVariant.images : (selectedProduct.images || []);
              const safeImageIndex = Math.min(selectedImageIndex, Math.max(gallery.length - 1, 0));
              const mainImage = gallery[safeImageIndex]?.url || selectedProduct.image;
              return (
                <>
                  <div className="product-detail-gallery">
                    <button
                      type="button"
                      className="product-detail-image product-detail-image-button"
                      onClick={() => { setImageLightboxOpen(true); setImageZoom(1); }}
                      aria-label="Ver imagen en grande"
                    >
                      <img
                        src={mainImage}
                        alt={selectedProduct.name}
                        onError={(event) => handleImageError(event, selectedProduct, activeVariant)}
                      />
                    </button>
                    {gallery.length > 1 && (
                      <div className="product-detail-thumbnails">
                        {gallery.map((img, i) => (
                          <button
                            key={`${img.url}-${i}`}
                            type="button"
                            className={`product-detail-thumbnail ${i === safeImageIndex ? "active" : ""}`}
                            onClick={() => setSelectedImageIndex(i)}
                          >
                            <img src={img.url} alt={`${selectedProduct.name} ${i + 1}`} />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {imageLightboxOpen && (
                    <div
                      className="product-image-lightbox"
                      onClick={() => { setImageLightboxOpen(false); setImageZoom(1); }}
                    >
                      <button
                        type="button"
                        className="product-image-lightbox-close"
                        onClick={(event) => { event.stopPropagation(); setImageLightboxOpen(false); setImageZoom(1); }}
                        aria-label="Cerrar imagen"
                      >
                        ×
                      </button>

                      {gallery.length > 1 && (
                        <>
                          <button
                            type="button"
                            className="product-image-lightbox-nav product-image-lightbox-prev"
                            onClick={(event) => {
                              event.stopPropagation();
                              setSelectedImageIndex((safeImageIndex - 1 + gallery.length) % gallery.length);
                              setImageZoom(1);
                            }}
                            aria-label="Imagen anterior"
                          >
                            ‹
                          </button>
                          <button
                            type="button"
                            className="product-image-lightbox-nav product-image-lightbox-next"
                            onClick={(event) => {
                              event.stopPropagation();
                              setSelectedImageIndex((safeImageIndex + 1) % gallery.length);
                              setImageZoom(1);
                            }}
                            aria-label="Imagen siguiente"
                          >
                            ›
                          </button>
                        </>
                      )}

                      <div
                        className="product-image-lightbox-content"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <img
                          src={mainImage}
                          alt={selectedProduct.name}
                          style={{ transform: `scale(${imageZoom})` }}
                          onError={(event) => handleImageError(event, selectedProduct, activeVariant)}
                        />
                      </div>

                      <div className="product-image-lightbox-controls" onClick={(event) => event.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => setImageZoom((zoom) => Math.max(1, Number((zoom - 0.25).toFixed(2))))}
                          disabled={imageZoom <= 1}
                          aria-label="Alejar"
                        >
                          −
                        </button>
                        <span>{Math.round(imageZoom * 100)}%</span>
                        <button
                          type="button"
                          onClick={() => setImageZoom((zoom) => Math.min(3, Number((zoom + 0.25).toFixed(2))))}
                          disabled={imageZoom >= 3}
                          aria-label="Acercar"
                        >
                          +
                        </button>
                        <button
                          type="button"
                          className="product-image-lightbox-reset"
                          onClick={() => setImageZoom(1)}
                        >
                          Restablecer
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="product-detail-info">
                    <span>{selectedProduct.category}</span>
                    <h2 style={{fontSize:"clamp(28px, 7vw, 32px)", margin:"7px 0 6px", lineHeight:1.08}}>{selectedProduct.name}</h2>
                    <div
                      className="product-price-share-row"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "14px",
                        margin: "2px 0 18px",
                        width: "100%",
                      }}
                    >
                      <strong style={{fontSize:"clamp(25px, 6vw, 28px)", lineHeight:1.1, margin:0}}>
                        {Number(selectedProduct.price) === 0
                          ? "Precio a consultar"
                          : `$${selectedProduct.price.toLocaleString("es-AR")}`}
                      </strong>
                      <button
                        type="button"
                        onClick={shareProduct}
                        aria-label="Compartir producto"
                        title="Compartir producto"
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          width: "34px",
                          height: "34px",
                          flex: "0 0 34px",
                          padding: "0",
                          margin: "0",
                          border: "0",
                          borderRadius: "0",
                          background: "transparent",
                          color: "#a85f78",
                          cursor: "pointer",
                          fontFamily: "inherit",
                          boxSizing: "border-box",
                        }}
                      >
                        <svg
                          width="25"
                          height="25"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden="true"
                          focusable="false"
                        >
                          <path d="M21.5 2.5 14.5 21.5 10.5 13.5 2.5 9.5 21.5 2.5Z" />
                        </svg>
                      </button>
                    </div>
                    {variants.length > 0 && (
                      <div style={{marginTop:12}}>
                        <div style={{fontWeight:600,fontSize:"clamp(17px, 4.5vw, 19px)",marginBottom:7}}>Elegí color / modelo</div>
                        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                          {variants.map((variant,index)=>{
                          const variantOutOfStock = Number(variant.stock ?? 0) <= 0;
                          return (
                            <button
                              key={index}
                              type="button"
                              onClick={() => {
                                setSelectedVariantIndex(index);
                                setSelectedImageIndex(0);
                                setImageLightboxOpen(false);
                                setImageZoom(1);
                              }}
                              aria-label={`${variant.name || variant.code}${variantOutOfStock ? " — Sin stock" : ""}`}
                              style={{padding:"8px 13px",fontSize:"15px",borderRadius:999,border:index===selectedVariantIndex?"2px solid #7b4256":"1px solid #ddd",background:index===selectedVariantIndex?"#f8edf2":"#fff",cursor:"pointer",opacity:variantOutOfStock?0.58:1,textDecoration:variantOutOfStock?"line-through":"none"}}
                            >
                              {variant.name || variant.code}{variantOutOfStock ? " · Sin stock" : ""}
                            </button>
                          );
                        })}
                        </div>
                        {activeVariant && <small style={{display:"block",marginTop:7,fontSize:"14px",color:"#777"}}>Código: {activeVariant.code || "—"} · Stock: {Number(activeVariant.stock ?? 0)}</small>}
                      </div>
                    )}
                    <p style={{fontSize:"clamp(15px, 4vw, 17px)",lineHeight:1.55,margin:"18px 0 20px",color:"#756b6e"}}>{selectedProduct.description}</p>
                    {Number(selectedProduct.price) === 0 ? (
                      <button
                        className="add-button"
                        onClick={() => {
                          const phoneNumber = "5493876745397";
                          const variantText = activeVariant?.name
                            ? `\nModelo/color: ${activeVariant.name}`
                            : "";
                          const message = `Hola! Quería consultar el precio de "${selectedProduct.name}".${variantText}\n\n¿Me pasan el precio, por favor?`;
                          const whatsappUrl = `https://wa.me/${phoneNumber}?text=` + encodeURIComponent(message);
                          window.open(whatsappUrl, "_blank", "noopener,noreferrer");
                        }}
                      >
                        Precio a consultar
                      </button>
                    ) : (
                      <button className="add-button" disabled={(variants.length > 0 && (!activeVariant || Number(activeVariant.stock ?? 0) <= 0)) || (variants.length === 0 && Number(selectedProduct.stock ?? 0) <= 0)} onClick={() => {
                        if (variants.length > 0 && selectedVariantIndex == null) { alert("Elegí un color o modelo antes de agregar al carrito."); return; }
                        if (variants.length > 0 && Number(activeVariant?.stock ?? 0) <= 0) return;
                        if (variants.length === 0 && Number(selectedProduct.stock ?? 0) <= 0) return;
                        addToCart(selectedProduct, activeVariant);
                        setSelectedProduct(null);
                        setSelectedVariantIndex(null);
                        setSelectedImageIndex(0);
                      }}>{(variants.length > 0 && activeVariant && Number(activeVariant.stock ?? 0) <= 0) || (variants.length === 0 && Number(selectedProduct.stock ?? 0) <= 0) ? "Sin stock" : "Agregar al carrito"}</button>
                    )}
                  </div>
                </>
              );
            })()}          </div>
        </div>
      )}

      {/* ================= CONTENIDO ================= */}

      <main>

        {/* ================= HERO / CARRUSEL ================= */}
        <section className="hero" id="inicio">
          <div
            className={`hero-slide hero-slide-${heroSlides[heroIndex]?.type || "welcome"}`}
            onMouseEnter={() => setHeroPaused(true)}
            onMouseLeave={() => setHeroPaused(false)}
            onTouchStart={handleHeroTouchStart}
            onTouchEnd={handleHeroTouchEnd}
          >
            <div className="hero-background">
              <div className="hero-blur-circle circle-one"></div>
              <div className="hero-blur-circle circle-two"></div>
              <div className="hero-product-shape">MATE</div>
              {heroSlides[heroIndex]?.image && (
                <img
                  key={`${heroSlides[heroIndex]?.type}-${heroSlides[heroIndex]?.image}-${heroIndex}`}
                  className="hero-slide-image"
                  src={heroSlides[heroIndex].image}
                  alt=""
                  aria-hidden="true"
                  onError={(event) => { event.currentTarget.style.display = "none"; }}
                />
              )}
            </div>

            {heroSlides.length > 1 && (
              <>
                <button type="button" className="hero-arrow hero-arrow-left" aria-label="Slide anterior" onClick={() => changeHeroSlide(-1)}>‹</button>
                <button type="button" className="hero-arrow hero-arrow-right" aria-label="Siguiente slide" onClick={() => changeHeroSlide(1)}>›</button>
              </>
            )}

            <div
              className={`hero-content hero-content-${heroSlides[heroIndex]?.type || "welcome"}`}
              key={`${heroSlides[heroIndex]?.type}-${heroIndex}`}
            >
              <div className="hero-copy">
                <div className="hero-eyebrow">{heroSlides[heroIndex]?.eyebrow}</div>

                {heroSlides[heroIndex]?.type === "welcome" && (
                  <img className="hero-logo-image" src="/dulce-abril-logo.png" alt="Dulce Abril — Tienda de Ideas" />
                )}

                <div className="hero-tagline">{heroSlides[heroIndex]?.tagline}</div>
                <p className="hero-text">{heroSlides[heroIndex]?.text}</p>

                <button type="button" className="hero-main-button" onClick={() => handleHeroAction(heroSlides[heroIndex])}>
                  {heroSlides[heroIndex]?.button}
                </button>
              </div>

              <div className="hero-dots" role="tablist" aria-label="Carrusel principal">
                {heroSlides.map((slide, index) => (
                  <button
                    key={`${slide.type}-${index}`}
                    type="button"
                    className={index === heroIndex ? "active" : ""}
                    aria-label={`Ir al slide ${index + 1}`}
                    aria-selected={index === heroIndex}
                    onClick={() => {
                      setHeroPaused(true);
                      setHeroIndex(index);
                      window.setTimeout(() => setHeroPaused(false), 8500);
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ================= BENEFICIOS ================= */}

        <section className="benefits">

          <div className="benefit">
            <div className="benefit-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 6h11v10H3z" />
                <path d="M14 10h4l3 3v3h-7z" />
                <circle cx="7" cy="18" r="1.7" />
                <circle cx="18" cy="18" r="1.7" />
              </svg>
            </div>

            <div>
              <strong>
                Envíos a todo el país
              </strong>

              <p>
                Recibí tu pedido donde estés
              </p>
            </div>
          </div>

          <div className="benefit">
            <div className="benefit-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 3l7 3v5c0 4.7-2.9 8.1-7 10-4.1-1.9-7-5.3-7-10V6l7-3z" />
                <path d="m8.5 11.8 2.2 2.2 4.8-5" />
              </svg>
            </div>

            <div>
              <strong>
                Compra segura
              </strong>

              <p>
                Comprá de manera simple
              </p>
            </div>
          </div>

          <div className="benefit">
            <div className="benefit-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="8" width="18" height="12" rx="1.5" />
                <path d="M12 8v12M3 12h18" />
                <path d="M12 8H8.5A2.5 2.5 0 1 1 11 5.5V8zM12 8h3.5A2.5 2.5 0 1 0 13 5.5V8z" />
              </svg>
            </div>

            <div>
              <strong>
                Los mejores regalos
              </strong>

              <p>
                Detalles para cada ocasión
              </p>
            </div>
          </div>

          <div
            className="benefit"
            onClick={openInstagram}
          >
            <div className="benefit-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20.8 8.7c0 5.2-8.8 10.1-8.8 10.1S3.2 13.9 3.2 8.7A4.7 4.7 0 0 1 12 6.1a4.7 4.7 0 0 1 8.8 2.6z" />
              </svg>
            </div>

            <div>
              <strong>
                Seguinos en Instagram
              </strong>

              <p>
                Mirá nuestras novedades
              </p>
            </div>
          </div>

        </section>

        {/* ================= DESTACADOS ================= */}

        <section
          className="featured-section"
          id="destacados"
        >

          <div className="featured-heading">

            <div>
              <p>
                DESCUBRÍ NUESTRA SELECCIÓN
              </p>

              <h2>
                Productos destacados
              </h2>
            </div>

            <button
              onClick={goToProducts}
              className="view-all-button"
            >
              Ver todos
            </button>

          </div>

          <div className="featured-grid">

            {featuredProducts.map(
              (product, index) => (
                <article
                  className="product-card featured-card"
                  key={product.id}
                  onClick={() => { setSelectedProduct({...product, image: product.image}); setSelectedVariantIndex(null); setSelectedImageIndex(0); }}
                >

                  <div className="product-image">

                    {index < 2 && (
                      <span className="sold-badge">
                        Más vendido
                      </span>
                    )}

                    <img
                      src={product.image}
                      alt={product.name}
                      onError={(event) => handleImageError(event, product)}
                    />

                  </div>

                  <div className="product-info">

                    <span>
                      {product.category}
                    </span>

                    <h3>
                      {product.name}
                    </h3>

                    <strong>
                      {Number(product.price) === 0
                        ? "Precio a consultar"
                        : `$${product.price.toLocaleString("es-AR")}`}
                    </strong>

                    <button
                      className="add-button"
                      disabled={Number(product.price) === 0 ? false : (!product.variants?.length && Number(product.stock ?? 0) <= 0)}
                      onClick={(event) => {
                        event.stopPropagation();
                        if (Number(product.price) === 0) {
                          sendPriceInquiry(product);
                          return;
                        }
                        if (product.variants?.length) {
                          setSelectedProduct({...product, image: product.image});
                          setSelectedVariantIndex(null);
                          setSelectedImageIndex(0);
                        } else {
                          addToCart(product);
                        }
                      }}
                    >
                      {Number(product.price) === 0
                        ? "Precio a consultar"
                        : product.variants?.length
                          ? ((product.variants || []).some((variant) => Number(variant.stock ?? 0) > 0) ? "Elegir opciones" : "Sin stock")
                          : Number(product.stock ?? 0) <= 0
                            ? "Sin stock"
                            : "Agregar al carrito"}
                    </button>

                  </div>

                </article>
              )
            )}

          </div>
        </section>

        {/* ================= TODOS LOS PRODUCTOS ================= */}

        <section
          className="products-section"
          id="productos"
        >

          <div
            className="categories-anchor"
            id="categorias"
          />

          <div className="section-heading">

            <p>
              CONOCÉ NUESTRA COLECCIÓN
            </p>

            <h2>
              Todos los productos
            </h2>

            <span></span>

          </div>

          <div
            style={{
              maxWidth: "720px",
              margin: "0 auto 22px",
              padding: "0 4px",
            }}
          >
            <div
              className="catalog-search-box"
              style={{
                position: "relative",
                display: "flex",
                alignItems: "center",
                background: "#fff",
                border: "1px solid rgba(128, 77, 98, 0.18)",
                borderRadius: "18px",
                boxShadow: "0 8px 24px rgba(73, 45, 56, 0.07)",
                overflow: "hidden",
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  marginLeft: "16px",
                  fontSize: "20px",
                  lineHeight: 1,
                  opacity: 0.65,
                }}
              >
                🔎
              </span>

              <input
                type="search"
                ref={searchInputRef}
                value={productSearch}
                onChange={(event) => setProductSearch(event.target.value)}
                placeholder="¿Qué estás buscando?"
                aria-label="Buscar productos"
                autoComplete="off"
                style={{
                  flex: 1,
                  minWidth: 0,
                  border: "0",
                  outline: "0",
                  background: "transparent",
                  padding: "15px 12px",
                  fontSize: "16px",
                  color: "#3f3438",
                  fontFamily: "inherit",
                }}
              />

              {productSearch.trim() && (
                <button
                  type="button"
                  onClick={() => setProductSearch("")}
                  aria-label="Limpiar búsqueda"
                  title="Limpiar búsqueda"
                  style={{
                    width: "42px",
                    height: "42px",
                    marginRight: "6px",
                    border: "0",
                    borderRadius: "50%",
                    background: "transparent",
                    color: "#8f6070",
                    fontSize: "22px",
                    cursor: "pointer",
                  }}
                >
                  ×
                </button>
              )}
            </div>

            {(productSearch.trim() || selectedCategory !== "Todos") && (
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "12px",
                  marginTop: "9px",
                  padding: "0 6px",
                  fontSize: "13px",
                  color: "#806b73",
                }}
              >
                <span>
                  {filteredProducts.length === 0
                    ? "No encontramos productos"
                    : `${filteredProducts.length} ${
                        filteredProducts.length === 1
                          ? "producto encontrado"
                          : "productos encontrados"
                      }`}
                </span>

                {productSearch.trim() && (
                  <button
                    type="button"
                    onClick={() => setProductSearch("")}
                    style={{
                      border: 0,
                      background: "transparent",
                      padding: 0,
                      color: "#8f6070",
                      fontWeight: 600,
                      cursor: "pointer",
                      fontFamily: "inherit",
                    }}
                  >
                    Limpiar
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="category-filters">

            {categoryOptions.map((category) => (
              <button
                key={category}
                className={
                  selectedCategory === category
                    ? "category-button active"
                    : "category-button"
                }
                onClick={() =>
                  setSelectedCategory(category)
                }
              >
                {category}
              </button>
            ))}

          </div>

          <div className="product-grid">

            {loadingProducts ? (
              <p>Cargando productos...</p>
            ) : productsError ? (
              <div
                style={{
                  gridColumn: "1 / -1",
                  textAlign: "center",
                  padding: "48px 20px",
                  color: "#806b73",
                }}
              >
                <div style={{ fontSize: "42px", marginBottom: "10px" }}>⚠️</div>
                <h3
                  style={{
                    margin: "0 0 8px",
                    color: "#4a3a40",
                    fontSize: "20px",
                  }}
                >
                  No pudimos cargar los productos
                </h3>
                <p style={{ margin: "0 0 18px" }}>
                  Revisá tu conexión e intentá nuevamente.
                </p>
                <button
                  type="button"
                  className="promotion-button"
                  onClick={cargarProductos}
                >
                  Reintentar
                </button>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div
                style={{
                  gridColumn: "1 / -1",
                  textAlign: "center",
                  padding: "48px 20px",
                  color: "#806b73",
                }}
              >
                <div style={{ fontSize: "42px", marginBottom: "10px" }}>🔎</div>
                <h3
                  style={{
                    margin: "0 0 8px",
                    color: "#4a3a40",
                    fontSize: "20px",
                  }}
                >
                  No encontramos ese producto
                </h3>
                <p style={{ margin: 0 }}>
                  Probá con otro nombre, categoría o palabra.
                </p>
              </div>
            ) : (filteredProducts.map(
              (product) => (
                <article
                  className="product-card"
                  key={product.id}
                  onClick={() => { setSelectedProduct({...product, image: product.image}); setSelectedVariantIndex(null); setSelectedImageIndex(0); }}
                >

                  <div className="product-image">

                    <img
                      src={product.image}
                      alt={product.name}
                      onError={(event) => handleImageError(event, product)}
                    />

                  </div>

                  <div className="product-info">

                    <span>
                      {product.category}
                    </span>

                    <h3>
                      {product.name}
                    </h3>

                    <strong>
                      {Number(product.price) === 0
                        ? "Precio a consultar"
                        : `$${product.price.toLocaleString("es-AR")}`}
                    </strong>

                    <button
                      className="add-button"
                      disabled={Number(product.price) === 0 ? false : (!product.variants?.length && Number(product.stock ?? 0) <= 0)}
                      onClick={(event) => {
                        event.stopPropagation();
                        if (Number(product.price) === 0) {
                          sendPriceInquiry(product);
                          return;
                        }
                        if (product.variants?.length) {
                          setSelectedProduct({...product, image: product.image});
                          setSelectedVariantIndex(null);
                          setSelectedImageIndex(0);
                        } else {
                          addToCart(product);
                        }
                      }}
                    >
                      {Number(product.price) === 0
                        ? "Precio a consultar"
                        : product.variants?.length
                          ? ((product.variants || []).some((variant) => Number(variant.stock ?? 0) > 0) ? "Elegir opciones" : "Sin stock")
                          : Number(product.stock ?? 0) <= 0
                            ? "Sin stock"
                            : "Agregar al carrito"}
                    </button>

                  </div>

                </article>
              )
            ))}

          </div>

        </section>

        {/* ================= PROMOCIONES ================= */}

        <section
          className="promotions-section"
          id="promociones"
        >

          <div className="promotion-content">

            <p>
              PENSADO PARA VOS
            </p>

            <h2>
              Promociones especiales
            </h2>

            <span></span>

            <p className="promotion-text">
              Encontrá combos y propuestas
              especiales para regalar,
              compartir y disfrutar.
            </p>

          </div>

          {promotionProducts.length > 0 && (
            <div className="promotion-products-grid">
              {promotionProducts.map((product) => (
                <article
                  className="product-card promotion-product-card"
                  key={`promotion-${product.id}`}
                  onClick={() => {
                    setSelectedProduct({ ...product, image: product.image });
                    setSelectedVariantIndex(null);
                    setSelectedImageIndex(0);
                  }}
                >
                  <div className="product-image">
                    <img
                      src={product.image}
                      alt={product.name}
                      onError={(event) => handleImageError(event, product)}
                    />
                  </div>

                  <div className="product-info">
                    <span>{product.category}</span>
                    <h3>{product.name}</h3>
                    <strong>
                      {Number(product.price) === 0
                        ? "Precio a consultar"
                        : `$${product.price.toLocaleString("es-AR")}`}
                    </strong>
                    <button
                      className="add-button"
                      disabled={Number(product.price) === 0 ? false : (!product.variants?.length && Number(product.stock ?? 0) <= 0)}
                      onClick={(event) => {
                        event.stopPropagation();
                        if (Number(product.price) === 0) {
                          sendPriceInquiry(product);
                          return;
                        }
                        if (product.variants?.length) {
                          setSelectedProduct({ ...product, image: product.image });
                          setSelectedVariantIndex(null);
                          setSelectedImageIndex(0);
                        } else {
                          addToCart(product);
                        }
                      }}
                    >
                      {Number(product.price) === 0
                        ? "Precio a consultar"
                        : product.variants?.length
                          ? ((product.variants || []).some((variant) => Number(variant.stock ?? 0) > 0)
                              ? "Elegir opciones"
                              : "Sin stock")
                          : Number(product.stock ?? 0) <= 0
                            ? "Sin stock"
                            : "Agregar al carrito"}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}

          <button
            className="promotion-button promotion-see-all"
            onClick={() => {
              setSelectedCategory("Promociones");
              goToProducts();
            }}
          >
            Ver todas las promociones
          </button>

        </section>

        {/* ================= INSTAGRAM ================= */}
        <section
          className="instagram-section"
          id="instagram"
        >
          <div className="instagram-inner">
            <div className="instagram-copy">
              <p className="instagram-eyebrow">SOMOS PARTE DE TU DÍA ♡</p>

              <h2>Seguinos en Instagram</h2>

              <p className="instagram-description">
                Descubrí nuestras novedades, promociones y nuevos productos.
                Inspirate y encontrá ese detalle especial en Dulce Abril.
              </p>

            </div>

            <div
              className="instagram-showcase"
              aria-label="Publicación destacada de Instagram de Dulce Abril"
            >
              {instagramLoading ? (
                <div className="instagram-embed-status">
                  <span className="instagram-empty-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="5" />
                      <circle cx="12" cy="12" r="4" />
                      <circle cx="17.3" cy="6.7" r="1" fill="currentColor" stroke="none" />
                    </svg>
                  </span>
                  <strong>Cargando Instagram…</strong>
                  <span>Preparando nuestras publicaciones destacadas.</span>
                </div>
              ) : instagramPosts.length > 0 ? (
                <>
                  <div className="instagram-embed-stage">
                    {instagramPosts.map((post, index) => (
                      <div
                        key={`instagram-shell-${post.id}`}
                        className={`instagram-embed-shell ${index === instagramIndex ? "instagram-embed-active" : "instagram-embed-hidden"}`}
                        onPointerDown={index === instagramIndex ? pauseInstagramAutoplay : undefined}
                        onFocusCapture={index === instagramIndex ? pauseInstagramAutoplay : undefined}
                        aria-hidden={index !== instagramIndex}
                      >
                        <blockquote
                          className="instagram-media"
                          data-instgrm-permalink={post.post_url}
                          data-instgrm-version="14"
                        >
                          <a
                            href={post.post_url}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Ver esta publicación en Instagram
                          </a>
                        </blockquote>
                      </div>
                    ))}
                  </div>

                  <div className="instagram-showcase-footer">
                    {instagramPosts.length > 1 && (
                      <div className="instagram-post-controls" aria-label="Cambiar publicación destacada">
                        <button
                          type="button"
                          onClick={() => goToInstagramPost((instagramIndex - 1 + instagramPosts.length) % instagramPosts.length)}
                          aria-label="Publicación anterior"
                        >
                          ‹
                        </button>
                        <div className="instagram-post-dots">
                          {instagramPosts.map((post, index) => (
                            <button
                              type="button"
                              key={post.id}
                              className={index === instagramIndex ? "active" : ""}
                              onClick={() => goToInstagramPost(index)}
                              aria-label={`Ver publicación ${index + 1}`}
                            />
                          ))}
                        </div>
                        <button
                          type="button"
                          onClick={() => goToInstagramPost((instagramIndex + 1) % instagramPosts.length)}
                          aria-label="Siguiente publicación"
                        >
                          ›
                        </button>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <button
                  type="button"
                  className="instagram-empty-showcase"
                  onClick={openInstagram}
                >
                  <span className="instagram-empty-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="5" />
                      <circle cx="12" cy="12" r="4" />
                      <circle cx="17.3" cy="6.7" r="1" fill="currentColor" stroke="none" />
                    </svg>
                  </span>
                  <strong>@dulce_abril0</strong>
                  <span>La dueña puede elegir publicaciones desde el panel.</span>
                  <span className="instagram-empty-link">Ver Instagram ↗</span>
                </button>
              )}
            </div>
          </div>
        </section>

      </main>

      {/* ================= BÚSQUEDA MÓVIL ================= */}
      {mobileSearchOpen && (
        <div className="mobile-search-page" role="dialog" aria-modal="true" aria-label="Buscar productos">
          <div className="mobile-search-header">
            <button
              type="button"
              className="mobile-search-back"
              onClick={() => setMobileSearchOpen(false)}
              aria-label="Volver"
            >
              <span>‹</span>
            </button>

            <div className="mobile-search-title">
              <span>BUSCAR</span>
              <strong>Encontrá tu producto</strong>
            </div>
          </div>

          <div className="mobile-search-input-wrap">
            <NavIcon type="search" size={21} />
            <input
              ref={mobileSearchInputRef}
              type="search"
              value={productSearch}
              onChange={(event) => setProductSearch(event.target.value)}
              placeholder="¿Qué estás buscando?"
              aria-label="Buscar productos"
              autoComplete="off"
            />
            {productSearch.trim() && (
              <button
                type="button"
                className="mobile-search-clear"
                onClick={() => setProductSearch("")}
                aria-label="Limpiar búsqueda"
              >
                ×
              </button>
            )}
          </div>

          <div className="mobile-search-meta">
            {productSearch.trim()
              ? `${filteredProducts.length} ${filteredProducts.length === 1 ? "producto encontrado" : "productos encontrados"}`
              : "Buscá por nombre, categoría o característica"}
          </div>

          <div className="mobile-search-results">
            {loadingProducts ? (
              <p className="mobile-search-status">Cargando productos...</p>
            ) : productsError ? (
              <div className="mobile-search-empty">
                <span style={{ fontSize: "30px" }} aria-hidden="true">⚠️</span>
                <strong>No pudimos cargar los productos</strong>
                <span>Revisá tu conexión e intentá nuevamente.</span>
                <button
                  type="button"
                  className="promotion-button"
                  onClick={cargarProductos}
                >
                  Reintentar
                </button>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="mobile-search-empty">
                <NavIcon type="search" size={30} />
                <strong>No encontramos ese producto</strong>
                <span>Probá con otro nombre o palabra.</span>
              </div>
            ) : (
              filteredProducts.map((product) => (
                <button
                  type="button"
                  className="mobile-search-result"
                  key={product.id}
                  onClick={() => {
                    setSelectedProduct({ ...product, image: product.image });
                    setSelectedVariantIndex(null);
                    setSelectedImageIndex(0);
                    setMobileSearchOpen(false);
                  }}
                >
                  <div className="mobile-search-result-image">
                    <img
                      src={product.image}
                      alt={product.name}
                      onError={(event) => handleImageError(event, product)}
                    />
                  </div>
                  <div className="mobile-search-result-info">
                    <span>{product.category}</span>
                    <strong>{product.name}</strong>
                    <em>
                      {Number(product.price) === 0
                        ? "Precio a consultar"
                        : `$${product.price.toLocaleString("es-AR")}`}
                    </em>
                  </div>
                  <span className="mobile-search-result-arrow">›</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {/* ================= FOOTER ================= */}

      <footer className="footer">
        <div className="footer-main">
          <div className="footer-brand">
            <button type="button" className="footer-brand-button" onClick={() => goTo("inicio")} aria-label="Volver al inicio">
              <img src="/dulce-abril-logo.png" alt="Dulce Abril" className="footer-logo-image" />
            </button>
            <p className="footer-tagline">Regalos que enamoran</p>
            <p className="footer-description">
              Detalles pensados para regalar, compartir y hacer especial cada momento.
            </p>
          </div>

          <div className="footer-column">
            <h3>Explorá</h3>
            <button type="button" onClick={() => goTo("inicio")}>Inicio</button>
            <button type="button" onClick={goToProducts}>Productos</button>
            <button type="button" onClick={goToCategories}>Categorías</button>
            <button type="button" onClick={goToPromotions}>Promociones</button>
          </div>

          <div className="footer-column">
            <h3>Categorías</h3>
            <button type="button" onClick={() => { setSelectedCategory("Mates"); goToProducts(); }}>Mates</button>
            <button type="button" onClick={() => { setSelectedCategory("Termos"); goToProducts(); }}>Termos</button>
            <button type="button" onClick={() => { setSelectedCategory("Tazas"); goToProducts(); }}>Tazas</button>
            <button type="button" onClick={() => { setSelectedCategory("Regalería"); goToProducts(); }}>Regalería</button>
          </div>

          <div className="footer-column footer-contact">
            <h3>¿Hablamos?</h3>
            <p>Hacé tu pedido o consultanos por el medio que prefieras.</p>
            <button type="button" className="footer-contact-link" onClick={() => window.open("https://wa.me/5493876745397", "_blank", "noopener,noreferrer")}>
              <span className="footer-contact-icon footer-contact-icon-whatsapp" aria-hidden="true">
                <svg viewBox="0 0 24 24" role="img" aria-hidden="true">
                  <path d="M20.5 3.5A11.75 11.75 0 0 0 12.1 0C5.6 0 .3 5.3.3 11.8c0 2.1.6 4.1 1.6 5.9L.2 24l6.5-1.7c1.7.9 3.5 1.3 5.4 1.3h.1c6.5 0 11.8-5.3 11.8-11.8 0-3.2-1.2-6.1-3.5-8.3Zm-8.3 18.1h-.1c-1.7 0-3.4-.5-4.8-1.3l-.3-.2-3.8 1 1-3.7-.2-.3a9.8 9.8 0 1 1 8.2 4.5Zm5.4-7.3c-.3-.2-1.8-.9-2.1-1-.3-.1-.5-.2-.7.2-.2.3-.8 1-.9 1.2-.2.2-.3.2-.6.1-1.6-.8-2.6-1.4-3.6-3.2-.3-.5.3-.5.8-1.7.1-.2 0-.4 0-.5s-.7-1.7-1-2.3c-.3-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1.1 1.1-1.1 2.7s1.1 3.1 1.2 3.3c.2.2 2.1 3.2 5.1 4.5.7.3 1.3.5 1.7.7.7.2 1.3.2 1.8.1.6-.1 1.8-.7 2.1-1.4.3-.7.3-1.3.2-1.4 0-.2-.2-.3-.5-.4Z"/>
                </svg>
              </span>
              WhatsApp
              <span aria-hidden="true">↗</span>
            </button>
            <button type="button" className="footer-contact-link" onClick={openInstagram}>
              <span className="footer-contact-icon footer-contact-icon-instagram" aria-hidden="true">
                <svg viewBox="0 0 24 24" role="img" aria-hidden="true">
                  <rect x="3.2" y="3.2" width="17.6" height="17.6" rx="5" ry="5"/>
                  <circle cx="12" cy="12" r="4.1"/>
                  <circle cx="17.7" cy="6.5" r="1.1" className="instagram-dot"/>
                </svg>
              </span>
              Instagram
              <span aria-hidden="true">↗</span>
            </button>
          </div>
        </div>

        <div className="footer-bottom">
          <span>© 2026 Dulce Abril · Todos los derechos reservados</span>
          <span className="footer-developer">Sitio web desarrollado por <strong>Chuncho</strong></span>
        </div>
      </footer>

            {/* ================= NAV MÓVIL ================= */}

      <nav className="mobile-bottom-nav">

        <button
          className="mobile-nav-active"
          onClick={() => goTo("inicio")}
          aria-label="Inicio"
        >
          <span><NavIcon type="home" size={22} /></span>
          <small>Inicio</small>
        </button>

        <button
          type="button"
          onClick={goToSearch}
          aria-label="Buscar productos"
        >
          <span><NavIcon type="search" size={22} /></span>
          <small>Buscar</small>
        </button>

        <button
          type="button"
          onClick={() => setCartOpen(true)}
          className="mobile-cart-button"
          aria-label="Abrir carrito"
        >
          <span>
            <NavIcon type="cart" size={22} />
            {cartItemsCount > 0 && (
              <b>{cartItemsCount}</b>
            )}
          </span>
          <small>Carrito</small>
        </button>

        <button
          type="button"
          onClick={openInstagram}
          aria-label="Instagram"
        >
          <span><NavIcon type="instagram" size={22} /></span>
          <small>Instagram</small>
        </button>

      </nav>

    </div>
  );
}

export default App;