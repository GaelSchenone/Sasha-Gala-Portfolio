import { useState, useEffect } from 'react';
import { Reorder } from 'framer-motion';
import { projectService } from '../../services/api';

export function ScrollImageSelector({ projectId, projectName, onClose }) {
  const [step, setStep] = useState(1);
  const [allImages, setAllImages] = useState([]);
  const [scrollImages, setScrollImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    projectService.getById(projectId).then(data => {
      const imgs = data.project?.images || [];
      setAllImages(imgs);
      const selected = imgs
        .filter(img => img.home_visible)
        .sort((a, b) => (a.home_order ?? a.display_order) - (b.home_order ?? b.display_order));
      setScrollImages(selected);
      setLoading(false);
    }).catch(err => {
      console.error('Error loading project images:', err);
      setLoading(false);
    });
  }, [projectId]);

  const toggleImage = (img) => {
    const exists = scrollImages.some(si => si.img_id === img.img_id);
    if (exists) {
      setScrollImages(prev => prev.filter(si => si.img_id !== img.img_id));
    } else {
      setScrollImages(prev => [...prev, img]);
    }
  };

  const selectAll = () => setScrollImages([...allImages]);
  const deselectAll = () => setScrollImages([]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const imagesPayload = allImages.map(img => ({
        img_id: img.img_id,
        home_visible: scrollImages.some(si => si.img_id === img.img_id),
        home_order: scrollImages.findIndex(si => si.img_id === img.img_id) !== -1
          ? scrollImages.findIndex(si => si.img_id === img.img_id)
          : null,
      }));
      await projectService.updateHomeImages(projectId, { images: imagesPayload });
      onClose();
    } catch (err) {
      console.error('Error saving home images:', err);
      alert('Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const renderStep1 = () => (
    <>
      <div className="scroll-selector-step-hint">
        Paso 1: Seleccioná las fotos que querés que aparezcan en el scroll del Home
      </div>

      <div className="scroll-selector-actions">
        <button className="scroll-selector-btn-sm" onClick={selectAll}>Seleccionar todo</button>
        <button className="scroll-selector-btn-sm" onClick={deselectAll}>Deseleccionar todo</button>
        <span className="scroll-selector-count">{scrollImages.length} de {allImages.length} seleccionadas</span>
      </div>

      <div className="scroll-selector-grid">
        {allImages.map(img => {
          const selected = scrollImages.some(si => si.img_id === img.img_id);
          return (
            <div
              key={img.img_id}
              className={`scroll-selector-card ${selected ? 'selected' : ''}`}
              onClick={() => toggleImage(img)}
            >
              <img src={img.img_route} alt="" />
              <div className="scroll-selector-check">{selected ? '✓' : ''}</div>
            </div>
          );
        })}
      </div>

      <div className="scroll-selector-footer">
        <button className="btn-modal-cancel" onClick={onClose}>Cancelar</button>
        <button
          className="btn-modal-primary"
          disabled={scrollImages.length === 0}
          onClick={() => setStep(2)}
        >
          Siguiente →
        </button>
      </div>
    </>
  );

  const renderStep2 = () => (
    <>
      <div className="scroll-selector-step-hint">
        Paso 2: Arrastrá las fotos para reordenarlas
      </div>

      <Reorder.Group
        axis="x"
        values={scrollImages}
        onReorder={setScrollImages}
        className="scroll-selector-strip"
      >
        {scrollImages.map(img => (
          <Reorder.Item key={img.img_id} value={img} className="scroll-selector-strip-item">
            <img src={img.img_route} alt="" draggable={false} />
            <span className="scroll-selector-strip-order">
              {scrollImages.findIndex(si => si.img_id === img.img_id) + 1}
            </span>
          </Reorder.Item>
        ))}
      </Reorder.Group>

      {scrollImages.length === 0 && (
        <div className="scroll-selector-empty">No hay fotos seleccionadas. Volvé atrás para elegir.</div>
      )}

      <div className="scroll-selector-footer">
        <button className="btn-modal-cancel" onClick={() => setStep(1)}>← Atrás</button>
        <button
          className="btn-modal-primary"
          onClick={handleSave}
          disabled={saving || scrollImages.length === 0}
        >
          {saving ? 'Guardando...' : 'Guardar'}
        </button>
      </div>
    </>
  );

  if (loading) {
    return (
      <div className="scroll-selector-overlay" onClick={onClose}>
        <div className="scroll-selector-modal" onClick={e => e.stopPropagation()}>
          <div style={{ textAlign: 'center', padding: '40px', color: '#888' }}>Cargando...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="scroll-selector-overlay" onClick={onClose}>
      <div className="scroll-selector-modal" onClick={e => e.stopPropagation()}>
        <div className="scroll-selector-header">
          <h2 className="scroll-selector-title">
            Elegir fotos del scroll — {projectName}
          </h2>
          <button className="scroll-selector-close" onClick={onClose}>✕</button>
        </div>

        {step === 1 ? renderStep1() : renderStep2()}
      </div>
    </div>
  );
}
