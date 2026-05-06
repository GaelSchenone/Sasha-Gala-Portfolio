const BASE_URL = '/api';
const REMOTE_IMG_BASE = 'https://sashagala.com.ar';

const normalizeImageRoute = (route) => {
  if (!route) return route;
  if (route.startsWith('/imgs/')) {
    return `${REMOTE_IMG_BASE}${route}`;
  }
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

const uploadWithAuth = (url, formData) => {
  const token = localStorage.getItem('adminToken');
  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return fetch(url, {
    method: 'POST',
    headers,
    body: formData,
  }).then(res => {
    if (res.status === 401) {
      localStorage.removeItem('adminToken');
      localStorage.removeItem('adminUser');
      window.location.href = '/login';
      throw new Error('Session expired');
    }
    return res.json();
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
  uploadImage: (formData) => uploadWithAuth('/api/upload', formData),
};

export const archiveService = {
  getAll: () => apiFetch('/archive').then(data => {
    if (data.images) {
      data.images = normalizeImages(data.images);
    }
    return data;
  }),
  upload: (formData) => uploadWithAuth('/api/archive', formData),
  reorder: (items) => apiFetch('/archive/reorder', { method: 'PUT', body: JSON.stringify({ items }) }),
  deleteImage: (imgId) => apiFetch(`/images/${imgId}`, { method: 'DELETE' }),
};

export const siteConfigService = {
  get: () => apiFetch('/site-config'),
  update: (configData) => apiFetch('/site-config', { method: 'PUT', body: JSON.stringify({ config_data: configData }) }),
};
