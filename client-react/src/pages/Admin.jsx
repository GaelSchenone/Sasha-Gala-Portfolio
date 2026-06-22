import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Reorder } from 'framer-motion';
import { projectService, archiveService, siteConfigService, assetService, validateImageFile, compressImage, faviconUrl } from '../services/api';
import { DesignTab } from './admin/DesignTab';
import { ScrollImageSelector } from './admin/ScrollImageSelector';
import './Admin.css';

const TABS = ['Proyectos', 'Archivo', 'About', 'Diseño'];

export function Admin() {
  const [activeTab, setActiveTab] = useState(0);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [openMenu, setOpenMenu] = useState(null);
  const menuRefs = useRef({});
  const [scrollSelectorProject, setScrollSelectorProject] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    const userData = localStorage.getItem('adminUser');
    if (!token || !userData) { navigate('/login'); return; }
    setUser(JSON.parse(userData));
    fetchProjects();
    const handleClickOutside = (e) => {
      const anyOpen = Object.values(menuRefs.current).some(el => el && el.contains(e.target));
      if (!anyOpen) setOpenMenu(null);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [navigate]);

  const fetchProjects = async () => {
    try {
      const data = await projectService.getAll();
      if (data.projects) setProjects(data.projects);
    } catch (error) {
      if (error.message === 'Session expired') return;
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    navigate('/login');
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`¿Estás seguro de que quieres borrar "${name}"?`)) return;
    try {
      await projectService.delete(id);
      setProjects(prev => prev.filter(p => p.project_id !== id));
    } catch (error) { alert('Error al borrar'); }
  };

  const handleArchiveProject = async (project) => {
    const newStatus = project.status === 'archived' ? 'draft' : 'archived';
    try {
      await projectService.update(project.project_id, { ...project, status: newStatus });
      setProjects(prev => prev.map(p =>
        p.project_id === project.project_id ? { ...p, status: newStatus } : p
      ));
    } catch (error) { alert('Error al archivar'); }
  };

  const handleToggleStatus = async (project, newStatus) => {
    try {
      await projectService.update(project.project_id, { ...project, status: newStatus });
      setProjects(prev => prev.map(p =>
        p.project_id === project.project_id ? { ...p, status: newStatus } : p
      ));
    } catch (error) { alert('Error al cambiar estado'); }
  };

  const statusLabel = (s) => s === 'published' ? 'Publicado' : s === 'archived' ? 'Archivado' : 'Borrador';
  const statusColor = (s) => s === 'published' ? { bg: '#e6f4ea', color: '#1e8e3e' } : s === 'archived' ? { bg: '#f3e8fd', color: '#7b1fa2' } : { bg: '#fff3e0', color: '#e65100' };

  const published = projects.filter(p => p.status === 'published');
  const drafts = projects.filter(p => p.status === 'draft');
  const archived = projects.filter(p => p.status === 'archived');

  if (loading) return <div style={{ padding: '100px', textAlign: 'center' }}>Cargando panel...</div>;

  return (
    <div className="admin-page">
      <main className="admin-main">
        <div className="admin-header-row">
          <div>
            <h1 className="admin-title">Panel de Control</h1>
            <p className="admin-subtitle">Bienvenido, {user?.name}</p>
          </div>
          <button onClick={handleLogout} className="admin-logout">Cerrar Sesión</button>
        </div>

        <div className="admin-tabs">
          {TABS.map((tab, i) => (
            <button key={tab} className={`admin-tab ${activeTab === i ? 'admin-tab-active' : ''}`} onClick={() => setActiveTab(i)}>
              {tab}
            </button>
          ))}
        </div>

        {activeTab === 0 && (
          <ProjectsTab
            published={published} drafts={drafts} archived={archived}
            openMenu={openMenu} setOpenMenu={setOpenMenu} menuRefs={menuRefs}
            navigate={navigate} handleDelete={handleDelete} handleArchive={handleArchiveProject}
            handleToggleStatus={handleToggleStatus}
            statusLabel={statusLabel} statusColor={statusColor}
            setScrollSelectorProject={setScrollSelectorProject}
          />
        )}

        {activeTab === 1 && <ArchiveTab />}
        {activeTab === 2 && <AboutTab />}
        {activeTab === 3 && <DesignTab />}
      </main>
      {scrollSelectorProject && (
        <ScrollImageSelector
          projectId={scrollSelectorProject.id}
          projectName={scrollSelectorProject.name}
          onClose={() => setScrollSelectorProject(null)}
        />
      )}
    </div>
  );
}

