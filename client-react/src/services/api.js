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

export const siteConfigService = {
  get: () => apiFetch('/site-config'),
  update: (configData) => apiFetch('/site-config', { method: 'PUT', body: JSON.stringify({ config_data: configData }) }),
};
