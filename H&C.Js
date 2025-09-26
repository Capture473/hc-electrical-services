// Minimal interactions for words-only template
(function(){
  const modal = document.getElementById('modal');
  const sticky = document.getElementById('sticky');
  const lead = document.getElementById('lead');
  const menuBtn = document.getElementById('menu-btn');
  const siteNav = document.getElementById('site-nav');
  const bar = document.querySelector('.bar');

  const MERCH_INVENTORY_KEY = 'hc-merch-inventory';
  const DEFAULT_MERCHANDISE = [
    { name:'Pro Work Shirt', price:28, stock:48, description:'Breathable, high-visibility crew tee built for long site days.', notes:'Sizes: S–XXL', imageUrl:'' },
    { name:'Insulated Travel Mug', price:18, stock:36, description:'Keeps coffee hot through site briefings and night callouts.', notes:'20 oz • Spill-resistant lid', imageUrl:'' },
    { name:'Hard Hat Decal Pack', price:12, stock:120, description:'UV-resistant vinyl decals for helmets, vans, and toolboxes.', notes:'Pack of 6', imageUrl:'' },
  ];

  // Timed modal (lead capture)
  setTimeout(()=>{ try{ modal?.showModal(); }catch(_){ /* no dialog support */ } }, 6000);

  // Close modal via X
  document.querySelector('.panel .x')?.addEventListener('click', ()=>{
    try{ modal?.close(); }catch(_){ }
  });

  // Lead form message
  lead?.addEventListener('submit', (e)=>{
    e.preventDefault();
    alert('Thanks! We will respond within 48 hours.');
    try{ modal?.close(); }catch(_){ }
  });

  // Hide sticky bar when booking CTA clicked
  sticky?.addEventListener('click', (e)=>{
    if(e.target.closest('a')) sticky.style.display = 'none';
  });

  // Mobile nav dropdown
  function setMenu(open){
    if(!menuBtn || !siteNav) return;
    menuBtn.setAttribute('aria-expanded', String(open));
    siteNav.classList.toggle('open', open);
  }
  menuBtn?.addEventListener('click', ()=>{
    const open = menuBtn.getAttribute('aria-expanded') !== 'true';
    setMenu(open);
  });
  // Close on escape
  document.addEventListener('keydown', (e)=>{
    if(e.key === 'Escape') setMenu(false);
  });
  // Close when a nav link is clicked
  siteNav?.addEventListener('click', (e)=>{
    const a = e.target.closest('a');
    if(a) setMenu(false);
  });
  // Close when clicking outside the nav
  document.addEventListener('click', (e)=>{
    if(!menuBtn || !siteNav) return;
    const within = e.target === menuBtn || menuBtn.contains(e.target) || siteNav.contains(e.target);
    if(!within) setMenu(false);
  }, { capture:true });

  // Set CSS var for header height (for anchor offset)
  function setHeaderVar(){
    if(!bar) return;
    const h = bar.offsetHeight || 68;
    document.documentElement.style.setProperty('--header-h', h + 'px');
  }
  setHeaderVar();
  window.addEventListener('resize', setHeaderVar);

  // Reveal on scroll for sections
  const reveals = document.querySelectorAll('.reveal');
  if('IntersectionObserver' in window && reveals.length){
    const io = new IntersectionObserver((entries)=>{
      entries.forEach(e=>{
        if(e.isIntersecting){
          e.target.classList.add('in');
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.12 });
    reveals.forEach(el=> io.observe(el));
  }else{
    // Fallback
    reveals.forEach(el=> el.classList.add('in'));
  }

  // Scroll spy for nav active state
  const sections = Array.from(document.querySelectorAll('main > section[id]'));
  const navLinks = Array.from(siteNav?.querySelectorAll('a[href^="#"]') || []);
  const byId = Object.fromEntries(navLinks.map(a=>[a.getAttribute('href').slice(1), a]));
  if('IntersectionObserver' in window && sections.length){
    const spy = new IntersectionObserver((entries)=>{
      entries.forEach(e=>{
        if(e.isIntersecting){
          const id = e.target.id;
          navLinks.forEach(a=> { a.classList.remove('active'); a.removeAttribute('aria-current'); });
          byId[id]?.classList.add('active');
          byId[id]?.setAttribute('aria-current','page');
        }
      });
    }, { rootMargin: '-40% 0px -55% 0px', threshold: 0.01 });
    sections.forEach(s=> spy.observe(s));
  }

  // Lightweight admin PIN gate (client-side only)
  const ADMIN_PIN = '4321';
  const ADMIN_KEY = 'hc-admin-auth';
  const hasAdminAccess = ()=> sessionStorage.getItem(ADMIN_KEY) === 'true';
  const requestAdminAccess = ()=>{
    if(hasAdminAccess()) return true;
    const attempt = prompt('Enter admin PIN to continue');
    if(attempt === null) return false;
    if(attempt.trim() === ADMIN_PIN){
      sessionStorage.setItem(ADMIN_KEY,'true');
      return true;
    }
    alert('Incorrect PIN.');
    return false;
  };

  document.querySelectorAll('a[data-requires-pin="true"]').forEach(link=>{
    link.addEventListener('click', (e)=>{
      if(hasAdminAccess()) return;
      e.preventDefault();
      if(requestAdminAccess()) window.location.href = link.href;
    });
  });

  initMerchInteractions();

  const isAdminPage = document.body?.dataset?.page === 'admin';
  if(isAdminPage){
    if(!hasAdminAccess() && !requestAdminAccess()){
      window.location.href = 'H&C.html';
      return;
    }
    initAdminDashboard();
  }

  function initMerchInteractions(){
    const grid = document.querySelector('[data-merch-grid]');
    const orderForm = document.getElementById('merch-order');
    if(!grid || !orderForm) return;
    const wrapper = orderForm.closest('[data-merch-order]');
    const hint = wrapper?.querySelector('[data-merch-hint]');
    const productSelect = orderForm.querySelector('select[name="product"]');
    const quantityInput = orderForm.querySelector('input[name="quantity"]');

    const state = { inventory: loadStorefrontInventory() };

    renderFromInventory();

    window.addEventListener('storage', (event)=>{
      if(event.key === MERCH_INVENTORY_KEY){
        state.inventory = loadStorefrontInventory();
        renderFromInventory();
      }
    });

    function renderFromInventory(){
      const inventory = state.inventory;
      renderStorefrontInventory(grid, inventory);
      syncOrderOptions(productSelect, inventory);

      const cards = Array.from(grid.querySelectorAll('.merch-card[data-product]'));

      if(!inventory.length){
        orderForm.setAttribute('hidden','');
        orderForm.classList.remove('is-visible');
        wrapper?.classList.remove('is-open');
        hint?.removeAttribute('hidden');
        if(hint) hint.textContent = 'Merchandise is temporarily unavailable. Check back soon.';
        return;
      }

      hint?.setAttribute('hidden','');

      const activate = (card)=>{
        const product = card?.dataset?.product;
        if(!product) return;
        showOrder(product);
        cards.forEach(c=> c.setAttribute('aria-expanded','false'));
        card.setAttribute('aria-expanded','true');
      };

      cards.forEach(card=>{
        card.addEventListener('click', ()=> activate(card));
        card.addEventListener('keydown', (e)=>{
          if(e.key === 'Enter' || e.key === ' '){
            e.preventDefault();
            activate(card);
          }
        });
      });
    }

    function showOrder(product){
      if(orderForm.hasAttribute('hidden')){
        orderForm.removeAttribute('hidden');
        orderForm.classList.add('is-visible');
        wrapper?.classList.add('is-open');
      }
      ensureOption(productSelect, product);
      if(productSelect){
        productSelect.value = product;
      }
      requestAnimationFrame(()=>{
        orderForm.scrollIntoView({ behavior:'smooth', block:'center' });
        try{
          quantityInput?.focus({ preventScroll:true });
        }catch(_){
          quantityInput?.focus();
        }
      });
    }
  }

  function initAdminDashboard(){
    const ROUTING_KEY = 'hc-merch-routing';
    const GOOGLE_KEY = 'hc-merch-google';
    const ADJUST_PIN = '4321';

    const catalogForm = document.getElementById('catalog-form');
    const stockForm = document.getElementById('stock-form');
    const routingForm = document.getElementById('routing-form');
    const googleForm = document.getElementById('google-form');
    const inventoryBody = document.getElementById('inventory-body');

    let inventory = loadInventory();
    let routing = loadRouting();
    let googleConfig = loadGoogle();

    renderInventory();
    populateRoutingForm();
    populateGoogleForm();

    catalogForm?.addEventListener('submit', (e)=>{
      e.preventDefault();
      const formData = new FormData(catalogForm);
      const item = normalizeItem({
        name: formData.get('product-name'),
        price: formData.get('price'),
        stock: formData.get('stock'),
        imageUrl: formData.get('image-url'),
        description: formData.get('description'),
        notes: formData.get('fulfillment')
      });
      if(!item.name){
        setFormNote(catalogForm, 'Product name is required.');
        return;
      }
      const pinPrompt = prompt('Enter passcode to save product details');
      if(pinPrompt?.trim() !== ADJUST_PIN){
        setFormNote(catalogForm, 'Passcode required to save product information.');
        return;
      }
      const matchIndex = findInventoryIndex(item);
      if(matchIndex > -1){
        inventory[matchIndex] = { ...inventory[matchIndex], ...item };
        setFormNote(catalogForm, `Updated ${item.name}.`);
      }else{
        inventory.push(item);
        setFormNote(catalogForm, `Added ${item.name} to inventory.`);
      }
      saveInventory();
      renderInventory();
      catalogForm.reset();
    });

    stockForm?.addEventListener('submit', (e)=>{
      e.preventDefault();
      const formData = new FormData(stockForm);
      const name = formData.get('adjust-product');
      const qty = Number(formData.get('adjust-qty'));
      const pin = formData.get('adjust-pin');
      if(!name){
        setFormNote(stockForm, 'Choose a product to adjust.');
        return;
      }
      if(!Number.isFinite(qty) || qty === 0){
        setFormNote(stockForm, 'Enter a positive or negative quantity to adjust.');
        return;
      }
      if(String(pin ?? '').trim() !== ADJUST_PIN){
        setFormNote(stockForm, 'Incorrect passcode. Stock not adjusted.');
        return;
      }
      const idx = inventory.findIndex(item=> item.name === name);
      if(idx === -1){
        setFormNote(stockForm, 'Product not found in inventory.');
        return;
      }
      const current = inventory[idx].stock ?? 0;
      const updated = Math.max(0, current + qty);
      inventory[idx].stock = updated;
      saveInventory();
      renderInventory();
      stockForm.reset();
      setFormNote(stockForm, qty > 0 ? `Added ${qty} to ${name}.` : `Removed ${Math.abs(qty)} from ${name}.`);
    });

    routingForm?.addEventListener('submit', (e)=>{
      e.preventDefault();
      const formData = new FormData(routingForm);
      routing = Object.fromEntries(formData.entries());
      localStorage.setItem(ROUTING_KEY, JSON.stringify(routing));
      setFormNote(routingForm, 'Routing preferences saved.');
    });

    googleForm?.addEventListener('submit', (e)=>{
      e.preventDefault();
      const formData = new FormData(googleForm);
      const config = Object.fromEntries(formData.entries());
      googleConfig = config;
      localStorage.setItem(GOOGLE_KEY, JSON.stringify(config));
      setFormNote(googleForm, 'Google account reference saved locally.');
    });

    inventoryBody?.addEventListener('click', (e)=>{
      const editBtn = e.target.closest('button[data-edit]');
      if(editBtn){
        const idx = Number(editBtn.dataset.index);
        if(Number.isInteger(idx) && inventory[idx]){
          loadItemIntoCatalog(idx);
        }
        return;
      }
      const deleteBtn = e.target.closest('button[data-delete]');
      if(deleteBtn){
        const idx = Number(deleteBtn.dataset.index);
        if(Number.isInteger(idx) && inventory[idx]){
          removeInventoryItem(idx);
        }
      }
    });

    function loadInventory(){
      try{
        const raw = JSON.parse(localStorage.getItem(MERCH_INVENTORY_KEY));
        if(Array.isArray(raw) && raw.length){
          return raw.map(normalizeItem).filter(Boolean);
        }
      }catch(_){/* ignore */}
      return DEFAULT_MERCHANDISE.map(item=>({ ...item }));
    }

    function saveInventory(){
      localStorage.setItem(MERCH_INVENTORY_KEY, JSON.stringify(inventory));
    }

    function loadRouting(){
      try{
        const raw = JSON.parse(localStorage.getItem(ROUTING_KEY));
        if(raw && typeof raw === 'object') return raw;
      }catch(_){/* ignore */}
      return {};
    }

    function loadGoogle(){
      try{
        const raw = JSON.parse(localStorage.getItem(GOOGLE_KEY));
        if(raw && typeof raw === 'object') return raw;
      }catch(_){/* ignore */}
      return {};
    }

    function renderInventory(){
      if(!inventoryBody) return;
      inventory.sort((a,b)=> a.name.localeCompare(b.name));
      inventoryBody.innerHTML = '';
      if(!inventory.length){
        const row = document.createElement('tr');
        const cell = document.createElement('td');
        cell.colSpan = 4;
        cell.className = 'muted small';
        cell.textContent = 'No inventory tracked yet.';
        row.appendChild(cell);
        inventoryBody.appendChild(row);
      }else{
        const formatter = new Intl.NumberFormat('en-US',{ style:'currency', currency:'USD' });
        inventory.forEach((item, index)=>{
          const row = document.createElement('tr');
          const nameCell = document.createElement('td');
          nameCell.textContent = item.name;
          const priceCell = document.createElement('td');
          priceCell.className = 'price';
          priceCell.textContent = Number.isFinite(item.price) ? formatter.format(item.price) : '—';
          const stockCell = document.createElement('td');
          stockCell.textContent = Number.isFinite(item.stock) ? String(item.stock) : '0';
          const actionsCell = document.createElement('td');
          actionsCell.className = 'actions';
          const editBtn = document.createElement('button');
          editBtn.type = 'button';
          editBtn.className = 'edit';
          editBtn.dataset.edit = 'true';
          editBtn.dataset.index = String(index);
          editBtn.textContent = 'Edit';
          const deleteBtn = document.createElement('button');
          deleteBtn.type = 'button';
          deleteBtn.className = 'delete';
          deleteBtn.dataset.delete = 'true';
          deleteBtn.dataset.index = String(index);
          deleteBtn.textContent = 'Remove';
          actionsCell.append(editBtn, deleteBtn);
          row.append(nameCell, priceCell, stockCell, actionsCell);
          inventoryBody.appendChild(row);
        });
      }
      refreshStockDropdown();
    }

    function refreshStockDropdown(){
      const select = stockForm?.querySelector('select[name="adjust-product"]');
      if(!select) return;
      const currentValue = select.value;
      select.innerHTML = '';
      inventory.forEach(item=>{
        const option = document.createElement('option');
        option.value = item.name;
        option.textContent = item.name;
        select.appendChild(option);
      });
      if(inventory.some(item=> item.name === currentValue)){
        select.value = currentValue;
      }
    }

    function populateRoutingForm(){
      if(!routingForm) return;
      Object.entries(routing).forEach(([key,value])=>{
        const field = routingForm.elements.namedItem(key);
        if(field && 'value' in field) field.value = value;
      });
    }

    function populateGoogleForm(){
      if(!googleForm) return;
      Object.entries(googleConfig).forEach(([key,value])=>{
        const field = googleForm.elements.namedItem(key);
        if(field && 'value' in field) field.value = value;
      });
    }

    function normalizeItem(raw){
      if(!raw || typeof raw !== 'object') return null;
      const name = String(raw.name || '').trim();
      if(!name) return null;
      const price = raw.price === '' || raw.price === null || raw.price === undefined ? undefined : Number(raw.price);
      const stock = raw.stock === '' || raw.stock === null || raw.stock === undefined ? undefined : Number(raw.stock);
      return {
        name,
        price: Number.isFinite(price) ? price : undefined,
        stock: Number.isFinite(stock) ? Math.max(0, Math.round(stock)) : 0,
        imageUrl: raw.imageUrl ? String(raw.imageUrl) : '',
        description: raw.description ? String(raw.description) : '',
        notes: raw.notes ? String(raw.notes) : ''
      };
    }

    function findInventoryIndex(item){
      return inventory.findIndex(existing=> existing.name.toLowerCase() === item.name.toLowerCase());
    }

    function setFormNote(form, message){
      const note = form?.querySelector('.form-note');
      if(note) note.textContent = message || '';
      const details = form?.closest('details');
      if(details) details.open = true;
    }

    function loadItemIntoCatalog(index){
      if(!catalogForm || !inventory[index]) return;
      const details = catalogForm.closest('details');
      if(details) details.open = true;
      const item = inventory[index];
      const fields = {
        'product-name': item.name,
        'price': item.price ?? '',
        'stock': item.stock ?? '',
        'image-url': item.imageUrl || '',
        'description': item.description || '',
        'fulfillment': item.notes || ''
      };
      Object.entries(fields).forEach(([name,value])=>{
        const field = catalogForm.elements.namedItem(name);
        if(field && 'value' in field) field.value = value;
      });
      catalogForm.scrollIntoView({ behavior:'smooth', block:'center' });
      setFormNote(catalogForm, `Editing ${item.name}. Remember to enter the passcode (4321) to save.`);
    }

    function removeInventoryItem(index){
      const item = inventory[index];
      if(!item) return;
      const pinPrompt = prompt(`Enter passcode to remove ${item.name}`);
      if(pinPrompt?.trim() !== ADJUST_PIN){
        alert('Incorrect passcode. Product not removed.');
        return;
      }
      const confirmRemove = confirm(`Remove ${item.name} from inventory?`);
      if(!confirmRemove) return;
      inventory.splice(index,1);
      saveInventory();
      renderInventory();
      setFormNote(stockForm, `${item.name} removed from inventory.`);
      syncOrderOptions(document.querySelector('#merch-order select[name="product"]'), inventory);
      if(catalogForm){
        const editingProduct = catalogForm.elements.namedItem('product-name');
        if(editingProduct && 'value' in editingProduct && editingProduct.value.trim().toLowerCase() === item.name.toLowerCase()){
          catalogForm.reset();
          setFormNote(catalogForm, 'Removed product cleared from editor.');
        }
      }
    }
  }

  function loadStorefrontInventory(){
    try{
      const raw = JSON.parse(localStorage.getItem(MERCH_INVENTORY_KEY));
      if(Array.isArray(raw) && raw.length){
        return raw.map(item=> normalizeStorefrontItem(item)).filter(Boolean);
      }
    }catch(_){/* ignore */}
    return DEFAULT_MERCHANDISE.map(item=> ({ ...item }));
  }

  function normalizeStorefrontItem(raw){
    if(!raw || typeof raw !== 'object') return null;
    const name = String(raw.name || '').trim();
    if(!name) return null;
    const price = raw.price === '' || raw.price === null || raw.price === undefined ? undefined : Number(raw.price);
    const stock = raw.stock === '' || raw.stock === null || raw.stock === undefined ? undefined : Number(raw.stock);
    return {
      name,
      price: Number.isFinite(price) ? price : undefined,
      stock: Number.isFinite(stock) ? Math.max(0, Math.round(stock)) : undefined,
      description: raw.description ? String(raw.description) : '',
      notes: raw.notes ? String(raw.notes) : '',
      imageUrl: raw.imageUrl ? String(raw.imageUrl) : ''
    };
  }

  function renderStorefrontInventory(grid, inventory){
    grid.innerHTML = '';
    if(!inventory.length){
      const empty = document.createElement('div');
      empty.className = 'merch-empty muted small';
      empty.textContent = 'Merchandise is being restocked. Please check back soon or contact our team to special-order.';
      grid.appendChild(empty);
      return;
    }

    const formatter = new Intl.NumberFormat('en-US',{ style:'currency', currency:'USD' });
    const frag = document.createDocumentFragment();
    inventory.forEach(item=>{
      const card = document.createElement('article');
      card.className = 'card merch-card';
      card.dataset.product = item.name;
      card.setAttribute('role','button');
      card.tabIndex = 0;
      card.setAttribute('aria-controls','merch-order');
      card.setAttribute('aria-expanded','false');

      const photo = document.createElement('div');
      photo.className = 'merch-photo merch-photo--dynamic';
      photo.setAttribute('aria-hidden','true');
      if(item.imageUrl){
        photo.style.backgroundImage = `url("${item.imageUrl}")`;
      }

      const stack = document.createElement('div');
      stack.className = 'stack gap';

      const title = document.createElement('div');
      title.className = 'title';
      title.textContent = item.name;

      const desc = document.createElement('p');
      desc.className = 'muted small';
      const descriptionText = item.description || item.notes || 'Branded H&C gear ready to ship.';
      desc.textContent = descriptionText;
      const notesUsedInDesc = !item.description && !!item.notes;

      const price = document.createElement('div');
      price.className = 'price';
      price.textContent = Number.isFinite(item.price) ? formatter.format(item.price) : 'Contact for pricing';

      if(item.notes && item.description){
        const meta = document.createElement('div');
        meta.className = 'muted small';
        meta.textContent = item.notes;
        stack.append(title, desc, price, meta);
      }else{
        stack.append(title, desc, price);
        if(item.notes && !notesUsedInDesc){
          const note = document.createElement('div');
          note.className = 'muted small';
          note.textContent = item.notes;
          stack.appendChild(note);
        }
      }

      if(Number.isFinite(item.stock)){
        const stockLabel = document.createElement('div');
        stockLabel.className = 'muted small merch-stock';
        if(item.stock <= 0){
          stockLabel.textContent = 'Currently out of stock';
          stockLabel.classList.add('out');
        }else{
          stockLabel.textContent = `In stock: ${item.stock}`;
        }
        stack.appendChild(stockLabel);
      }

      card.append(photo, stack);
      frag.appendChild(card);
    });
    grid.appendChild(frag);
  }

  function syncOrderOptions(select, inventory){
    if(!select) return;
    const previous = select.value;
    select.innerHTML = '';
    inventory.forEach(item=>{
      const option = document.createElement('option');
      option.value = item.name;
      option.textContent = item.name;
      select.appendChild(option);
    });
    if(!inventory.length){
      select.disabled = true;
      return;
    }
    select.disabled = false;
    if(inventory.some(item=> item.name === previous)){
      select.value = previous;
    }
  }

  function ensureOption(select, value){
    if(!select || !value) return;
    const exists = Array.from(select.options).some(opt=> opt.value === value);
    if(!exists){
      const option = new Option(value, value);
      select.appendChild(option);
    }
  }
})();
