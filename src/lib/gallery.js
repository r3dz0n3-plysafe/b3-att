import { supabase } from './supabase.js';

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(String(reader.result).split(',')[1] || '');
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export async function addFaceGalleryPhoto(nip, type, blob) {
  const base64 = await blobToBase64(blob);
  const { data, error } = await supabase.rpc('add_face_gallery_photo', {
    p_nip: nip,
    p_type: type,
    p_photo_base64: base64,
    p_content_type: blob.type || 'image/jpeg',
  });
  if (error) {
    if (error.message?.includes('gallery_full')) {
      const fullError = new Error('gallery_full');
      fullError.code = 'gallery_full';
      throw fullError;
    }
    throw error;
  }
  return data;
}

export async function listFaceGalleryPhotos(nip) {
  const { data, error } = await supabase.rpc('list_face_gallery_photos', { p_nip: nip });
  if (error) throw error;
  return (data || []).map((row) => ({
    id: row.id,
    type: row.attendance_type,
    base64: `data:${row.content_type};base64,${row.photo_base64}`,
    createdAt: row.created_at,
  }));
}

export async function deleteFaceGalleryPhoto(id, nip) {
  const { error } = await supabase.rpc('delete_face_gallery_photo', { p_id: id, p_nip: nip });
  if (error) throw error;
}
