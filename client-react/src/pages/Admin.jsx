import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { projectService, archiveService, siteConfigService, validateImageFile } from '../services/api';
import './Admin.css';

const TABS = ['Proyectos', 'Archivo', 'About', 'Diseño'];

export function Admin() {
  const [activeTab, setActiveTab] = useState(0);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [newProject, setNewProject] = useState({
    project_name: '', project_description: '', project_stack: '',
    project_colaborators: '', project_type: 'full', status: 'draft',
  });
  const [openMenu, setOpenMenu] = useState(null);
  const menuRefs = useRef({});
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

  const handleAddProject = async (e) => {
    e.preventDefault();
    try {
      await projectService.add({ ...newProject, status: 'draft' });
      setShowModal(false);
      setNewProject({ project_name: '', project_description: '', project_stack: '', project_colaborators: '', project_type: 'full', status: 'draft' });
      fetchProjects();
    } catch (error) { alert('Error al crear'); }
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
            showModal={showModal} setShowModal={setShowModal}
            newProject={newProject} setNewProject={setNewProject} handleAddProject={handleAddProject}
            statusLabel={statusLabel} statusColor={statusColor}
          />
        )}

        {activeTab === 1 && <ArchiveTab />}
        {activeTab === 2 && <AboutTab />}
        {activeTab === 3 && <DesignTab />}
      </main>
    </div>
  );
}