/* ── PROJECTS TAB ── */
function ProjectsTab({ published, drafts, archived, openMenu, setOpenMenu, menuRefs, navigate, handleDelete, handleArchive, handleToggleStatus, statusLabel, statusColor, setScrollSelectorProject }) {
  const [orderedPublished, setOrderedPublished] = useState([]);
  const [reordering, setReordering] = useState(false);
  const dragOccurred = useRef(false);

  useEffect(() => {
    setOrderedPublished([...published].sort((a, b) => a.display_order - b.display_order));
  }, [published]);

  const handleReorder = async (reordered) => {
    setOrderedPublished(reordered);
    setReordering(true);
    try {
      const items = reordered.map((p, i) => ({ project_id: p.project_id, display_order: i }));
      await projectService.reorder(items);
    } catch (err) {
      console.error('Reorder failed:', err);
      setOrderedPublished([...published].sort((a, b) => a.display_order - b.display_order));
    } finally {
      setReordering(false);
    }
  };

  const ellipsisItems = (project) => {
    const items = [];
    items.push({ label: 'Editar', onClick: () => navigate(`/admin/edit/${project.project_id}`) });
    items.push({ label: 'Elegir fotos del scroll', onClick: () => setScrollSelectorProject({ id: project.project_id, name: project.project_name }) });
    if (project.status === 'draft') {
      items.push({ label: 'Publicar', onClick: () => handleToggleStatus(project, 'published'), style: { color: '#1e8e3e' } });
    }
    if (project.status === 'published') {
      items.push({ label: 'Despublicar', onClick: () => handleToggleStatus(project, 'draft'), style: { color: '#e65100' } });
    }
    items.push({
      label: project.status === 'archived' ? 'Desarchivar' : 'Archivar',
      onClick: () => handleArchive(project),
    });
    items.push({ label: 'Borrar', onClick: () => handleDelete(project.project_id, project.project_name), danger: true });
    return items;
  };

  const renderList = (title, list) => (
    <div style={{ marginBottom: '30px' }}>
      {title && <h3 className="subsection-title">{title}</h3>}
      {list.length === 0 ? (
        <p className="empty-msg">No hay proyectos</p>
      ) : (
        <div>
          <div className="admin-list-header">
            <span className="reorder-drag-spacer" />
            <span className="td-name">Nombre</span>
            <span className="td-type">Tipo</span>
            <span className="td-status">Estado</span>
            <span className="td-actions" />
          </div>
          {list.map(project => {
            const sc = statusColor(project.status);
            const projectUrl = `/Work/${encodeURIComponent(project.project_name)}`;
            const menuItems = ellipsisItems(project);
            return (
              <div key={project.project_id} className="admin-reorder-item"
                onClick={() => navigate(`/admin/edit/${project.project_id}`)}
                style={{ cursor: 'pointer' }}
              >
                <span className="reorder-drag-spacer" />
                <span className="td-name">
                  <a href={projectUrl} target="_blank" rel="noopener noreferrer" className="project-name-link" onClick={e => e.stopPropagation()} title="Ver proyecto público">↗</a>
                  <span>{project.project_name}</span>
                </span>
                <span className="td-type">{project.project_type === 'full' ? 'Completo' : 'Rápido'}</span>
                <span className="td-status"><span className="status-badge" style={{ backgroundColor: sc.bg, color: sc.color }}>{statusLabel(project.status)}</span></span>
                <span className="td-actions" ref={el => menuRefs.current[project.project_id] = el} onClick={e => e.stopPropagation()}>
                  <button className="ellipsis-btn" onClick={() => setOpenMenu(openMenu === project.project_id ? null : project.project_id)}>⋮</button>
                  {openMenu === project.project_id && (
                    <div className="ellipsis-menu">
                      {menuItems.map((item, i) => (
                        item.danger ? (
                          <button key={i} className="menu-danger" onClick={() => { item.onClick(); setOpenMenu(null); }}>{item.label}</button>
                        ) : (
                          <button key={i} style={item.style} onClick={() => { item.onClick(); setOpenMenu(null); }}>{item.label}</button>
                        )
                      ))}
                    </div>
                  )}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  return (
    <>
      <div className="admin-section-header">
        <h2 className="admin-section-title">Proyectos</h2>
        <button onClick={() => navigate('/admin/edit/new')} className="btn-add-project">+ Nuevo Proyecto</button>
      </div>

      <section className="admin-section">
        {/* Published — reorderable via Framer Motion */}
        <div style={{ marginBottom: '30px' }}>
          <h3 className="subsection-title">Publicados {reordering && <span style={{ fontSize: 11, color: '#999', marginLeft: 8, fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>guardando...</span>}</h3>
          {orderedPublished.length === 0 ? (
            <p className="empty-msg">No hay proyectos publicados</p>
          ) : (
            <div>
              <div className="admin-list-header">
                <span className="reorder-drag-spacer" />
                <span className="td-name">Nombre</span>
                <span className="td-type">Tipo</span>
                <span className="td-status">Estado</span>
                <span className="td-actions" />
              </div>
              <Reorder.Group axis="y" values={orderedPublished} onReorder={handleReorder} className="admin-reorder-list">
              {orderedPublished.map(project => {
                const sc = statusColor(project.status);
                const projectUrl = `/Work/${encodeURIComponent(project.project_name)}`;
                const menuItems = ellipsisItems(project);
                return (
                  <Reorder.Item key={project.project_id} value={project} className="admin-reorder-item"
                    onDragStart={() => { dragOccurred.current = false; }}
                    onDragEnd={() => { dragOccurred.current = true; }}
                    onClick={() => {
                      if (dragOccurred.current) { dragOccurred.current = false; return; }
                      navigate(`/admin/edit/${project.project_id}`);
                    }}
                    style={{ cursor: 'pointer' }}
                  >
                    <span className="reorder-drag-handle" title="Arrastrar para reordenar" onClick={e => e.stopPropagation()}>⠿</span>
                      <span className="td-name">
                        <a href={projectUrl} target="_blank" rel="noopener noreferrer" className="project-name-link" onClick={e => e.stopPropagation()} title="Ver proyecto público">↗</a>
                        <span>{project.project_name}</span>
                      </span>
                      <span className="td-type">{project.project_type === 'full' ? 'Completo' : 'Rápido'}</span>
                      <span className="td-status"><span className="status-badge" style={{ backgroundColor: sc.bg, color: sc.color }}>{statusLabel(project.status)}</span></span>
                      <span className="td-actions" ref={el => menuRefs.current[project.project_id] = el} onClick={e => e.stopPropagation()}>
                      <button className="ellipsis-btn" onClick={() => setOpenMenu(openMenu === project.project_id ? null : project.project_id)}>⋮</button>
                      {openMenu === project.project_id && (
                        <div className="ellipsis-menu">
                          {menuItems.map((item, i) => (
                            item.danger ? (
                              <button key={i} className="menu-danger" onClick={() => { item.onClick(); setOpenMenu(null); }}>{item.label}</button>
                            ) : (
                              <button key={i} style={item.style} onClick={() => { item.onClick(); setOpenMenu(null); }}>{item.label}</button>
                            )
                          ))}
                        </div>
                      )}
                    </span>
                  </Reorder.Item>
                );
              })}
            </Reorder.Group>
            </div>
          )}
        </div>

        {renderList('Borradores', drafts)}
        {renderList('Archivados', archived)}
      </section>
    </>
  );
}

/* ── ARCHIVE TAB ── */
function ArchiveTab() {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadErrors, setUploadErrors] = useState([]);
  const fileInputRef = useRef(null);
  const gridRef = useRef(null);

  useEffect(() => {
    fetchArchive();
  }, []);

  const fetchArchive = async () => {
    try {
      const data = await archiveService.getAll();
      setImages(data.images || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const uploadOne = async (file) => {
    const validationError = validateImageFile(file);
    if (validationError) {
      return { file, error: validationError };
    }
    try {
      const compressed = await compressImage(file);
      const formData = new FormData();
      formData.append('file', compressed);
      const res = await archiveService.upload(formData);
      if (res?.image) {
        setImages(prev => [...prev, res.image]);
        return { file, ok: true };
      }
      return { file, error: 'El servidor no devolvió la imagen.' };
    } catch (err) {
      console.error('Archive upload error:', err);
      return { file, error: err.message || 'Error desconocido' };
    }
  };

  const uploadMany = async (files) => {
    if (!files.length) return;
    setUploading(true);
    setUploadErrors([]);
    const results = await Promise.all(files.map(uploadOne));
    const errors = results
      .filter(r => r.error)
      .map(r => `${r.file.name}: ${r.error}`);
    if (errors.length) setUploadErrors(errors);
    setUploading(false);
  };

  const handleUpload = async (e) => {
    await uploadMany(Array.from(e.target.files));
    e.target.value = '';
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.currentTarget.classList.remove('archive-drop-active');
    await uploadMany(Array.from(e.dataTransfer.files));
  };

  const handleDelete = async (imgId) => {
    try {
      await archiveService.deleteImage(imgId);
      setImages(prev => prev.filter(i => i.img_id !== imgId));
    } catch (err) { console.error(err); }
  };

  const moveImage = (fromIdx, toIdx) => {
    const updated = [...images];
    const [moved] = updated.splice(fromIdx, 1);
    updated.splice(toIdx, 0, moved);
    setImages(updated);
    const items = updated.map((img, i) => ({ img_id: img.img_id, order: i }));
    archiveService.reorder(items).catch(console.error);
  };

  if (loading) return <p>Cargando archivo...</p>;

  return (
    <section className="admin-section">
      <div className="admin-section-header">
        <h2 className="admin-section-title">Archivo</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {uploading && <span style={{ fontSize: '12px', color: '#e65100' }}>Subiendo...</span>}
          <button onClick={() => fileInputRef.current.click()} className="btn-add-project" disabled={uploading}>
            + Añadir Fotos
          </button>
        </div>
      </div>
      <input ref={fileInputRef} type="file" multiple accept="image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif,.heic,.heif" style={{ display: 'none' }} onChange={handleUpload} />

      {uploadErrors.length > 0 && (
        <div style={{ background: '#fdecea', color: '#b00020', padding: '10px 14px', borderRadius: '6px', marginBottom: '12px', fontSize: '13px' }}>
          <div style={{ fontWeight: 600, marginBottom: '4px' }}>No se pudieron subir {uploadErrors.length} archivo(s):</div>
          <ul style={{ margin: 0, paddingLeft: '20px' }}>
            {uploadErrors.map((msg, i) => <li key={i}>{msg}</li>)}
          </ul>
          <button onClick={() => setUploadErrors([])} style={{ background: 'none', border: 'none', color: '#b00020', cursor: 'pointer', padding: '4px 0 0', fontSize: '12px' }}>
            Cerrar
          </button>
        </div>
      )}

      <div
        ref={gridRef}
        className="archive-grid"
        onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('archive-drop-active'); }}
        onDragLeave={(e) => e.currentTarget.classList.remove('archive-drop-active')}
        onDrop={handleDrop}
      >
        <div className="archive-add-card" onClick={() => fileInputRef.current.click()}>
          <span className="archive-add-icon">+</span>
          <span>Añadir</span>
        </div>
        {images.map((img, idx) => (
          <div key={img.img_id} className="archive-card" draggable onDragStart={(e) => e.dataTransfer.setData('text/plain', idx)} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); const from = parseInt(e.dataTransfer.getData('text/plain')); moveImage(from, idx); }}>
            <img src={img.img_route} alt="" />
            <button className="archive-remove" onClick={() => handleDelete(img.img_id)}>✕</button>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ── ABOUT TAB ── */
function AboutTab() {
  const [config, setConfig] = useState({ name: '', description: '', stack: '', links: [] });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingIcon, setUploadingIcon] = useState(false);
  const faviconInputRef = useRef(null);

  useEffect(() => {
    siteConfigService.get()
      .then(data => {
        if (data.config?.config_data) setConfig(data.config.config_data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleFaviconUpload = async (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    const err = validateImageFile(file);
    if (err) { alert(err); return; }
    setUploadingIcon(true);
    try {
      // favicons are tiny — shrink hard before upload
      const compressed = await compressImage(file, { maxDimension: 256, quality: 0.92, threshold: 0 });
      const fd = new FormData();
      fd.append('file', compressed);
      const res = await assetService.upload(fd);
      if (res?.url) setConfig(prev => ({ ...prev, favicon_url: res.url }));
      else alert('No se pudo subir el icono');
    } catch (err) {
      alert(`Error al subir el icono: ${err.message || 'desconocido'}`);
    } finally {
      setUploadingIcon(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await siteConfigService.update(config);
    } catch (err) { alert('Error al guardar'); }
    finally { setSaving(false); }
  };

  const addLink = () => setConfig(prev => ({ ...prev, links: [...prev.links, { url: '', title: '' }] }));
  const updateLink = (idx, field, value) => {
    const links = [...config.links];
    links[idx] = { ...links[idx], [field]: value };
    setConfig(prev => ({ ...prev, links }));
  };
  const removeLink = (idx) => setConfig(prev => ({ ...prev, links: prev.links.filter((_, i) => i !== idx) }));

  if (loading) return <p>Cargando...</p>;

  return (
    <section className="admin-section">
      <div className="admin-section-header">
        <h2 className="admin-section-title">About</h2>
        <button onClick={handleSave} className="btn-add-project" disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</button>
      </div>

      <div className="about-form">
        <div className="form-group">
          <label>NOMBRE</label>
          <input value={config.name || ''} onChange={e => setConfig(prev => ({ ...prev, name: e.target.value }))} />
        </div>

        <div className="form-group">
          <label>ICONO DE LA PESTAÑA (FAVICON)</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{
              width: 48, height: 48, flexShrink: 0, borderRadius: 8,
              border: '1px solid #e0e0e0', background: '#fafafa',
              display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
            }}>
              {config.favicon_url
                ? <img src={faviconUrl(config.favicon_url, 96)} alt="favicon" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <span style={{ fontSize: 10, color: '#bbb' }}>sin icono</span>}
            </div>
            <input ref={faviconInputRef} type="file" accept="image/png,image/jpeg,image/webp" style={{ display: 'none' }} onChange={handleFaviconUpload} />
            <button type="button" className="btn-add-link" onClick={() => faviconInputRef.current?.click()} disabled={uploadingIcon}>
              {uploadingIcon ? 'Subiendo...' : (config.favicon_url ? 'Cambiar icono' : 'Subir icono')}
            </button>
            {config.favicon_url && !uploadingIcon && (
              <button type="button" className="btn-remove" onClick={() => setConfig(prev => ({ ...prev, favicon_url: '' }))}>
                Quitar
              </button>
            )}
          </div>
          <p style={{ fontSize: 11, color: '#888', margin: '6px 0 0' }}>
            Imagen cuadrada (PNG/JPG/WebP). Se recorta a un cuadradito para la pestaña. Acordate de tocar <strong>Guardar</strong>.
          </p>
        </div>

        <div className="form-group">
          <label>DESCRIPCIÓN</label>
          <textarea rows="5" value={config.description || ''} onChange={e => setConfig(prev => ({ ...prev, description: e.target.value }))} />
        </div>
        <div className="form-group">
          <label>STACK</label>
          <input value={config.stack || ''} onChange={e => setConfig(prev => ({ ...prev, stack: e.target.value }))} placeholder="Photoshop, Illustrator, Figma..." />
        </div>

        <div className="form-group">
          <label>LINKS</label>
          <div className="links-list">
            {config.links.map((link, idx) => (
              <div key={idx} className="link-row">
                <input placeholder="Título" value={link.title || ''} onChange={e => updateLink(idx, 'title', e.target.value)} />
                <input placeholder="URL" value={link.url || ''} onChange={e => updateLink(idx, 'url', e.target.value)} />
                <button className="btn-remove" onClick={() => removeLink(idx)}>✕</button>
              </div>
            ))}
            <button className="btn-add-link" onClick={addLink}>+ Añadir Link</button>
          </div>
        </div>
      </div>
    </section>
  );
}

