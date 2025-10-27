// helper: upload file to server upload endpoint
async function uploadImageToServer(file) {
  const form = new FormData();
  form.append('image', file);
  const res = await fetch('/upload/image', { method: 'POST', body: form });
  if (!res.ok) {
    const err = await res.json().catch(()=>({ error: 'upload failed' }));
    throw new Error(err.error || 'Upload failed');
  }
  return res.json(); // { url, public_id }
}

document.getElementById('imageBtn').addEventListener('click', () => {
  document.getElementById('imageInput').click();
});

document.getElementById('imageInput').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  // simple client-side validation
  if (file.size > 5 * 1024 * 1024) { alert('Image too large (max 5MB)'); return; }

  try {
    // UI: optional show uploading state
    const data = await uploadImageToServer(file); // { url }
    const imageUrl = data.url;

    // optimistic append (optional)
    appendMessage({ sender: { _id: meId, name: 'You', avatarUrl: null }, imageUrl, type: 'image', createdAt: Date.now() });

    // emit via socket; server will save and broadcast
    socket.emit('sendMessage', { chatId, imageUrl, type: 'image' }, (ack) => {
      // optional: reconcile saved message
      // ack.message contains the authoritative saved message returned by server
      console.log('image send ack', ack);
    });

  } catch (err) {
    console.error('Upload error', err);
    alert('Image upload failed');
  } finally {
    e.target.value = '';
  }
});
