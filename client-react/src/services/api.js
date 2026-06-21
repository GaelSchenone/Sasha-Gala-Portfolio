export const BASE_URL = import.meta.env.VITE_API_URL || 'https://sasha-api.aguilucho.ar/api';
const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || '';

const normalizeImageRoute = (route) => {
  if (!route) return route;
  // Already a full URL (Cloudinary or any CDN) - return as-is
  if (route.startsWith('http://') || route.startsWith('https://')) return route;
  // Legacy /imgs/ routes - no longer served by backend after Cloudinary migration
  return route;
};

const normalizeImages = (data) => {
  if (!data) return data;
  if (Array.isArray(data)) {
    return data.map(item => {
      if (item.img_route) {
        return { ...item, img_route: normalizeImageRoute(item.img_route) };
      }
      return item;
    });
  }
  if (data.img_route) {
    return { ...data, img_route: normalizeImageRoute(data.img_route) };
  }
  return data;
};

const getAuthHeaders = () => {
  const token = localStorage.getItem('adminToken');
  const headers = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

const apiFetch = async (endpoint, options = {}) => {
  const config = {
    ...options,
    headers: {
      ...getAuthHeaders(),
      ...options.headers,
    },
  };

  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, config);
    if (response.status === 401) {
      localStorage.removeItem('adminToken');
      localStorage.removeItem('adminUser');
      window.location.href = '/login';
      throw new Error('Session expired');
    }
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || response.statusText);
    }
    return await response.json();
  } catch (error) {
    console.error('Fetch error:', error);
    throw error;
  }
};

const uploadWithAuth = async (endpoint, formData) => {
  const token = localStorage.getItem('adminToken');
  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method: 'POST',
    headers,
    body: formData,
  });

  if (res.status === 401) {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    window.location.href = '/login';
    throw new Error('Session expired');
  }

  let body = null;
  try {
    body = await res.json();
  } catch {
    // body wasn't JSON (proxy error HTML, etc.)
  }

  if (!res.ok) {
    const detail = body?.error || `HTTP ${res.status}`;
    throw new Error(detail);
  }

  return body;
};

// JWT helpers — decode payload without verification (verification happens on the server)
const decodeJwt = (token) => {
  try {
    const [, payloadB64] = token.split('.');
    if (!payloadB64) return null;
    const json = atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(json);
  } catch {
    return null;
  }
};

export const isTokenExpired = (token) => {
  if (!token) return true;
  const payload = decodeJwt(token);
  if (!payload?.exp) return false;
  return Date.now() >= payload.exp * 1000;
};

export const getTokenExpiresInMs = (token) => {
  if (!token) return 0;
  const payload = decodeJwt(token);
  if (!payload?.exp) return Infinity;
  return Math.max(0, payload.exp * 1000 - Date.now());
};

export const ALLOWED_IMAGE_EXTS = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'heic', 'heif'];
export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

export const validateImageFile = (file) => {
  if (!file) return 'No se recibió ningún archivo';
  const ext = (file.name?.split('.').pop() || '').toLowerCase();
  const typeOk = file.type?.startsWith('image/') || ALLOWED_IMAGE_EXTS.includes(ext);
  if (!ALLOWED_IMAGE_EXTS.includes(ext) && !typeOk) {
    return `Formato no soportado: ${file.name}. Usá JPG, PNG, WebP, GIF o HEIC.`;
  }
  if (file.size === 0) {
    return `${file.name} está vacío. Si está en iCloud, descargalo primero al dispositivo.`;
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    const mb = (file.size / 1024 / 1024).toFixed(1);
    return `${file.name} pesa ${mb} MB. El máximo es 50 MB.`;
  }
  return null;
};

// Compresses large images in the browser before upload.
// Cloudinary free tier rejects files > 10MB; this brings any photo well under
// that limit without visible quality loss. Skips small files and HEIC (canvas
// can't decode HEIC reliably across browsers — the server handles those).
export const compressImage = async (file, { maxDimension = 3000, quality = 0.9, threshold = 2 * 1024 * 1024 } = {}) => {
  if (file.size < threshold) return file;

  const ext = (file.name?.split('.').pop() || '').toLowerCase();
  const isPng = ext === 'png' || file.type === 'image/png';
  if (ext === 'heic' || ext === 'heif' || file.type === 'image/heic' || file.type === 'image/heif') {
    return file;
  }
  if (file.type === 'image/gif') return file; // don't flatten animated gifs

  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(url);

      let { width, height } = img;
      if (width > maxDimension || height > maxDimension) {
        const scale = Math.min(maxDimension / width, maxDimension / height);
        width = Math.round(width * scale);
        height = Math.round(height * scale);
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);

      const mimeType = isPng ? 'image/png' : 'image/jpeg';
      const newExt = isPng ? '.png' : '.jpg';
      canvas.toBlob(
        (blob) => {
          if (!blob || blob.size >= file.size) {
            resolve(file); // compression made it worse — keep original
            return;
          }
          const newName = file.name.replace(/\.[^.]+$/, '') + newExt;
          resolve(new File([blob], newName, { type: mimeType, lastModified: file.lastModified }));
        },
        mimeType,
        isPng ? 0.92 : quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file); // can't decode (rare format, corrupted) — let the server try
    };

    img.src = url;
  });
};

