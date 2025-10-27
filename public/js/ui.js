// public/js/ui.js
// UI helpers for CollegeBuddy: theme toggle, image preview/upload flow,
// search debounce, and small UX helpers.
// Defensive: will not throw if socket/meId/chatId are not present yet.

// small DOM ready helper
function onReady(fn) {
  if (document.readyState !== 'loading') return fn();
  document.addEventListener('DOMContentLoaded', fn);
}

onReady(() => {
  // THEME TOGGLE (persist to localStorage)
  const themeToggle = document.getElementById('themeToggle');
  const savedTheme = localStorage.getItem('cb_theme') || 'dark';
  if (savedTheme === 'light') document.body.classList.add('light');

  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      document.body.classList.toggle('light');
      localStorage.setItem('cb_theme', document.body.classList.contains('light') ? 'light' : 'dark');
    });
  }

  // SEARCH DEBOUNCE (updates a form input or triggers submit)
  const searchInput = document.getElementById('searchInput');
  let searchTimer = null;
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => {
        // if you have a form with id="searchForm", submit it; otherwise update location
        const form = document.getElementById('searchForm');
        if (form) return form.submit();

        // fallback: update URL query param 'q' and reload
        const q = encodeURIComponent(e.target.value.trim());
        const filter = (document.querySelector('.pill.active') || {}).dataset?.filter || 'college';
        const url = `${location.pathname}?filter=${filter}${q ? '&q=' + q : ''}`;
        location.href = url;
      }, 450); // 450ms debounce
    });
  }

  // FILTER PILL CLICK HANDLER (adds .active and reloads with filter)
  document.querySelectorAll('.pill').forEach(p => {
    p.addEventListener('click', (ev) => {
      document.querySelectorAll('.pill').forEach(x => x.classList.remove('active'));
      p.classList.add('active');
      const filter = p.dataset.filter || 'college';
      const q = (document.getElementById('searchInput')?.value || '').trim();
      const target = `/chat?filter=${filter}${q ? '&q=' + encodeURIComponent(q) : ''}`;
      location.href = target;
    });
  });

  // IMAGE PREVIEW + UPLOAD UX (works with upload endpoint /upload/image)
  const attachBtn = document.getElementById('attachBtn');
  const imageInput = document.getElementById('imageInput');
  const previewWrap = document.getElementById('previewWrap');
  const previewImg = document.getElementById('previewImg');
  const removePreview = document.getElementById('removePreview');
  const sendPreview = document.getElementById('sendPreview');

  // helper: do server upload, returns { url, public_id } or throws
  async function uploadToServer(file) {
    const form = new FormData();
    form.append('image', file);
    const res = await fetch('/upload/image', { method: 'POST', body: form });
    if (!res.ok) {
      let body;
      try { body = await res.json(); } catch (e) { body = { error: 'upload failed' }; }
      throw new Error(body.error || 'Upload failed');
    }
    return res.json();
  }

  if (attachBtn && imageInput) {
    attachBtn.addEventListener('click', () => imageInput.click());
  }

  if (imageInput) {
    imageInput.addEventListener('change', async (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;

      // small client-side validation
      if (!file.type.startsWith('image/')) { alert('Please select an image'); imageInput.value = ''; return; }
      if (file.size > 6 * 1024 * 1024) { alert('Image too large (max 6MB)'); imageInput.value = ''; return; }

      // show local preview immediately
      try {
        previewImg.src = URL.createObjectURL(file);
        if (previewWrap) previewWrap.style.display = 'flex';
        // upload in background
        const data = await uploadToServer(file);
        // store uploaded URL on input element for later send
        imageInput._uploadedUrl = data.url;
        // update UI text if present
        const smallText = previewWrap?.querySelector('.small');
        if (smallText) smallText.textContent = 'Ready to send';
        if (sendPreview) sendPreview.disabled = false;
      } catch (err) {
        console.error('Upload failed', err);
        alert('Image upload failed: ' + (err.message || 'unknown'));
        // hide preview
        if (previewWrap) previewWrap.style.display = 'none';
        imageInput.value = '';
      }
    });
  }

  if (removePreview) {
    removePreview.addEventListener('click', () => {
      if (previewWrap) previewWrap.style.display = 'none';
      previewImg.src = '';
      if (imageInput) {
        imageInput.value = '';
        delete imageInput._uploadedUrl;
      }
    });
  }

  if (sendPreview) {
    sendPreview.addEventListener('click', () => {
      const imageUrl = imageInput?._uploadedUrl;
      if (!imageUrl) return alert('No uploaded image to send');

  
      if (window.socket && typeof window.socket.emit === 'function') {
        window.socket.emit('sendMessage',
          { chatId: window.chatId, imageUrl, type: 'image' },
          (ack) => {
            if (ack && ack.success && ack.message) {
              
              if (typeof appendMessage === 'function') appendMessage(ack.message);
            } else {
              showToast('Failed to send image', { timeout: 3000 });
            }
          }
        );
      } else {
        console.warn('Socket not available to send image message');
      }

 
      removePreview?.click();
    });
  }

  const msgInput = document.getElementById('messageInput');
  if (msgInput) {
    setTimeout(() => msgInput.focus(), 300);
  }

  const sendBtn = document.getElementById('sendBtn');
  if (msgInput && sendBtn) {
    msgInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendBtn.click();
      }
    });
  }

  document.addEventListener('keydown', (e) => {
    if ((e.altKey || e.metaKey) && e.key.toLowerCase() === 'i') {
      e.preventDefault();
      imageInput?.click();
    }
  });
});

