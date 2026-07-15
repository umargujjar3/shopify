/* ============================================
   Spinexa Shopify Theme — JavaScript
   ============================================ */

(function () {
  'use strict';

  /* ---- Helpers ---- */
  const $ = (s, ctx = document) => ctx.querySelector(s);
  const $$ = (s, ctx = document) => Array.from(ctx.querySelectorAll(s));
  const on = (el, evt, fn) => el && el.addEventListener(evt, fn);
  const formatMoney = (cents) => {
    const amount = (cents / 100).toFixed(2);
    return window.theme && window.theme.moneyFormat
      ? window.theme.moneyFormat.replace('{{amount}}', amount)
      : '$' + amount;
  };

  /* ---- Header scroll ---- */
  function initHeaderScroll() {
    const header = $('.header');
    if (!header) return;
    const onScroll = () => {
      header.classList.toggle('scrolled', window.scrollY > 8);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* ---- Mobile Menu ---- */
  function initMobileMenu() {
    const menu = $('.mobile-menu');
    const openBtn = $('.header__menu-toggle');
    const closeBtn = $('.mobile-menu__close');
    if (!menu) return;

    const open = () => { menu.classList.add('open'); document.body.classList.add('no-scroll'); };
    const close = () => { menu.classList.remove('open'); document.body.classList.remove('no-scroll'); };

    on(openBtn, 'click', open);
    on(closeBtn, 'click', close);
    on($('.mobile-menu__overlay'), 'click', close);
    $$('.mobile-menu__link').forEach((l) => on(l, 'click', close));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
  }

  /* ---- Search Dropdown ---- */
  function initSearch() {
    const searchBtn = $('.header__search-toggle');
    const searchBox = $('.header__search');
    if (!searchBtn || !searchBox) return;
    on(searchBtn, 'click', (e) => { e.stopPropagation(); searchBox.classList.toggle('open'); });
    document.addEventListener('click', (e) => { if (!searchBox.contains(e.target) && e.target !== searchBtn) searchBox.classList.remove('open'); });
  }

  /* ---- Reveal on scroll ---- */
  function initReveal() {
    const reveals = $$('.reveal');
    if (!reveals.length) return;
    if (!('IntersectionObserver' in window)) {
      reveals.forEach((r) => r.classList.add('is-visible'));
      return;
    }
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          obs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -60px 0px' });
    reveals.forEach((r) => obs.observe(r));
  }

  /* ---- Accordion ---- */
  function initAccordion() {
    $$('.accordion__btn').forEach((btn) => {
      on(btn, 'click', () => {
        const item = btn.closest('.accordion__item');
        const isOpen = item.classList.contains('open');
        // Close siblings in same accordion
        const accordion = item.closest('.accordion');
        if (accordion) $$('.accordion__item', accordion).forEach((i) => i.classList.remove('open'));
        if (!isOpen) item.classList.add('open');
      });
    });
  }

  /* ---- Cart Drawer ---- */
  function initCartDrawer() {
    const overlay = $('.cart-drawer__overlay');
    const drawer = $('.cart-drawer');
    const openBtns = $$('[data-cart-open]');
    const closeBtn = $('.cart-drawer__close');
    if (!drawer) return;

    const open = () => { overlay.classList.add('open'); drawer.classList.add('open'); document.body.classList.add('no-scroll'); };
    const close = () => { overlay.classList.remove('open'); drawer.classList.remove('open'); document.body.classList.remove('no-scroll'); };

    openBtns.forEach((b) => on(b, 'click', (e) => { e.preventDefault(); open(); }));
    on(closeBtn, 'click', close);
    on(overlay, 'click', close);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
  }

  /* ---- AJAX Cart ---- */
  async function fetchCart() {
    const res = await fetch('/cart.js', { headers: { Accept: 'application/json' } });
    return res.json();
  }

  async function addToCart(id, qty) {
    const res = await fetch('/cart/add.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ id, quantity: qty }),
    });
    if (!res.ok) throw new Error('Add to cart failed');
    return res.json();
  }

  async function changeCart(line, qty) {
    const res = await fetch('/cart/change.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ line, quantity: qty }),
    });
    return res.json();
  }

  function renderCartDrawer(cart) {
    const itemsContainer = $('[data-cart-items]');
    const subtotalEl = $('[data-cart-subtotal]');
    const countEl = $('[data-cart-count]');
    const footerEl = $('[data-cart-footer]');

    if (countEl) countEl.textContent = cart.item_count;
    $$('[data-cart-count-badge]').forEach((el) => {
      el.textContent = cart.item_count;
      el.style.display = cart.item_count > 0 ? '' : 'none';
    });

    if (cart.item_count === 0) {
      if (itemsContainer) itemsContainer.innerHTML = `
        <div class="cart-drawer__empty">
          <div class="cart-drawer__empty-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 01-8 0"/></svg></div>
          <p class="cart-drawer__empty-title">${window.theme.strings.cart_empty}</p>
          <p class="cart-drawer__empty-text">${window.theme.strings.cart_empty_text}</p>
          <a href="/collections/all" class="btn btn-primary" style="margin-top:24px" data-cart-close>${window.theme.strings.cart_empty_button}</a>
        </div>`;
      if (footerEl) footerEl.style.display = 'none';
      const shippingBar = $('[data-cart-shipping]');
      if (shippingBar) shippingBar.style.display = 'none';
      return;
    }

    if (footerEl) footerEl.style.display = '';
    const shippingBar = $('[data-cart-shipping]');
    if (shippingBar) shippingBar.style.display = '';

    const threshold = window.theme.freeShippingThreshold || 250000;
    const remaining = Math.max(0, threshold - cart.total_price);
    const progress = Math.min(100, (cart.total_price / threshold) * 100);
    const shippingText = $('[data-shipping-text]');
    const progressBar = $('[data-shipping-progress]');
    if (shippingText) shippingText.innerHTML = remaining > 0
      ? `${window.theme.strings.add_more_prefix} <strong>${formatMoney(remaining)}</strong> ${window.theme.strings.add_more_suffix}`
      : window.theme.strings.free_shipping_unlocked;
    if (progressBar) progressBar.style.width = progress + '%';

    if (itemsContainer) {
      itemsContainer.innerHTML = cart.items.map((item, i) => `
        <div class="cart-drawer__item" data-line="${i + 1}">
          <a href="${item.url}" class="cart-drawer__item-img">
            <img src="${item.image}" alt="${item.title}" loading="lazy">
          </a>
          <div class="cart-drawer__item-info">
            <div class="cart-drawer__item-top">
              <a href="${item.url}" class="cart-drawer__item-title">${item.product_title}</a>
              <button class="cart-drawer__item-remove" data-remove="${i + 1}" aria-label="Remove">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg>
              </button>
            </div>
            <p class="cart-drawer__item-price">${formatMoney(item.price)}</p>
            <div class="cart-drawer__item-bottom">
              <div class="cart-qty">
                <button class="cart-qty__btn" data-qty-dec="${i + 1}" aria-label="Decrease"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14"/></svg></button>
                <span class="cart-qty__value">${item.quantity}</span>
                <button class="cart-qty__btn" data-qty-inc="${i + 1}" aria-label="Increase"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg></button>
              </div>
              <span class="cart-drawer__item-total">${formatMoney(item.final_line_price)}</span>
            </div>
          </div>
        </div>`).join('');
    }
    if (subtotalEl) subtotalEl.textContent = formatMoney(cart.total_price);
  }

  function initAjaxCart() {
    document.addEventListener('click', async (e) => {
      const addBtn = e.target.closest('[data-add-to-cart]');
      if (addBtn) {
        e.preventDefault();
        const id = addBtn.getAttribute('data-add-to-cart');
        const qtyInput = addBtn.closest('form')?.querySelector('[data-qty]');
        const qty = qtyInput ? parseInt(qtyInput.value) : 1;
        addBtn.classList.add('loading');
        const original = addBtn.innerHTML;
        addBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="spin"><path d="M21 12a9 9 0 11-6.219-8.56"/></svg>';
        try {
          await addToCart(id, qty);
          const cart = await fetchCart();
          renderCartDrawer(cart);
          // Open drawer
          const overlay = $('.cart-drawer__overlay');
          const drawer = $('.cart-drawer');
          if (overlay && drawer) { overlay.classList.add('open'); drawer.classList.add('open'); document.body.classList.add('no-scroll'); }
          addBtn.innerHTML = window.theme.strings.added;
          setTimeout(() => { addBtn.innerHTML = original; addBtn.classList.remove('loading'); }, 2000);
        } catch (err) {
          addBtn.innerHTML = original;
          addBtn.classList.remove('loading');
        }
      }

      const removeBtn = e.target.closest('[data-remove]');
      if (removeBtn) {
        e.preventDefault();
        const line = parseInt(removeBtn.getAttribute('data-remove'));
        const cart = await changeCart(line, 0);
        renderCartDrawer(cart);
      }

      const decBtn = e.target.closest('[data-qty-dec]');
      if (decBtn) {
        e.preventDefault();
        const line = parseInt(decBtn.getAttribute('data-qty-dec'));
        const item = decBtn.closest('.cart-drawer__item');
        const currentQty = parseInt(item.querySelector('.cart-qty__value').textContent);
        const cart = await changeCart(line, currentQty - 1);
        renderCartDrawer(cart);
      }

      const incBtn = e.target.closest('[data-qty-inc]');
      if (incBtn) {
        e.preventDefault();
        const line = parseInt(incBtn.getAttribute('data-qty-inc'));
        const item = incBtn.closest('.cart-drawer__item');
        const currentQty = parseInt(item.querySelector('.cart-qty__value').textContent);
        const cart = await changeCart(line, currentQty + 1);
        renderCartDrawer(cart);
      }

      const closeDrawer = e.target.closest('[data-cart-close]');
      if (closeDrawer) {
        const overlay = $('.cart-drawer__overlay');
        const drawer = $('.cart-drawer');
        if (overlay && drawer) { overlay.classList.remove('open'); drawer.classList.remove('open'); document.body.classList.remove('no-scroll'); }
      }
    });

    // Quantity selector (product page)
    $$('[data-qty-dec-page]').forEach((btn) => on(btn, 'click', () => {
      const input = btn.closest('.qty-selector').querySelector('[data-qty]');
      input.value = Math.max(1, parseInt(input.value) - 1);
    }));
    $$('[data-qty-inc-page]').forEach((btn) => on(btn, 'click', () => {
      const input = btn.closest('.qty-selector').querySelector('[data-qty]');
      input.value = parseInt(input.value) + 1;
    }));
  }

  /* ---- Cart page quantity updates ---- */
  function initCartPage() {
    const page = $('.cart-page');
    if (!page) return;
    $$('[data-page-qty-dec], [data-page-qty-inc], [data-page-remove]', page).forEach((btn) => {
      on(btn, 'click', () => {
        const form = btn.closest('form');
        if (form) form.submit();
      });
    });
  }

  /* ---- Social Proof Popup ---- */
  function initSocialProof() {
    const popup = $('.social-proof');
    if (!popup) return;
    const items = window.theme.socialProof || [];
    if (!items.length) return;
    let index = 0;
    let visible = false;

    const show = () => { popup.classList.remove('hidden'); visible = true; };
    const hide = () => { popup.classList.add('hidden'); visible = false; };
    const render = () => {
      const item = items[index];
      const card = $('.social-proof__card', popup);
      if (card) card.innerHTML = `
        <button class="social-proof__close" data-social-proof-close aria-label="Close">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>
        <div class="social-proof__icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><path d="M22 4L12 14.01l-3-3"/></svg></div>
        <div class="social-proof__text">
          <p class="social-proof__name">${item.name} from ${item.city}</p>
          <p class="social-proof__product">${window.theme.strings.just_purchased} ${item.product}</p>
          <p class="social-proof__time">${item.time} · <span class="social-proof__verified">${window.theme.strings.verified}</span></p>
        </div>`;
    };

    setTimeout(() => { render(); show(); }, 6000);
    setInterval(() => {
      hide();
      setTimeout(() => { index = (index + 1) % items.length; render(); show(); }, 600);
    }, 9000);

    on(document, 'click', (e) => {
      if (e.target.closest('[data-social-proof-close]')) popup.style.display = 'none';
    });
  }

  /* ---- Newsletter Popup ---- */
  function initNewsletterPopup() {
    const popup = $('.newsletter-popup');
    if (!popup) return;
    if (sessionStorage.getItem('spinexa_newsletter')) { popup.style.display = 'none'; return; }
    const delay = (window.theme.newsletterDelay || 12) * 1000;
    setTimeout(() => { popup.classList.add('open'); document.body.classList.add('no-scroll'); }, delay);

    on($('[data-newsletter-close]', popup), 'click', close);
    on($('.newsletter-popup__overlay', popup), 'click', close);
    $$('[data-newsletter-skip]', popup).forEach((b) => on(b, 'click', close));
    function close() { popup.classList.remove('open'); document.body.classList.remove('no-scroll'); sessionStorage.setItem('spinexa_newsletter', '1'); }

    const form = $('[data-newsletter-form]', popup);
    if (form) on(form, 'submit', (e) => {
      e.preventDefault();
      const successEl = $('[data-newsletter-success]', popup);
      const contentEl = $('[data-newsletter-content]', popup);
      if (successEl && contentEl) { contentEl.style.display = 'none'; successEl.style.display = 'flex'; }
      setTimeout(close, 2500);
    });
  }

  /* ---- Newsletter Section ---- */
  function initNewsletterSection() {
    const form = $('[data-newsletter-section]');
    if (!form) return;
    on(form, 'submit', (e) => {
      e.preventDefault();
      const wrap = form.closest('.newsletter__wrap');
      const success = $('[data-newsletter-section-success]', wrap);
      if (success) { form.style.display = 'none'; success.style.display = 'flex'; }
    });
  }

  /* ---- Discount Banner ---- */
  function initDiscountBanner() {
    const banner = $('.discount-banner');
    if (!banner) return;
    if (sessionStorage.getItem('spinexa_discount')) { banner.style.display = 'none'; return; }
    on($('[data-discount-close]', banner), 'click', () => { banner.style.display = 'none'; sessionStorage.setItem('spinexa_discount', '1'); });
  }

  /* ---- Product Gallery ---- */
  function initProductGallery() {
    const mainImg = $('.product__main-image img');
    const thumbs = $$('.product__thumb');
    if (!mainImg || !thumbs.length) return;
    thumbs.forEach((thumb) => on(thumb, 'click', () => {
      thumbs.forEach((t) => t.classList.remove('active'));
      thumb.classList.add('active');
      mainImg.src = thumb.querySelector('img').src;
      mainImg.removeAttribute('srcset');
    }));

    // Zoom on hover
    const zoomContainer = $('.product__main-image');
    if (zoomContainer) {
      on(zoomContainer, 'mousemove', (e) => {
        const rect = zoomContainer.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        mainImg.style.transformOrigin = `${x}% ${y}%`;
        mainImg.style.transform = 'scale(2)';
      });
      on(zoomContainer, 'mouseleave', () => { mainImg.style.transform = 'scale(1)'; });
    }
  }

  /* ---- Collection Sort ---- */
  function initCollectionSort() {
    const sortBtn = $('.collection-sort__btn');
    const sortMenu = $('.collection-sort__menu');
    if (!sortBtn || !sortMenu) return;
    on(sortBtn, 'click', (e) => { e.stopPropagation(); sortMenu.classList.toggle('open'); });
    document.addEventListener('click', () => sortMenu.classList.remove('open'));
    $$('.collection-sort__option', sortMenu).forEach((opt) => on(opt, 'click', () => {
      const value = opt.getAttribute('data-sort');
      const select = $('#sort-select');
      if (select) { select.value = value; select.closest('form').submit(); }
    }));
  }

  /* ---- Product form variant selection ---- */
  function initVariantSelect() {
    const form = $('[data-product-form]');
    if (!form) return;
    $$('select[data-variant-select]', form).forEach((sel) => on(sel, 'change', () => {
      const selected = $$('select[data-variant-select]', form).map((s) => s.value);
      const variantId = selected.join(' / ');
      const variantInput = $('[data-variant-id]', form);
      $$('[data-variant-option]', form).forEach((opt) => {
        if (opt.getAttribute('data-variant-option') === variantId) {
          if (variantInput) variantInput.value = opt.getAttribute('data-variant-id');
        }
      });
    }));
  }

  /* ---- Init all ---- */
  function init() {
    initHeaderScroll();
    initMobileMenu();
    initSearch();
    initReveal();
    initAccordion();
    initCartDrawer();
    initAjaxCart();
    initCartPage();
    initSocialProof();
    initNewsletterPopup();
    initNewsletterSection();
    initDiscountBanner();
    initProductGallery();
    initCollectionSort();
    initVariantSelect();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