/* ── PROJECTS TAB ── */
function ProjectsTab({ published, drafts, archived, openMenu, setOpenMenu, menuRefs, navigate, handleDelete, handleArchive, showModal, setShowModal, newProject, setNewProject, handleAddProject, statusLabel, statusColor }) {
  const renderTable = (title, list) => (
    <div style={{ marginBottom: '30px' }}>
      {title && <h3 className="subsection-title">{title}</h3>}
      {list.length === 0 ? (
        <p className="empty-msg">No hay proyectos</p>
      ) : (
        <table className="admin-table">
          <thead>
            <tr><th>Nombre</th><th>Tipo</th><th>Estado</th><th></th></tr>
          </thead>
          <tbody>
            {list.map(project => {
              const sc = statusColor(project.status);
              const projectUrl = `/Work/${encodeURIComponent(project.project_name)}`;
              return (
                <tr key={project.project_id}>
                  <td className="td-name">
                    <a href={projectUrl} target="_blank" rel="noopener noreferrer" className="project-name-link">
                      {project.project_name}
                    </a>
                  </td>
                  <td className="td-type">{project.project_type === 'full' ? 'Completo' : 'Rápido'}</td>
                  <td><span className="status-badge" style={{ backgroundColor: sc.bg, color: sc.color }}>{statusLabel(project.status)}</span></td>
                  <td className="td-actions" ref={el => menuRefs.current[project.project_id] = el}>
                    <button className="ellipsis-btn" onClick={() => setOpenMenu(openMenu === project.project_id ? null : project.project_id)}>⋮</button>
                    {openMenu === project.project_id && (
                      <div className="ellipsis-menu">
                        <button onClick={() => { navigate(`/admin/edit/${project.project_id}`); setOpenMenu(null); }}>Editar</button>
                        <a href={projectUrl} target="_blank" rel="noopener noreferrer" className="menu-link" onClick={() => setOpenMenu(null)}>Ver proyecto</a>
                        <button onClick={() => { handleArchive(project); setOpenMenu(null); }}>
                          {project.status === 'archived' ? 'Desarchivar' : 'Archivar'}
                        </button>
                        <button className="menu-danger" onClick={() => { handleDelete(project.project_id, project.project_name); setOpenMenu(null); }}>Borrar</button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );

  return (
    <>
      <div className="admin-section-header">
        <h2 className="admin-section-title">Proyectos</h2>
        <button onClick={() => setShowModal(true)} className="btn-add-project">+ Nuevo Proyecto</button>
      </div>

      <section className="admin-section">
        {renderTable('Publicados', published)}
        {renderTable('Borradores', drafts)}
        {renderTable('Archivados', archived)}
      </section>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <form className="modal-form" onSubmit={handleAddProject} onClick={e => e.stopPropagation()}>
            <h2 className="modal-title">Nuevo Proyecto</h2>
            <div className="form-group"><label>NOMBRE</label><input placeholder="Nombre del Proyecto" required value={newProject.project_name} onChange={e => setNewProject({ ...newProject, project_name: e.target.value })} /></div>
            <div className="form-group"><label>TIPO</label><select value={newProject.project_type} onChange={e => setNewProject({ ...newProject, project_type: e.target.value })}><option value="full">Proyecto Completo</option><option value="quick">Proyecto Rápido</option></select></div>
            <div className="form-group"><label>DESCRIPCIÓN</label><textarea placeholder="Descripción" rows="3" value={newProject.project_description} onChange={e => setNewProject({ ...newProject, project_description: e.target.value })} /></div>
            <div className="form-group"><label>STACK</label><input placeholder="Photoshop, Illustrator..." value={newProject.project_stack} onChange={e => setNewProject({ ...newProject, project_stack: e.target.value })} /></div>
            <div className="form-group"><label>COLABORADORES</label><input placeholder="Separados por coma" value={newProject.project_colaborators} onChange={e => setNewProject({ ...newProject, project_colaborators: e.target.value })} /></div>
            <div className="modal-actions">
              <button type="submit" className="btn-modal-primary">Crear como Borrador</button>
              <button type="button" onClick={() => setShowModal(false)} className="btn-modal-cancel">Cancelar</button>
            </div>
          </form>
        </div>
      )}
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
    const formData = new FormData();
    formData.append('file', file);
    try {
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

  useEffect(() => {
    siteConfigService.get()
      .then(data => {
        if (data.config?.config_data) setConfig(data.config.config_data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

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

/* ── DESIGN TAB ── */
function DesignTab() {
  const [config, setConfig] = useState({
    font_family: 'Inter, sans-serif',
    base_font_size: '16px',
    base_font_weight: '400',
    base_line_height: '1.5',
    base_letter_spacing: '0',
    home_projects_font_size: '8vh',
    home_projects_font_weight: '300',
    nav_links_font_size: '16px',
    nav_links_font_weight: '500',
    footer_font_size: 'large',
    scroll_projects_speed: 30,
    scroll_images_speed: 50,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    siteConfigService.get()
      .then(data => {
        if (data.config?.config_data) {
          setConfig(prev => ({ ...prev, ...data.config.config_data }));
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await siteConfigService.update(config);
    } catch (err) { alert('Error al guardar'); }
    finally { setSaving(false); }
  };

  if (loading) return <p>Cargando...</p>;

  return (
    <section className="admin-section">
      <div className="admin-section-header">
        <h2 className="admin-section-title">Diseño</h2>
        <button onClick={handleSave} className="btn-add-project" disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</button>
      </div>

      <div className="about-form">
        <h3 className="subsection-title">Tipografía Global</h3>
        <div className="form-group">
          <label>FUENTE</label>
          <input value={config.font_family || ''} onChange={e => setConfig(prev => ({ ...prev, font_family: e.target.value }))} placeholder="Inter, sans-serif" />
        </div>
        <div className="form-group">
          <label>TAMAÑO BASE</label>
          <input value={config.base_font_size || ''} onChange={e => setConfig(prev => ({ ...prev, base_font_size: e.target.value }))} placeholder="16px" />
        </div>
        <div className="form-group">
          <label>PESO BASE</label>
          <input value={config.base_font_weight || ''} onChange={e => setConfig(prev => ({ ...prev, base_font_weight: e.target.value }))} placeholder="400" />
        </div>
        <div className="form-group">
          <label>LINE HEIGHT</label>
          <input value={config.base_line_height || ''} onChange={e => setConfig(prev => ({ ...prev, base_line_height: e.target.value }))} placeholder="1.5" />
        </div>
        <div className="form-group">
          <label>LETTER SPACING</label>
          <input value={config.base_letter_spacing || ''} onChange={e => setConfig(prev => ({ ...prev, base_letter_spacing: e.target.value }))} placeholder="0" />
        </div>

        <h3 className="subsection-title">Elementos Específicos</h3>
        <div className="form-group">
          <label>TAMAÑO DE PROYECTOS (HOME)</label>
          <input value={config.home_projects_font_size || ''} onChange={e => setConfig(prev => ({ ...prev, home_projects_font_size: e.target.value }))} placeholder="8vh" />
        </div>
        <div className="form-group">
          <label>PESO DE PROYECTOS (HOME)</label>
          <input value={config.home_projects_font_weight || ''} onChange={e => setConfig(prev => ({ ...prev, home_projects_font_weight: e.target.value }))} placeholder="300" />
        </div>
        <div className="form-group">
          <label>TAMAÑO DE NAVEGACIÓN</label>
          <input value={config.nav_links_font_size || ''} onChange={e => setConfig(prev => ({ ...prev, nav_links_font_size: e.target.value }))} placeholder="16px" />
        </div>
        <div className="form-group">
          <label>PESO DE NAVEGACIÓN</label>
          <input value={config.nav_links_font_weight || ''} onChange={e => setConfig(prev => ({ ...prev, nav_links_font_weight: e.target.value }))} placeholder="500" />
        </div>
        <div className="form-group">
          <label>TAMAÑO DE FOOTER</label>
          <input value={config.footer_font_size || ''} onChange={e => setConfig(prev => ({ ...prev, footer_font_size: e.target.value }))} placeholder="large" />
        </div>

        <h3 className="subsection-title">Velocidad de Scroll</h3>
        <div className="form-group">
          <label>VELOCIDAD DE PROYECTOS: {config.scroll_projects_speed || 30}</label>
          <input
            type="range"
            min="10"
            max="100"
            value={config.scroll_projects_speed || 30}
            onChange={e => setConfig(prev => ({ ...prev, scroll_projects_speed: parseInt(e.target.value) }))}
          />
        </div>
        <div className="form-group">
          <label>VELOCIDAD DE IMÁGENES: {config.scroll_images_speed || 50}</label>
          <input
            type="range"
            min="10"
            max="100"
            value={config.scroll_images_speed || 50}
            onChange={e => setConfig(prev => ({ ...prev, scroll_images_speed: parseInt(e.target.value) }))}
          />
        </div>
      </div>
    </section>
  );
}