(function () {
 
  if (!window.socket) {
    try { window.socket = io(); } catch (e) { console.warn('socket.io client not available'); }
  }
  const socket = window.socket;


  function updateNotifBadge(deltaOrVal) {
    let badge = document.getElementById('notifBadge');
    if (!badge) {
 
      const notifBtn = document.getElementById('notifBtn');
      badge = document.createElement('span');
      badge.id = 'notifBadge';
      badge.style.display = 'none';
      badge.style.background = '#ef4444';
      badge.style.color = '#fff';
      badge.style.borderRadius = '999px';
      badge.style.padding = '2px 6px';
      badge.style.fontSize = '12px';
      badge.style.marginLeft = '8px';
      if (notifBtn) notifBtn.appendChild(badge);
      else document.body.appendChild(badge); 
    }
    const cur = parseInt(badge.textContent || '0', 10) || 0;
    if (typeof deltaOrVal === 'number') {
      const newVal = Math.max(0, cur + deltaOrVal);
      badge.textContent = String(newVal);
      badge.style.display = newVal > 0 ? 'inline-block' : 'none';
    } else {
      const v = parseInt(deltaOrVal || '0', 10) || 0;
      badge.textContent = String(v);
      badge.style.display = v > 0 ? 'inline-block' : 'none';
    }
  }

  if (typeof showToast !== 'function') {
    window.showToast = function (text, { timeout = 3000 } = {}) {
      const t = document.createElement('div');
      t.className = 'cb-toast';
      t.textContent = text;
      Object.assign(t.style, {
        position: 'fixed', left: '50%', transform: 'translateX(-50%)',
        bottom: '90px', background: '#111827', color: '#fff',
        padding: '10px 14px', borderRadius: '8px', opacity: '0',
        transition: 'opacity .18s, transform .18s', zIndex: 9999
      });
      document.body.appendChild(t);
      requestAnimationFrame(() => t.style.opacity = '1');
      setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 300); }, timeout);
    };
  }

  
  function askNotificationPermission() {
    if (!('Notification' in window)) return;
    if (Notification.permission === 'default') {
      Notification.requestPermission().then((perm) => {
        console.log('Notification permission:', perm);
      });
    }
  }

  function registerSocket() {
    if (!socket || !window.meId) return;
    socket.emit('register', window.meId);
  }

  if (socket) {
    socket.on('connect', () => {
      registerSocket();
    });

    socket.on('notification', (n) => {
      try {
    
        updateNotifBadge(1);

    
        if ('Notification' in window && Notification.permission === 'granted') {
          const body = n.data && n.data.preview ? n.data.preview : 'New activity';
          new Notification('CollegeBuddy', { body, icon: '/icons/notification-192.png' });
        }

  
        showToast(n.data && n.data.preview ? n.data.preview : 'New notification', { timeout: 3500 });
      } catch (err) {
        console.error('notification handler error', err);
      }
    });
  }

  async function fetchNotifications() {
    try {
      const res = await fetch('/notifications');
      if (!res.ok) return;
      const data = await res.json();
      const unread = Array.isArray(data) ? data.filter(n => !n.read).length : 0;
      updateNotifBadge(unread);
    } catch (err) {
   
    }
  }

  async function clearChatNotifications(chatId) {
    if (!chatId) return;
    try {
      await fetch('/notifications/markChatRead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatId })
      });
 
      fetchNotifications();
    } catch (err) {}
  }

 
  async function markAllNotificationsRead() {
    try {
      await fetch('/notifications/markAllRead', { method: 'POST' });
      updateNotifBadge(0);
    } catch (err) { }
  }


  onReady(() => {
    const notifBtn = document.getElementById('notifBtn');
    if (notifBtn) {
      notifBtn.addEventListener('click', (e) => {
        askNotificationPermission();
        
      });
    }

    
    fetchNotifications();

    
    if (window.chatId) {
     
      setTimeout(() => clearChatNotifications(window.chatId), 400);
    }


    window.updateNotifBadge = updateNotifBadge;
    window.clearChatNotifications = clearChatNotifications;
    window.markAllNotificationsRead = markAllNotificationsRead;
    window.askNotificationPermission = askNotificationPermission;
  });
})();