export const projectService = {
  getAll: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return apiFetch(`/projects${qs ? '?' + qs : ''}`).then(data => {
      if (data.projects) {
        data.projects = normalizeImages(data.projects);
      }
      return data;
    });
  },
  getById: (id) => apiFetch(`/projects/${id}`).then(data => {
    if (data.project) {
      data.project = normalizeImages(data.project);
      if (data.project.images) {
        data.project.images = normalizeImages(data.project.images);
      }
    }
    return data;
  }),
  getByName: (name) => apiFetch(`/projects/name/${encodeURIComponent(name)}`).then(data => {
    if (data.project) {
      data.project = normalizeImages(data.project);
      if (data.project.images) {
        data.project.images = normalizeImages(data.project.images);
      }
    }
    return data;
  }),
  getImages: () => apiFetch('/projectimages').then(data => {
    if (data.images) {
      data.images = normalizeImages(data.images);
    }
    return data;
  }),
  getArchive: () => apiFetch('/archive').then(data => {
    if (data.images) {
      data.images = normalizeImages(data.images);
    }
    return data;
  }),
  add: (data) => apiFetch('/add-project', { method: 'POST', body: JSON.stringify(data) }),
  delete: (id) => apiFetch(`/projects/${id}`, { method: 'DELETE' }),
  update: (id, data) => apiFetch(`/projects/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteImage: (imgId) => apiFetch(`/images/${imgId}`, { method: 'DELETE' }),
  uploadImage: (formData) => uploadWithAuth('/upload', formData),
  reorder: (items) => apiFetch('/projects/reorder', { method: 'PUT', body: JSON.stringify({ items }) }),
  updateHomeImages: (id, data) => apiFetch(`/projects/${id}/home-images`, { method: 'PUT', body: JSON.stringify(data) }),
};

// Build a small square PNG from a Cloudinary URL for use as a tab icon.
export const faviconUrl = (url, size = 64) => {
  if (!url) return url;
  if (url.includes('/upload/')) {
    return url.replace('/upload/', `/upload/c_fill,w_${size},h_${size},f_png/`);
  }
  return url;
};

export const assetService = {
  // Uploads a standalone site asset (favicon, etc.) and returns { url }.
  upload: (formData) => uploadWithAuth('/upload-asset', formData),
};

export const archiveService = {
  getAll: () => apiFetch('/archive').then(data => {
    if (data.images) {
      data.images = normalizeImages(data.images);
    }
    return data;
  }),
  upload: (formData) => uploadWithAuth('/archive', formData),
  reorder: (items) => apiFetch('/archive/reorder', { method: 'PUT', body: JSON.stringify({ items }) }),
  deleteImage: (imgId) => apiFetch(`/images/${imgId}`, { method: 'DELETE' }),
};

// Site config is read by many components (Typography, Header, Home, About,
// Archive...). Dedupe into ONE shared request per session + a localStorage
// cache so the first paint can apply settings synchronously (no flash).
const SITE_CONFIG_CACHE_KEY = 'siteConfigCache';
let _siteConfigPromise = null;

export const siteConfigService = {
  get: () => {
    if (!_siteConfigPromise) {
      _siteConfigPromise = apiFetch('/site-config')
        .then(data => {
          const cd = data?.config?.config_data;
          if (cd) siteConfigService.setCached(cd);
          return data;
        })
        .catch(err => { _siteConfigPromise = null; throw err; }); // allow retry
    }
    return _siteConfigPromise;
  },
  getCached: () => {
    try {
      const s = localStorage.getItem(SITE_CONFIG_CACHE_KEY);
      return s ? JSON.parse(s) : null;
    } catch { return null; }
  },
  setCached: (configData) => {
    try { localStorage.setItem(SITE_CONFIG_CACHE_KEY, JSON.stringify(configData)); } catch { /* ignore quota */ }
  },
  update: (configData) => apiFetch('/site-config', { method: 'PUT', body: JSON.stringify({ config_data: configData }) })
    .then(res => {
      _siteConfigPromise = null;          // force a fresh fetch next time
      siteConfigService.setCached(configData);
      return res;
    }),
};
