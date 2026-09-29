import { useEffect, useRef, useState } from "react";
import "./App.css";
import { products as localProducts } from "./products";
import { supabase } from "./supabase";

function App() {
  const [cart, setCart] = useState([]);
  const [products, setProducts] = useState(localProducts);
  const [cartOpen, setCartOpen] = useState(false);
    useEffect(() => {
    async function cargarProductos() {
      const { data, error } = await supabase
        .from("products")
        .select(`
          id,
          name,
          description,
          price,
          image_url,
          featured,
          active,
          category_id,
          categories (
            name
          )
        `)
        .eq("active", true);

      if (error) {
        console.error("Error cargando productos desde Supabase:", error);
        return;
      }

      if (data && data.length > 0) {
        const productosAdaptados = data.map((product) => ({
          id: product.id,
          name: product.name,
          category: product.categories?.name || "",
          price: Number(product.price),
          image: product.image_url,
          description: product.description || "",
          featured: product.featured === true,
          promotion: false,
        }));

        setProducts(productosAdaptados);
      }
    }

    cargarProductos();
  }, []);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState("Todos");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [heroSlideIndex, setHeroSlideIndex] = useState(0);
  const heroTouchStartX = useRef(null);

  const heroSlides = [
    {
      text: "Regalos, mates, termos y mucho más...",
      button: "Ver productos",
    },
    {
      text: "Ideas especiales para cada ocasión.",
      button: "Descubrir regalos",
    },
  ];

  const nextHeroSlide = () => {
    setHeroSlideIndex((current) => (current + 1) % heroSlides.length);
  };

  const previousHeroSlide = () => {
    setHeroSlideIndex(
      (current) => (current - 1 + heroSlides.length) % heroSlides.length,
    );
  };

  useEffect(() => {
    const timer = window.setInterval(nextHeroSlide, 5000);
    return () => window.clearInterval(timer);
  }, []);

  const handleHeroTouchStart = (event) => {
    heroTouchStartX.current = event.touches[0].clientX;
  };

  const handleHeroTouchEnd = (event) => {
    if (heroTouchStartX.current === null) return;

    const distance = event.changedTouches[0].clientX - heroTouchStartX.current;
    heroTouchStartX.current = null;

    if (Math.abs(distance) < 45) return;
    if (distance < 0) nextHeroSlide();
    else previousHeroSlide();
  };

  const featuredProducts = products.filter(
    (product) => product.featured === true,
  );

  const filteredProducts =
    selectedCategory === "Todos"
      ? products
      : selectedCategory === "Promociones"
        ? products.filter((product) => product.promotion === true)
        : products.filter((product) => product.category === selectedCategory);

  const addToCart = (product) => {
    setCart((currentCart) => {
      const existingProduct = currentCart.find(
        (item) => item.id === product.id,
      );

      if (existingProduct) {
        return currentCart.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        );
      }

      return [...currentCart, { ...product, quantity: 1 }];
    });
  };

  const increaseQuantity = (id) => {
    setCart((currentCart) =>
      currentCart.map((item) =>
        item.id === id ? { ...item, quantity: item.quantity + 1 } : item,
      ),
    );
  };

  const decreaseQuantity = (id) => {
    setCart((currentCart) =>
      currentCart
        .map((item) =>
          item.id === id ? { ...item, quantity: item.quantity - 1 } : item,
        )
        .filter((item) => item.quantity > 0),
    );
  };

  const removeFromCart = (id) => {
    setCart((currentCart) => currentCart.filter((item) => item.id !== id));
  };

  const cartItemsCount = cart.reduce((total, item) => total + item.quantity, 0);

  const cartTotal = cart.reduce(
    (total, item) => total + item.price * item.quantity,
    0,
  );

  const goTo = (id) => {
    setMobileMenuOpen(false);

    document.getElementById(id)?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  const goToProducts = () => goTo("productos");

  const goToCategories = () => goTo("categorias");

  const openInstagram = () => {
    window.open("https://www.instagram.com/dulce_abril/", "_blank");
  };

  const sendToWhatsApp = () => {
    const phoneNumber = "5493815086810";

    const orderDetails = cart
      .map(
        (item) =>
          `• ${item.name} x${item.quantity} — $${(
            item.price * item.quantity
          ).toLocaleString("es-AR")}`,
      )
      .join("\n");

    const message =
      `Hola! Quiero hacer un pedido en Dulce Abril:\n\n` +
      `${orderDetails}\n\n` +
      `Total: $${cartTotal.toLocaleString("es-AR")}\n\n` +
      `¡Gracias!`;

    const whatsappUrl =
      `https://wa.me/${phoneNumber}?text=` + encodeURIComponent(message);

    setCheckoutOpen(false);
    setCartOpen(false);

    window.open(whatsappUrl, "_blank");
  };

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
            <small>REGALOS QUE ENAMORAN</small>
          </button>

          <nav className="desktop-nav">
            <a href="#inicio">Inicio</a>
            <a href="#productos">Productos</a>
            <a href="#categorias">Categorías</a>
            <a href="#promociones">Promociones</a>
            <a href="#instagram">Instagram</a>
          </nav>

          <button
            className="cart-button"
            onClick={() => setCartOpen(true)}
            aria-label="Carrito"
          >
            <span className="cart-icon" aria-hidden="true">
              <svg
                viewBox="0 0 48 48"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M6 9h5l4 22h22l5-16H13" />
                <path d="M18 38h.01M34 38h.01" strokeWidth="4" />
              </svg>
            </span>

            {cartItemsCount > 0 && (
              <span className="cart-count">{cartItemsCount}</span>
            )}
          </button>
        </div>
      </header>

      {/* ================= MENU MÓVIL ================= */}

      {mobileMenuOpen && (
        <div
          className="mobile-menu-overlay"
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

            <button onClick={() => goTo("inicio")}>Inicio</button>

            <button onClick={() => goTo("productos")}>Productos</button>

            <button onClick={() => goTo("categorias")}>Categorías</button>

            <button onClick={() => goTo("promociones")}>Promociones</button>

            <button onClick={openInstagram}>Instagram</button>
          </div>
        </div>
      )}

      {/* ================= CARRITO ================= */}

      {cartOpen && (
        <div className="cart-overlay" onClick={() => setCartOpen(false)}>
          <aside
            className="cart-panel"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="cart-header">
              <div>
                <span>TU COMPRA</span>
                <h2>Tu carrito</h2>
              </div>

              <button className="cart-close" onClick={() => setCartOpen(false)}>
                ×
              </button>
            </div>

            {cart.length === 0 ? (
              <div className="empty-cart">
                <div className="empty-cart-icon">🛒</div>

                <h3>Tu carrito está vacío</h3>

                <p>Agregá algunos productos para comenzar tu compra.</p>

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
                    <div className="cart-item" key={item.id}>
                      <div className="cart-item-image">
                        <img src={item.image} alt={item.name} />
                      </div>

                      <div className="cart-item-info">
                        <span>{item.category}</span>

                        <h3>{item.name}</h3>

                        <strong>${item.price.toLocaleString("es-AR")}</strong>

                        <div className="quantity-controls">
                          <button onClick={() => decreaseQuantity(item.id)}>
                            −
                          </button>

                          <span>{item.quantity}</span>

                          <button onClick={() => increaseQuantity(item.id)}>
                            +
                          </button>
                        </div>
                      </div>

                      <button
                        className="remove-item"
                        onClick={() => removeFromCart(item.id)}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>

                <div className="cart-summary">
                  <div className="cart-total">
                    <span>Subtotal</span>

                    <strong>${cartTotal.toLocaleString("es-AR")}</strong>
                  </div>

                  <button
                    className="checkout-button"
                    onClick={() => setCheckoutOpen(true)}
                  >
                    Continuar con el pedido →
                  </button>

                  <button
                    className="whatsapp-cart-button"
                    onClick={sendToWhatsApp}
                  >
                    🟢 Enviar pedido por WhatsApp
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
      )}

      {/* ================= CHECKOUT ================= */}

      {checkoutOpen && (
        <div
          className="checkout-overlay"
          onClick={() => setCheckoutOpen(false)}
        >
          <div
            className="checkout-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              className="checkout-close"
              onClick={() => setCheckoutOpen(false)}
            >
              ×
            </button>

            <span>HACÉ TU PEDIDO</span>

            <h2>¿Cómo querés contactarnos?</h2>

            <p>Elegí el medio que prefieras para continuar con tu pedido.</p>

            <button
              className="checkout-option whatsapp"
              onClick={sendToWhatsApp}
            >
              🟢 WhatsApp
            </button>

            <button
              className="checkout-option instagram"
              onClick={() => {
                setCheckoutOpen(false);
                setCartOpen(false);
                openInstagram();
              }}
            >
              📸 Instagram
            </button>
          </div>
        </div>
      )}

      {/* ================= PRODUCTO ================= */}

      {selectedProduct && (
        <div
          className="product-detail-overlay"
          onClick={() => setSelectedProduct(null)}
        >
          <div
            className="product-detail-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              className="product-detail-close"
              onClick={() => setSelectedProduct(null)}
            >
              ×
            </button>

            <div className="product-detail-image">
              <img src={selectedProduct.image} alt={selectedProduct.name} />
            </div>

            <div className="product-detail-info">
              <span>{selectedProduct.category}</span>

              <h2>{selectedProduct.name}</h2>

              <strong>${selectedProduct.price.toLocaleString("es-AR")}</strong>

              <p>{selectedProduct.description}</p>

              <button
                className="add-button"
                onClick={() => {
                  addToCart(selectedProduct);
                  setSelectedProduct(null);
                }}
              >
                Agregar al carrito
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= CONTENIDO ================= */}

      <main>
        {/* ================= HERO ================= */}

        <section className="hero" id="inicio">
          <div
            className="hero-slide"
            onTouchStart={handleHeroTouchStart}
            onTouchEnd={handleHeroTouchEnd}
            onTouchCancel={() => {
              heroTouchStartX.current = null;
            }}
          >
            <div className="hero-background">
              <div className="hero-blur-circle circle-one"></div>
              <div className="hero-blur-circle circle-two"></div>
              <div className="hero-product-shape">MATE</div>
            </div>

            <div className="hero-content">
              <div className="hero-eyebrow">TUS MOMENTOS. MÁS DULCES</div>

              <img
                className="hero-logo-image"
                src="/dulce-abril-logo.png"
                alt="Dulce Abril — Tienda de Ideas"
              />

              <p className="hero-text">{heroSlides[heroSlideIndex].text}</p>

              <button className="hero-main-button" onClick={goToProducts}>
                {heroSlides[heroSlideIndex].button}
              </button>

              <div className="hero-dots" aria-label="Diapositivas del inicio">
                {heroSlides.map((_, index) => (
                  <button
                    key={index}
                    className={index === heroSlideIndex ? "active" : ""}
                    onClick={() => setHeroSlideIndex(index)}
                    aria-label={`Ir a la diapositiva ${index + 1}`}
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
              <svg
                viewBox="0 0 48 48"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M5 13h25v20H5z" />
                <path d="M30 20h7l6 7v6H30z" />
                <circle cx="13" cy="36" r="4" />
                <circle cx="36" cy="36" r="4" />
              </svg>
            </div>

            <div>
              <strong>Envíos a todo el país</strong>

              <p>Recibí tu pedido donde estés</p>
            </div>
          </div>

          <div className="benefit">
            <div className="benefit-icon" aria-hidden="true">
              <svg
                viewBox="0 0 48 48"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M24 5l16 6v11c0 10-6.5 17-16 21-9.5-4-16-11-16-21V11l16-6z" />
                <path d="M16 24l5 5 11-12" />
              </svg>
            </div>

            <div>
              <strong>Compra segura</strong>

              <p>Comprá de manera simple</p>
            </div>
          </div>

          <div className="benefit">
            <div className="benefit-icon" aria-hidden="true">
              <svg
                viewBox="0 0 48 48"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="7" y="18" width="34" height="25" rx="2" />
                <path d="M24 18v25M7 25h34" />
                <path d="M24 18H14c-5 0-6-7-1-9 5-1 9 4 11 9z" />
                <path d="M24 18h10c5 0 6-7 1-9-5-1-9 4-11 9z" />
              </svg>
            </div>

            <div>
              <strong>Los mejores regalos</strong>

              <p>Detalles para cada ocasión</p>
            </div>
          </div>

          <div className="benefit" onClick={openInstagram}>
            <div className="benefit-icon" aria-hidden="true">
              <svg
                viewBox="0 0 48 48"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M24 40S7 30 7 18c0-6 4-10 9-10 4 0 7 2 8 6 1-4 4-6 8-6 5 0 9 4 9 10 0 12-17 22-17 22z" />
              </svg>
            </div>

            <div>
              <strong>Seguinos en Instagram</strong>

              <p>Mirá nuestras novedades</p>
            </div>
          </div>
        </section>

        {/* ================= DESTACADOS ================= */}

        <section className="featured-section" id="destacados">
          <div className="featured-heading">
            <div>
              <p>DESCUBRÍ NUESTRA SELECCIÓN</p>

              <h2>Productos destacados</h2>
            </div>

            <button onClick={goToProducts} className="view-all-button">
              Ver todos
            </button>
          </div>

          <div className="featured-grid">
            {featuredProducts.map((product, index) => (
              <article
                className="product-card featured-card"
                key={product.id}
                onClick={() => setSelectedProduct(product)}
              >
                <div className="product-image">
                  {index < 2 && <span className="sold-badge">Más vendido</span>}

                  <img src={product.image} alt={product.name} />
                </div>

                <div className="product-info">
                  <span>{product.category}</span>

                  <h3>{product.name}</h3>

                  <strong>${product.price.toLocaleString("es-AR")}</strong>

                  <button
                    className="add-button"
                    onClick={(event) => {
                      event.stopPropagation();
                      addToCart(product);
                    }}
                  >
                    Agregar al carrito
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* ================= TODOS LOS PRODUCTOS ================= */}

        <section className="products-section" id="productos">
          <div className="categories-anchor" id="categorias" />

          <div className="section-heading">
            <p>CONOCÉ NUESTRA COLECCIÓN</p>

            <h2>Todos los productos</h2>

            <span></span>

            <small className="catalog-count">
              {filteredProducts.length}{" "}
              {filteredProducts.length === 1 ? "producto" : "productos"}
            </small>
          </div>

          <div className="category-filters">
            {[
              "Todos",
              "Mates",
              "Termos",
              "Tazas",
              "Regalería",
              "Promociones",
            ].map((category) => (
              <button
                key={category}
                className={
                  selectedCategory === category
                    ? "category-button active"
                    : "category-button"
                }
                onClick={() => setSelectedCategory(category)}
              >
                {category}
              </button>
            ))}
          </div>

          <div className="product-grid">
            {filteredProducts.length === 0 ? (
              <div className="catalog-empty">
                <h3>No hay productos en esta categoría</h3>
                <p>Pronto vamos a sumar nuevas opciones para vos.</p>
              </div>
            ) : (
              filteredProducts.map((product, index) => (
                <article
                  className="product-card"
                  key={product.id}
                  onClick={() => setSelectedProduct(product)}
                >
                  <div className="product-image">
                    {index < 2 && (
                      <span className="sold-badge">Más vendido</span>
                    )}

                    <img src={product.image} alt={product.name} />
                  </div>

                  <div className="product-info">
                    <span>{product.category}</span>

                    <h3>{product.name}</h3>

                    <strong>${product.price.toLocaleString("es-AR")}</strong>

                    <button
                      className="add-button"
                      onClick={(event) => {
                        event.stopPropagation();
                        addToCart(product);
                      }}
                    >
                      Agregar al carrito
                    </button>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>

        {/* ================= PROMOCIONES ================= */}

        <section className="promotions-section" id="promociones">
          <div className="promotion-content">
            <p>PENSADO PARA VOS</p>

            <h2>Promociones especiales</h2>

            <span></span>

            <p className="promotion-text">
              Encontrá combos y propuestas especiales para regalar, compartir y
              disfrutar.
            </p>

            <button
              className="promotion-button"
              onClick={() => {
                setSelectedCategory("Promociones");
                goToProducts();
              }}
            >
              Ver promociones
            </button>
          </div>
        </section>

        {/* ================= INSTAGRAM ================= */}

        <section className="instagram-section" id="instagram">
          <p>SOMOS PARTE DE TU DÍA ♡</p>

          <h2>Seguinos en Instagram</h2>

          <p>Mirá nuestras novedades, promociones y nuevos productos.</p>

          <button className="instagram-button" onClick={openInstagram}>
            @dulce_abril
          </button>
        </section>
      </main>

      {/* ================= FOOTER ================= */}

      <footer className="footer">
        <div className="footer-brand">
          <div className="footer-logo">Dulce Abril ♡</div>

          <p>Regalos que enamoran</p>
        </div>

        <div className="footer-contact">
          <strong>¿Querés hacer un pedido?</strong>

          <p>Escribinos por WhatsApp o Instagram.</p>
        </div>

        <div className="footer-bottom">
          <span>© 2026 Dulce Abril</span>

          <span>
            Sitio web desarrollado por <strong>Chuncho</strong>
          </span>
        </div>
      </footer>

      {/* ================= NAV MÓVIL ================= */}

      <nav className="mobile-bottom-nav">
        <button className="mobile-nav-active" onClick={() => goTo("inicio")}>
          <span>⌂</span>
          <small>Inicio</small>
        </button>

        <button onClick={goToCategories}>
          <span>☷</span>
          <small>Categorías</small>
        </button>

        <button
          onClick={() => setCartOpen(true)}
          className="mobile-cart-button"
        >
          <span className="mobile-cart-icon" aria-hidden="true">
            <svg
              viewBox="0 0 48 48"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M6 9h5l4 22h22l5-16H13" />
              <path d="M18 38h.01M34 38h.01" strokeWidth="4" />
            </svg>

            {cartItemsCount > 0 && <b>{cartItemsCount}</b>}
          </span>

          <small>Carrito</small>
        </button>

        <button onClick={openInstagram}>
          <span>♙</span>
          <small>Cuenta</small>
        </button>
      </nav>
    </div>
  );
}

export default App;
