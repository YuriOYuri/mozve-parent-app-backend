(function () {
  console.log("Mozve Storefront Script carregado");
  const LS_WAIT_TIMEOUT_MS = 5000;
  const LS_WAIT_INTERVAL_MS = 100;

  function safeJsonParse(value) {
    if (!value) {
      return null;
    }

    if (typeof value === "object") {
      return value;
    }

    try {
      return JSON.parse(value);
    } catch (error) {
      console.error("Erro ao fazer parse do LS.store:", error);
      return null;
    }
  }

  function normalizeStoreId(value) {
    const parsedValue = Number.parseInt(String(value ?? "").trim(), 10);

    if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
      return null;
    }

    return parsedValue;
  }

  function waitForLS(timeoutMs = LS_WAIT_TIMEOUT_MS) {
    if (window.LS) {
      return Promise.resolve(window.LS);
    }

    return new Promise((resolve) => {
      const startedAt = Date.now();
      const intervalId = window.setInterval(() => {
        if (window.LS) {
          window.clearInterval(intervalId);
          resolve(window.LS);
          return;
        }

        if (Date.now() - startedAt >= timeoutMs) {
          window.clearInterval(intervalId);
          resolve(null);
        }
      }, LS_WAIT_INTERVAL_MS);
    });
  }

  async function getStoreInfo() {
    const ls = await waitForLS();

    if (!ls) {
      return null;
    }

    if (ls.store) {
      return safeJsonParse(ls.store);
    }

    return null;
  }

  async function getTemplateFromLS() {
    const urlTemplate = new URLSearchParams(window.location.search).get(
      "template"
    );

    if (urlTemplate) {
      return String(urlTemplate).trim();
    }

    const ls = await waitForLS();

    if (!ls) {
      return "";
    }

    return String(ls.template ?? "").trim();
  }

  async function getDynamicStoreId() {
    const storeInfo = await getStoreInfo();
    return normalizeStoreId(storeInfo?.id);
  }

  const API_BASE =
    'https://mozve-parent-app-backend.onrender.com'
    // mudar isso sempr

  const DEFAULT_PREFERENCES = {
    appActive: true,
    workspaceName: 'Workspace principal',
    defaultEntry: 'Grupos',
    heroTitle: 'Configurações',
    itemType: 'Quadrado arredondado',
    storefrontSize: '30px',
    desktopSize: '60px',
    desktopAnchor: 'Antes',
    desktopSelector: '[data-store="product-form-{product_id}"]',
    mobileSize: '36px',
    mobileColumns: 4,
    mobileSpacing: '8px',
    similarTitle: 'Produtos similares',
    similarLimit: 6,
    similarPosition: 'Abaixo da galeria',
    similarSpacing: '20px',
  };

  function normalizeCssSize(value, fallback) {
    if (typeof value !== 'string') {
      return fallback;
    }

    const trimmed = value.trim();

    if (!trimmed) {
      return fallback;
    }

    if (/^\d+(\.\d+)?$/.test(trimmed)) {
      return `${trimmed}px`;
    }

    if (/^\d+(\.\d+)?(px|rem|em|%)$/.test(trimmed)) {
      return trimmed;
    }

    return fallback;
  }

  function normalizeCount(value, fallback, min, max) {
    const numericValue = Number.parseInt(String(value ?? ''), 10);

    if (!Number.isFinite(numericValue)) {
      return fallback;
    }

    return Math.min(max, Math.max(min, numericValue));
  }

  function getItemBorderRadius(itemType) {
    if (itemType === 'Quadrado') return '0';
    if (itemType === 'Circulo') return '999px';
    return '8px';
  }

  function getEffectiveItemSize(settings) {
    const fallbackSize = normalizeCssSize(settings.storefrontSize, '50px');
    const isMobile = window.matchMedia('(max-width: 768px)').matches;

    return isMobile
      ? normalizeCssSize(settings.mobileSize, fallbackSize)
      : normalizeCssSize(settings.desktopSize, fallbackSize);
  }

  function resolveProductSelector(selectorTemplate, productId) {
    if (typeof selectorTemplate !== 'string') {
      return '';
    }

    return selectorTemplate.replace(/\{product_id\}/g, String(productId));
  }

  function getAnchorInsertPosition(anchor) {
    if (anchor === 'Antes') return 'beforebegin';
    if (anchor === 'Dentro') return 'beforeend';
    return 'afterend';
  }

  function queryFirst(selectors) {
    for (const selector of selectors) {
      if (!selector) continue;

      const element = document.querySelector(selector);

      if (element) {
        return element;
      }
    }

    return null;
  }

  function getFallbackInsertionTarget(position, productId) {
    const galleryElement = queryFirst([
      '#single-product [data-store="product-images"]',
      '#single-product .js-product-gallery',
      '#single-product .product-gallery',
      '#single-product .swiper-container',
    ]);

    const priceElement = queryFirst([
      '#single-product [data-store="price"]',
      '#single-product .js-price-display',
      '#single-product .product-price',
      '#single-product .price',
    ]);

    const formElement = queryFirst([
      resolveProductSelector('[data-store="product-form-{product_id}"]', productId),
      '#single-product form',
    ]);

    if (position === 'Abaixo do preço' && priceElement) {
      return { element: priceElement, position: 'afterend' };
    }

    if (position === 'Antes do formulário' && formElement) {
      return { element: formElement, position: 'beforebegin' };
    }

    if (galleryElement) {
      return { element: galleryElement, position: 'afterend' };
    }

    if (priceElement) {
      return { element: priceElement, position: 'afterend' };
    }

    if (formElement) {
      return { element: formElement, position: 'beforebegin' };
    }

    return null;
  }

  function resolveInsertionPoint(settings, productId, fallbackElement) {
    const isMobile = window.matchMedia('(max-width: 768px)').matches;

    if (!isMobile) {
      const resolvedSelector = resolveProductSelector(
        settings.desktopSelector,
        productId
      );

      if (resolvedSelector) {
        const customElement = document.querySelector(resolvedSelector);

        if (customElement) {
          return {
            element: customElement,
            position: getAnchorInsertPosition(settings.desktopAnchor),
          };
        }
      }
    }

    const fallbackTarget = getFallbackInsertionTarget(
      settings.similarPosition,
      productId
    );

    if (fallbackTarget) {
      return fallbackTarget;
    }

    if (!fallbackElement) {
      return null;
    }

    return {
      element: fallbackElement,
      position: 'afterend',
    };
  }

  async function loadStorefrontPreferences(storeId) {
    try {
      const response = await fetch(
        `${API_BASE}/api/storefront/preferences?store_id=${storeId}`
      );

      if (!response.ok) {
        return DEFAULT_PREFERENCES;
      }

      const data = await response.json();

      return {
        ...DEFAULT_PREFERENCES,
        ...data,
      };
    } catch (error) {
      console.error('Erro ao carregar preferências públicas:', error);
      return DEFAULT_PREFERENCES;
    }
  }

  function getProductIdFromDOM() {
    const el = document.querySelector("[data-store^='product-name-']");
    if (!el) return null;

    const attr = el.getAttribute("data-store");
    if (!attr) return null;

    const match = attr.match(/product-name-(\d+)/);
    return match ? match[1] : null;
  }

  function isValidCssColor(value) {
    if (!value) return false;

    const option = new Option();
    option.style.color = value;

    return option.style.color !== "";
  }

  async function loadSimilar(storeId) {
    const productId = getProductIdFromDOM();

    if (!productId) {
      console.log("Produto não detectado");
      return;
    }

    try {
      const preferences = await loadStorefrontPreferences(storeId);

      if (!preferences.appActive) {
        return;
      }

      const response = await fetch(
        `${API_BASE}/api/storefront/similar/${productId}?store_id=${storeId}`
      );

      if (!response.ok) {
        console.error("Erro na requisição:", response.status);
        const text = await response.text();
        console.error("Resposta da API:", text);
        return;
      }

      const data = await response.json();

      if (!Array.isArray(data)) {
        console.log("Resposta inesperada da API");
        return;
      }

      const productTitle = document.querySelector(
        "#single-product > div > div.row > div.col > div > section > h1"
      );

      if (!productTitle) {
        console.log("Título não encontrado");
        return;
      }

      if (document.getElementById("mozve-similar-wrapper")) {
        return;
      }

      const insertionPoint = resolveInsertionPoint(
        preferences,
        productId,
        productTitle
      );

      if (!insertionPoint?.element) {
        console.log("Ponto de inserção não encontrado");
        return;
      }

      const wrapper = document.createElement("div");
      wrapper.id = "mozve-similar-wrapper";
      wrapper.style.marginTop = normalizeCssSize(
        preferences.similarSpacing,
        "10px"
      );

      const title = document.createElement("div");
      title.innerText = preferences.similarTitle || "Produtos similares";
      title.style.fontWeight = "600"; // título em negrito
      title.style.marginBottom = "10px"; // espaço entre o título e as imagens

      const container = document.createElement("div");
      const isMobile = window.matchMedia("(max-width: 768px)").matches;
      const itemSize = getEffectiveItemSize(preferences);
      const itemBorderRadius = getItemBorderRadius(preferences.itemType);
      const mobileColumns = normalizeCount(preferences.mobileColumns, 4, 1, 6);
      const mobileGap = normalizeCssSize(preferences.mobileSpacing, "8px");

      if (isMobile) {
        wrapper.style.paddingInline = "8px";
        wrapper.style.boxSizing = "border-box";
        container.style.display = "grid";
        container.style.gridTemplateColumns = `repeat(${mobileColumns}, minmax(0, ${itemSize}))`;
        container.style.gap = mobileGap;
      } else {
        container.style.display = "flex";
        container.style.flexWrap = "wrap";
        container.style.gap = "10px";
      }

      const filtered = data
        .filter((p) => String(p.id) !== String(productId))
        .slice(0, normalizeCount(preferences.similarLimit, 5, 1, 24));

      filtered.forEach((product) => {
        const displayName = product.name?.pt || product.name?.es || "";
        const shouldShowColorOnly = product.colorOnly === true;
        const hasValidShowcaseColor = isValidCssColor(product.showcaseColor);
        const hasImage = Boolean(product.images && product.images[0]);

        if (!shouldShowColorOnly && !hasImage) return;

        const visualElement = shouldShowColorOnly
          ? document.createElement("div")
          : document.createElement("img");

        visualElement.style.width = itemSize;
        visualElement.style.height = itemSize;
        visualElement.style.cursor = "pointer";
        visualElement.style.borderRadius = itemBorderRadius;
        visualElement.style.border = "1px solid #ddd";
        visualElement.style.boxSizing = "border-box";

        if (shouldShowColorOnly) {
          visualElement.style.display = "flex";
          visualElement.style.alignItems = "center";
          visualElement.style.justifyContent = "center";
          visualElement.style.backgroundColor = hasValidShowcaseColor
            ? product.showcaseColor
            : "#e5e7eb";
          visualElement.style.color = "#64748b";
          visualElement.style.fontSize = "18px";
          visualElement.style.fontWeight = "700";

          if (!hasValidShowcaseColor) {
            visualElement.textContent = "?";
          }
        } else {
          visualElement.src = product.images[0].src;
          visualElement.style.objectFit = "cover"; // pra garantir que a imagem preencha o espaço
        }

        visualElement.title =
          displayName || product.showcaseColor || "Cor disponível";

        visualElement.onmouseover = () => {
          visualElement.style.borderColor = "#333"; // muda a cor da borda passando o mouse
          visualElement.style.border = "2px solid #333"; // aumenta a borda com o mouse
          visualElement.style.transition = "border-color 0.3s"; // transição
          title.innerText = visualElement.title; // pega o nome ou a cor e mostra
        };
        visualElement.onmouseout = () => {
          visualElement.style.borderColor = "#ddd"
          visualElement.style.border = "1px solid #ddd";
          //title.innerText = "Cores disponíveis"; // volta pro título original
        };

        visualElement.onclick = () => {
          if (product.canonical_url) {
            window.location.href = product.canonical_url; // redireciona para a URL do produto similar
          }
        };

        container.appendChild(visualElement);
      });

      if (container.children.length > 0) {
        wrapper.appendChild(title);
        wrapper.appendChild(container);

        insertionPoint.element.insertAdjacentElement(
          insertionPoint.position,
          wrapper
        );
      }
    } catch (err) {
      console.error("Erro ao carregar similares:", err);
    }
  }

  async function initStorefrontScript() {
    const template = (await getTemplateFromLS()).toLowerCase();

    if (template !== "product") {
      console.log(`Template ignorado: ${template || "desconhecido"}`);
      return;
    }

    const storeId = await getDynamicStoreId();

    if (!storeId) {
      console.log("Store ID não detectado");
      return;
    }

    await loadSimilar(storeId);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initStorefrontScript);
  } else {
    initStorefrontScript();
  }
})();
