import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Reorder } from 'framer-motion';
import { projectService } from '../services/api';
import './ProjectEditor.css';
import './View.css';

const emptyLayout = () => ({ sections: [], layoutGap: 20 });

let _secId = 0;
const newSectionId = () => `sec-${Date.now()}-${++_secId}`;

const newSection = () => ({
  id: newSectionId(),
  columns: 1,
  gap: 0,
  height: 400,
  autoHeight: false,
  rows: [[null]],
});

const newRow = (cols) => Array(cols).fill(null);

const formatCollaborators = (str) => {
  if (!str) return null;
  const list = str.split(',').map(c => c.trim());
  if (list.length === 1) return list[0];
  return list.slice(0, -1).join(', ') + ' and ' + list[list.length - 1];
};

const normalizeSlot = (slot) => {
  if (!slot) return null;
  if (typeof slot === 'string') return { src: slot, fit: 'cover', position: 'center' };
  return { src: slot.src, fit: slot.fit || 'cover', position: slot.position || 'center' };
};

const FIT_OPTIONS = ['cover', 'contain', 'fill', 'none'];
const POSITION_OPTIONS = ['center', 'top', 'bottom', 'left', 'right', 'top left', 'top right', 'bottom left', 'bottom right'];

const STATUS_CONFIG = {
  draft: { label: 'Borrador', bg: '#fff3e0', color: '#e65100' },
  published: { label: 'Publicado', bg: '#e6f4ea', color: '#1e8e3e' },
  archived: { label: 'Archivado', bg: '#f3e8fd', color: '#7b1fa2' },
};

export function ProjectEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState({
    project_name: '', project_description: '', project_stack: '',
    project_colaborators: '', project_type: 'full', status: 'draft',
    layout_json: emptyLayout(),
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const fileInputRef = useRef(null);
  const [activeSlot, setActiveSlot] = useState(null);
  const [dragOverSlot, setDragOverSlot] = useState(null);
  const savedProjectRef = useRef(null);
  const [showExitPrompt, setShowExitPrompt] = useState(false);

  // Detect unsaved changes by comparing current project with saved version
  const hasUnsavedChanges = useCallback(() => {
    if (!savedProjectRef.current) return false;
    return JSON.stringify(project) !== JSON.stringify(savedProjectRef.current);
  }, [project]);

  const handleBack = () => {
    if (hasUnsavedChanges()) {
      setShowExitPrompt(true);
    } else {
      navigate('/admin');
    }
  };

  const saveAndLeave = async (status) => {
    setSaving(true);
    try {
      const data = { ...project };
      if (status) data.status = status;
      await projectService.update(id, data);
      navigate('/admin');
    } catch (error) {
      alert('Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  // Browser beforeunload for tab close
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (hasUnsavedChanges()) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  useEffect(() => {
    projectService.getById(id)
      .then(data => {
        const p = data.project;
        if (!p.layout_json || !p.layout_json.sections) {
          p.layout_json = emptyLayout();
        } else {
          p.layout_json.layoutGap = p.layout_json.layoutGap ?? 20;
          p.layout_json.sections = p.layout_json.sections.map(sec => {
            const rows = (sec.rows || [[]]).map(row =>
              row.map(slot => normalizeSlot(slot))
            );
            return { ...sec, rows, columns: sec.columns || 1, gap: sec.gap ?? 0, height: sec.height ?? 400, autoHeight: sec.autoHeight || false };
          });
        }
        setProject(p);
        savedProjectRef.current = JSON.parse(JSON.stringify(p));
        setLoading(false);
      })
      .catch(err => {
        console.error('Error cargando proyecto:', err);
        setLoading(false);
      });
  }, [id]);

  const handleMetadataChange = (field, value) => {
    setProject(prev => ({ ...prev, [field]: value }));
  };

  const updateLayout = (updates) => {
    setProject(prev => ({
      ...prev,
      layout_json: { ...prev.layout_json, ...updates },
    }));
  };

  const updateSections = (newSections) => {
    updateLayout({ sections: newSections });
  };

  const updateSection = (secId, updates) => {
    updateSections(project.layout_json.sections.map(s =>
      s.id === secId ? { ...s, ...updates } : s
    ));
  };

  const addSection = () => {
    updateSections([...project.layout_json.sections, newSection()]);
  };

  const removeSection = (secId) => {
    updateSections(project.layout_json.sections.filter(s => s.id !== secId));
  };

  const changeColumns = (secId, newCols) => {
    updateSections(project.layout_json.sections.map(s => {
      if (s.id !== secId) return s;
      const rows = s.rows.map(row => {
        const padded = [...row];
        while (padded.length < newCols) padded.push(null);
        return padded.slice(0, newCols);
      });
      return { ...s, columns: newCols, rows };
    }));
  };

  const addRow = (secId) => {
    const sec = project.layout_json.sections.find(s => s.id === secId);
    if (!sec) return;
    updateSection(secId, { rows: [...sec.rows, newRow(sec.columns)] });
  };

  const removeRow = (secId, rowIdx) => {
    const sec = project.layout_json.sections.find(s => s.id === secId);
    if (!sec || sec.rows.length <= 1) return;
    updateSection(secId, { rows: sec.rows.filter((_, i) => i !== rowIdx) });
  };

  const uploadImageToSlot = async (file, sectionId, rowIdx, colIdx) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('project_id', id);

    try {
      const response = await projectService.uploadImage(formData);
      if (response.image && response.image.img_route) {
        const newSlot = { src: response.image.img_route, fit: 'cover', position: 'center' };
        const newSections = project.layout_json.sections.map(sec => {
          if (sec.id === sectionId) {
            const rows = sec.rows.map((row, ri) => {
              if (ri === rowIdx) {
                const padded = [...row];
                while (padded.length <= colIdx) padded.push(null);
                padded[colIdx] = newSlot;
                return padded;
              }
              return row;
            });
            return { ...sec, rows };
          }
          return sec;
        });
        updateSections(newSections);
        setSelectedImage({ sectionId, rowIdx, colIdx });
        return true;
      } else {
        alert('Error: No se recibio la ruta de la imagen.');
      }
    } catch (error) {
      alert('Error al subir imagen');
    }
    return false;
  };

  const handleImageClick = (sectionId, rowIdx, colIdx) => {
    setActiveSlot({ sectionId, rowIdx, colIdx });
    fileInputRef.current.click();
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !activeSlot) return;
    await uploadImageToSlot(file, activeSlot.sectionId, activeSlot.rowIdx, activeSlot.colIdx);
    setActiveSlot(null);
    e.target.value = '';
  };

  const handleDropOnSlot = async (e, sectionId, rowIdx, colIdx) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverSlot(null);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      await uploadImageToSlot(file, sectionId, rowIdx, colIdx);
    }
  };

  const removeImage = (sectionId, rowIdx, colIdx) => {
    const newSections = project.layout_json.sections.map(sec => {
      if (sec.id === sectionId) {
        const rows = sec.rows.map((row, ri) => {
          if (ri === rowIdx) {
            const r = [...row];
            r[colIdx] = null;
            return r;
          }
          return row;
        });
        return { ...sec, rows };
      }
      return sec;
    });
    updateSections(newSections);
    if (selectedImage?.sectionId === sectionId && selectedImage?.rowIdx === rowIdx && selectedImage?.colIdx === colIdx) {
      setSelectedImage(null);
    }
  };

  const updateSlotProperty = (sectionId, rowIdx, colIdx, key, value) => {
    const newSections = project.layout_json.sections.map(sec => {
      if (sec.id === sectionId) {
        const rows = sec.rows.map((row, ri) => {
          if (ri === rowIdx) {
            const r = [...row];
            if (r[colIdx] && typeof r[colIdx] === 'object') {
              r[colIdx] = { ...r[colIdx], [key]: value };
            }
            return r;
          }
          return row;
        });
        return { ...sec, rows };
      }
      return sec;
    });
    updateSections(newSections);
  };

  const saveAll = async () => {
    setSaving(true);
    try {
      await projectService.update(id, project);
      savedProjectRef.current = JSON.parse(JSON.stringify(project));
    } catch (error) {
      alert('Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const getSelectedSlot = () => {
    if (!selectedImage) return null;
    const sec = project.layout_json.sections.find(s => s.id === selectedImage.sectionId);
    if (!sec) return null;
    const slot = sec.rows[selectedImage.rowIdx]?.[selectedImage.colIdx];
    return slot;
  };

  const selectedSlot = getSelectedSlot();
  const dirty = hasUnsavedChanges();
  const statusInfo = STATUS_CONFIG[project.status] || STATUS_CONFIG.draft;

  if (loading) return <div className="loading" style={{ padding: '100px', textAlign: 'center' }}>Cargando Estudio...</div>;

  return (
    <div className="studio-container">
      <input type="file" ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileUpload} accept="image/*" />

      {/* ── EXIT PROMPT MODAL ── */}
      {showExitPrompt && (
        <div className="modal-overlay" onClick={() => setShowExitPrompt(false)}>
          <div className="modal-form" onClick={e => e.stopPropagation()}>
            <h2 className="modal-title">Cambios sin guardar</h2>
            <p style={{ fontSize: '14px', color: '#555', margin: '-5px 0 10px' }}>Tenés cambios que no se guardaron. ¿Qué querés hacer?</p>
            <div className="modal-actions">
              <button className="btn-modal-primary" onClick={() => saveAndLeave('draft')} disabled={saving}>
                {saving ? '...' : 'Guardar como Borrador'}
              </button>
              <button className="btn-modal-primary" style={{ background: '#1e8e3e' }} onClick={() => saveAndLeave('published')} disabled={saving}>
                {saving ? '...' : 'Publicar'}
              </button>
            </div>
            <div className="modal-actions" style={{ marginTop: '6px' }}>
              <button className="btn-modal-cancel" onClick={() => saveAndLeave()}>Guardar y salir</button>
              <button className="btn-modal-cancel" style={{ color: '#d93025' }} onClick={() => navigate('/admin')}>Salir sin guardar</button>
            </div>
          </div>
        </div>
      )}

      {/* ── SIDEBAR ── */}
      <div className="studio-sidebar">
        <div className="sidebar-header">
          <button onClick={handleBack} className="btn-back">← VOLVER</button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {dirty && <span className="unsaved-badge">Sin guardar</span>}
            <span className="status-pill" style={{ backgroundColor: statusInfo.bg, color: statusInfo.color }}>
              {statusInfo.label}
            </span>
            <button className="btn-save-sm" onClick={saveAll} disabled={saving}>
              {saving ? '...' : 'GUARDAR'}
            </button>
          </div>
        </div>

        <div className="sidebar-content">
          {/* Metadata */}
          <div className="form-group">
            <label>NOMBRE</label>
            <input value={project.project_name || ''} onChange={e => handleMetadataChange('project_name', e.target.value)} />
          </div>
          <div className="form-group">
            <label>STACK</label>
            <input value={project.project_stack || ''} onChange={e => handleMetadataChange('project_stack', e.target.value)} />
          </div>
          <div className="form-group">
            <label>DESCRIPCIÓN</label>
            <textarea rows="3" value={project.project_description || ''} onChange={e => handleMetadataChange('project_description', e.target.value)} />
          </div>
          <div className="form-group">
            <label>COLABORADORES</label>
            <input value={project.project_colaborators || ''} onChange={e => handleMetadataChange('project_colaborators', e.target.value)} />
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label>TIPO</label>
              <select value={project.project_type} onChange={e => handleMetadataChange('project_type', e.target.value)}>
                <option value="full">Completo</option>
                <option value="quick">Rápido</option>
              </select>
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label>ESTADO</label>
              <select value={project.status} onChange={e => handleMetadataChange('status', e.target.value)}>
                <option value="draft">Borrador</option>
                <option value="published">Publicado</option>
                <option value="archived">Archivado</option>
              </select>
            </div>
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid #eee', margin: '8px 0' }} />

          {/* Global layout gap */}
          <div className="form-group">
            <label>GAP GENERAL DEL LAYOUT</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input type="range" min="0" max="100" step="2" style={{ flex: 1 }}
                value={project.layout_json.layoutGap ?? 0}
                onChange={e => updateLayout({ layoutGap: parseInt(e.target.value) })}
              />
              <span style={{ fontSize: '11px', minWidth: '28px' }}>{project.layout_json.layoutGap ?? 0}px</span>
            </div>
          </div>

          {/* Image properties panel */}
          {selectedImage && selectedSlot && (
            <div className="image-props-panel">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '10px', fontWeight: 700 }}>IMAGEN SELECCIONADA</span>
                <button className="btn-remove" onClick={() => setSelectedImage(null)}>✕</button>
              </div>
              <div className="form-group">
                <label>BACKGROUND-SIZE</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                  {FIT_OPTIONS.map(f => (
                    <button
                      key={f}
                      className={`fit-btn ${selectedSlot.fit === f ? 'fit-btn-active' : ''}`}
                      onClick={() => updateSlotProperty(selectedImage.sectionId, selectedImage.rowIdx, selectedImage.colIdx, 'fit', f)}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>
              <div className="form-group">
                <label>BACKGROUND-POSITION</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                  {POSITION_OPTIONS.map(p => (
                    <button
                      key={p}
                      className={`fit-btn ${selectedSlot.position === p ? 'fit-btn-active' : ''}`}
                      onClick={() => updateSlotProperty(selectedImage.sectionId, selectedImage.rowIdx, selectedImage.colIdx, 'position', p)}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
              <div className="form-group">
                <label>ALTO DE IMAGEN (px)</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input type="range" min="100" max="1200" step="10" style={{ flex: 1 }}
                    value={selectedSlot.height || project.layout_json.sections.find(s => s.id === selectedImage.sectionId)?.height || 400}
                    onChange={e => updateSlotProperty(selectedImage.sectionId, selectedImage.rowIdx, selectedImage.colIdx, 'height', parseInt(e.target.value))}
                  />
                  <span style={{ fontSize: '11px', minWidth: '36px' }}>{selectedSlot.height || project.layout_json.sections.find(s => s.id === selectedImage.sectionId)?.height || 400}px</span>
                </div>
              </div>
              <button
                className="btn-remove"
                onClick={() => removeImage(selectedImage.sectionId, selectedImage.rowIdx, selectedImage.colIdx)}
                style={{ marginTop: '4px' }}
              >
                ELIMINAR IMAGEN
              </button>
            </div>
          )}

          <hr style={{ border: 'none', borderTop: '1px solid #eee', margin: '8px 0' }} />

          {/* Sections */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: '11px', fontWeight: 800 }}>SECCIONES</h3>
            <button className="btn-primary-sm" onClick={addSection}>+ SECCIÓN</button>
          </div>

          <Reorder.Group
            axis="y"
            values={project.layout_json.sections}
            onReorder={updateSections}
            style={{ padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '10px' }}
          >
            {project.layout_json.sections.map(section => {
              const gap = section.gap ?? 0;
              const height = section.height ?? 400;
              const autoHeight = section.autoHeight || false;
              return (
                <Reorder.Item key={section.id} value={section} className="section-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontSize: '10px', fontWeight: 700 }}>
                      {section.columns} COL · {section.rows.length} FILA{section.rows.length > 1 ? 'S' : ''}
                    </span>
                    <button onClick={() => removeSection(section.id)} className="btn-remove">ELIMINAR</button>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', marginBottom: '6px' }}>
                    <div className="form-group" style={{ flex: 1 }}>
                      <label>COLUMNAS</label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <input type="range" min="1" max="10" step="1" style={{ width: '100%' }}
                          value={section.columns}
                          onChange={e => changeColumns(section.id, parseInt(e.target.value))}
                        />
                        <span style={{ fontSize: '10px', minWidth: '16px' }}>{section.columns}</span>
                      </div>
                    </div>
                    <div className="form-group" style={{ flex: 1 }}>
                      <label>FILAS</label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <input type="range" min="1" max="10" step="1" style={{ width: '100%' }}
                          value={section.rows.length}
                          onChange={e => {
                            const target = parseInt(e.target.value);
                            const current = section.rows.length;
                            if (target > current) {
                              const extra = [];
                              for (let i = current; i < target; i++) extra.push(newRow(section.columns));
                              updateSection(section.id, { rows: [...section.rows, ...extra] });
                            } else if (target < current) {
                              updateSection(section.id, { rows: section.rows.slice(0, target) });
                            }
                          }}
                        />
                        <span style={{ fontSize: '10px', minWidth: '16px' }}>{section.rows.length}</span>
                      </div>
                    </div>
                  </div>

                  <div className="form-group">
                    <label>GAP COLUMNAS</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <input type="range" min="0" max="100" step="2" style={{ width: '100%' }}
                        value={gap}
                        onChange={e => updateSection(section.id, { gap: parseInt(e.target.value) })}
                      />
                      <span style={{ fontSize: '10px', minWidth: '28px' }}>{gap}px</span>
                    </div>
                  </div>

                  <div className="form-group">
                    <label>ALTO FILAS</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <input type="range" min="100" max="1200" step="10" style={{ width: '100%' }}
                        value={height}
                        onChange={e => updateSection(section.id, { height: parseInt(e.target.value) })}
                        disabled={autoHeight}
                      />
                      <span style={{ fontSize: '10px', minWidth: '36px' }}>{autoHeight ? 'auto' : `${height}px`}</span>
                      <label style={{ fontSize: '10px', display: 'flex', alignItems: 'center', gap: '3px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                        <input type="checkbox" checked={autoHeight} onChange={e => updateSection(section.id, { autoHeight: e.target.checked })} />
                        auto
                      </label>
                    </div>
                  </div>
                </Reorder.Item>
              );
            })}
          </Reorder.Group>
        </div>

        <button className="btn-save" onClick={saveAll} disabled={saving}>
          {saving ? 'GUARDANDO...' : 'GUARDAR CAMBIOS'}
        </button>
      </div>

      {/* ── CANVAS / PREVIEW ── */}
      <div className="studio-canvas">
        <div className="preview-paper">
          {/* Hero section */}
          <div className="view-section" style={{ minHeight: 'auto', margin: '0 auto', padding: '0 8%', maxWidth: '95%' }}>
            <div className="view-top-half"></div>
            <div className="view-bottom-half" style={{ borderBottom: '1px solid #eee', paddingBottom: '60px' }}>
              <div className="view-col-left">
                <div className="view-info">
                  <h2 className='project-title'>{project.project_name || 'TITULO DEL PROYECTO'}</h2>
                  <div className="view-titles">
                    {project.project_stack && project.project_stack.split(',').map((s, i) => (
                      <h2 key={i}>{s.trim()}</h2>
                    ))}
                  </div>
                </div>
              </div>
              <div className="view-col-right">
                <p>{project.project_description || 'Descripción del proyecto...'}</p>
                {project.project_colaborators && (
                  <b className='colaborators'>Collaboration with {formatCollaborators(project.project_colaborators)}</b>
                )}
              </div>
            </div>
          </div>

          {/* Gallery */}
          <div className="layout-gallery" style={{ paddingTop: `${project.layout_json.layoutGap ?? 0}px` }}>
            {project.layout_json.sections.length === 0 && (
              <div style={{ textAlign: 'center', color: '#ccc', padding: '60px 0', fontSize: '14px' }}>
                Añadir secciones desde el panel lateral
              </div>
            )}
            {project.layout_json.sections.map(section => {
              const gap = section.gap ?? 0;
              const height = section.height ?? 400;
              const autoHeight = section.autoHeight || false;
              return (
                <div key={section.id}>
                  {section.rows.map((row, rowIdx) => (
                    <div
                      key={rowIdx}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: `repeat(${section.columns}, 1fr)`,
                        columnGap: `${gap}px`,
                        rowGap: 0,
                      }}
                    >
                      {row.map((slot, colIdx) => {
                        const isSelected = selectedImage?.sectionId === section.id
                          && selectedImage?.rowIdx === rowIdx
                          && selectedImage?.colIdx === colIdx;
                        const isDragOver = dragOverSlot?.sectionId === section.id
                          && dragOverSlot?.rowIdx === rowIdx
                          && dragOverSlot?.colIdx === colIdx;
                        const slotHeight = slot?.height || height;

                        if (slot && slot.src) {
                          return (
                            <div
                              key={colIdx}
                              className={`p-slot ${isSelected ? 'p-slot-selected' : ''}`}
                              style={autoHeight ? {} : { height: `${slotHeight}px` }}
                              onClick={() => setSelectedImage({ sectionId: section.id, rowIdx, colIdx })}
                            >
                              <img
                                src={slot.src}
                                alt=""
                                style={{
                                  width: '100%',
                                  height: autoHeight ? 'auto' : '100%',
                                  objectFit: slot.fit || 'cover',
                                  objectPosition: slot.position || 'center',
                                  display: 'block',
                                  borderRadius: '2px',
                                }}
                              />
                              <button
                                className="p-slot-remove"
                                onClick={(e) => { e.stopPropagation(); removeImage(section.id, rowIdx, colIdx); }}
                                title="Quitar imagen"
                              >
                                ✕
                              </button>
                            </div>
                          );
                        }
                        return (
                          <div
                            key={colIdx}
                            className={`p-slot ${isDragOver ? 'p-slot-dragover' : ''}`}
                            style={autoHeight ? { minHeight: '100px' } : { height: `${slotHeight}px` }}
                            onClick={() => handleImageClick(section.id, rowIdx, colIdx)}
                            onDragOver={(e) => { e.preventDefault(); setDragOverSlot({ sectionId: section.id, rowIdx, colIdx }); }}
                            onDragLeave={() => setDragOverSlot(null)}
                            onDrop={(e) => handleDropOnSlot(e, section.id, rowIdx, colIdx)}
                          >
                            <div className="p-slot-empty">
                              <span style={{ fontSize: '24px' }}>+</span>
                              <p style={{ margin: '4px 0 0', fontSize: '9px', textTransform: 'uppercase' }}>Subir o arrastrar</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
