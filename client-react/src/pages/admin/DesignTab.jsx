import { useEffect, useState } from 'react';
import { siteConfigService } from '../../services/api';
import './DesignTab.css';

const DEFAULT_CONFIG = {
  font_family: 'Inter, sans-serif',
  base_font_size: '16px',
  base_font_weight: '400',
  base_line_height: '1.5',
  base_letter_spacing: '0',
  home_projects_font_size: '8vh',
  home_projects_font_weight: '300',
  nav_links_font_size: '16px',
  nav_links_font_weight: '500',
  footer_font_size: '16px',
  scroll_projects_speed: 30,
  scroll_images_speed: 50,
};

const FONT_OPTIONS = [
  { value: 'Inter, sans-serif', label: 'Inter — Sans moderna' },
  { value: '"Playfair Display", serif', label: 'Playfair Display — Serif elegante' },
];

const WEIGHT_OPTIONS = [
  { value: '300', label: 'Light · 300' },
  { value: '400', label: 'Regular · 400' },
  { value: '500', label: 'Medium · 500' },
  { value: '600', label: 'Semibold · 600' },
  { value: '700', label: 'Bold · 700' },
];

// Helpers — config values are stored as strings with units (e.g. "16px", "8vh", "1.5")
const parsePx = (val, fallback = 16) => {
  if (typeof val === 'number') return val;
  if (!val) return fallback;
  const n = parseFloat(val);
  return Number.isNaN(n) ? fallback : n;
};

const parseUnitless = (val, fallback) => {
  const n = parseFloat(val);
  return Number.isNaN(n) ? fallback : n;
};

// Legacy keyword footer sizes ("small"/"large") get migrated to px on first interaction
const KEYWORD_TO_PX = { 'xx-small': 10, 'x-small': 12, small: 13, medium: 16, large: 18, 'x-large': 24, 'xx-large': 32 };

export function DesignTab() {
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState(0);

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

  useEffect(() => {
    if (!savedAt) return;
    const t = setTimeout(() => setSavedAt(0), 2000);
    return () => clearTimeout(t);
  }, [savedAt]);

  const update = (key, value) => setConfig(prev => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    setSaving(true);
    try {
      await siteConfigService.update(config);
      setSavedAt(Date.now());
    } catch (err) {
      console.error('Save error:', err);
      alert(`Error al guardar: ${err.message || 'desconocido'}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p>Cargando diseño...</p>;

  // Resolve legacy keyword footer values when reading
  const footerPx = parsePx(KEYWORD_TO_PX[config.footer_font_size] || config.footer_font_size, 16);

  const bodyStyle = {
    fontFamily: config.font_family,
    fontSize: config.base_font_size,
    fontWeight: config.base_font_weight,
    lineHeight: config.base_line_height,
    letterSpacing: config.base_letter_spacing,
    color: '#111',
  };

  return (
    <section className="admin-section design-tab">
      <div className="admin-section-header">
        <h2 className="admin-section-title">Diseño</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {savedAt > 0 && (
            <span className="unsaved-badge" style={{ background: '#e6f4ea', color: '#1e8e3e' }}>✓ Guardado</span>
          )}
          <button onClick={handleSave} className="btn-add-project" disabled={saving}>
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>

      <p style={{ fontSize: '13px', color: '#666', marginTop: '-8px', marginBottom: '18px' }}>
        Los cambios se previsualizan acá. Tocá <strong>Guardar</strong> para aplicarlos al sitio.
      </p>

      {/* ── FUENTE GLOBAL ── */}
      <div className="design-card">
        <div className="design-card-head">
          <h3 className="design-card-title">Fuente global</h3>
          <p className="design-card-desc">La tipografía base de todo el sitio.</p>
        </div>
        <div className="design-card-body">
          <SelectRow
            label="Tipografía"
            value={config.font_family}
            options={FONT_OPTIONS}
            onChange={v => update('font_family', v)}
          />
          <div className="design-preview" style={{ ...bodyStyle, fontSize: '22px', lineHeight: 1.3 }}>
            The quick brown fox jumps over the lazy dog
            <div style={{ fontSize: '14px', opacity: 0.55, marginTop: '6px' }}>
              Aa Bb Cc Dd · 1234567890 · áéíóú ñ
            </div>
          </div>
        </div>
      </div>

      {/* ── CUERPO DE TEXTO ── */}
      <div className="design-card">
        <div className="design-card-head">
          <h3 className="design-card-title">Cuerpo de texto</h3>
          <p className="design-card-desc">Párrafos, descripciones y texto general (el <code>&lt;p&gt;</code> de toda la web).</p>
        </div>
        <div className="design-card-body">
          <SliderRow
            label="Tamaño"
            value={parsePx(config.base_font_size)}
            min={12} max={22} step={1} unit="px"
            onChange={v => update('base_font_size', `${v}px`)}
          />
          <SelectRow
            label="Peso"
            value={config.base_font_weight}
            options={WEIGHT_OPTIONS}
            onChange={v => update('base_font_weight', v)}
          />
          <SliderRow
            label="Altura de línea"
            value={parseUnitless(config.base_line_height, 1.5)}
            min={1} max={2} step={0.1} unit=""
            onChange={v => update('base_line_height', v.toFixed(1))}
          />
          <SliderRow
            label="Espaciado entre letras"
            value={parsePx(config.base_letter_spacing, 0)}
            min={-1} max={4} step={0.25} unit="px"
            onChange={v => update('base_letter_spacing', `${v}px`)}
          />
          <div className="design-preview" style={bodyStyle}>
            <div className="design-preview-label">Ejemplo de párrafo</div>
            Diseñadora gráfica con sede en Buenos Aires, trabajando en branding,
            editorial y diseño de identidad visual para estudios independientes,
            artistas y marcas con voz propia.
          </div>
        </div>
      </div>

      {/* ── MENÚ DE NAVEGACIÓN ── */}
      <div className="design-card">
        <div className="design-card-head">
          <h3 className="design-card-title">Menú de navegación</h3>
          <p className="design-card-desc">Los links de arriba a la derecha: Work · Archivo · About.</p>
        </div>
        <div className="design-card-body">
          <SliderRow
            label="Tamaño"
            value={parsePx(config.nav_links_font_size)}
            min={12} max={24} step={1} unit="px"
            onChange={v => update('nav_links_font_size', `${v}px`)}
          />
          <SelectRow
            label="Peso"
            value={config.nav_links_font_weight}
            options={WEIGHT_OPTIONS}
            onChange={v => update('nav_links_font_weight', v)}
          />
          <div
            className="design-preview design-preview-nav"
            style={{
              ...bodyStyle,
              fontSize: config.nav_links_font_size,
              fontWeight: config.nav_links_font_weight,
            }}
          >
            <span>Work</span>
            <span>Archivo</span>
            <span>About</span>
          </div>
        </div>
      </div>

      {/* ── TÍTULOS DE PROYECTOS EN HOME ── */}
      <div className="design-card">
        <div className="design-card-head">
          <h3 className="design-card-title">Títulos de proyectos en Home</h3>
          <p className="design-card-desc">Los nombres grandes que aparecen scrolleando en el inicio.</p>
        </div>
        <div className="design-card-body">
          <SliderRow
            label="Tamaño"
            value={parseUnitless(config.home_projects_font_size, 8)}
            min={4} max={15} step={0.5} unit="vh"
            onChange={v => update('home_projects_font_size', `${v}vh`)}
          />
          <SelectRow
            label="Peso"
            value={config.home_projects_font_weight}
            options={WEIGHT_OPTIONS}
            onChange={v => update('home_projects_font_weight', v)}
          />
          <div
            className="design-preview"
            style={{
              ...bodyStyle,
              fontSize: config.home_projects_font_size,
              fontWeight: config.home_projects_font_weight,
              textAlign: 'center',
              lineHeight: 1,
              padding: '36px 24px',
            }}
          >
            Bauhaus Studio
          </div>
          <p style={{ fontSize: '11px', color: '#888', marginTop: '8px', marginBottom: 0 }}>
            La unidad <code>vh</code> es relativa al alto de la pantalla — los títulos
            crecen y se adaptan a cualquier dispositivo.
          </p>
        </div>
      </div>

      {/* ── FOOTER ── */}
      <div className="design-card">
        <div className="design-card-head">
          <h3 className="design-card-title">Footer</h3>
          <p className="design-card-desc">El texto al pie del sitio.</p>
        </div>
        <div className="design-card-body">
          <SliderRow
            label="Tamaño"
            value={footerPx}
            min={10} max={24} step={1} unit="px"
            onChange={v => update('footer_font_size', `${v}px`)}
          />
          <div
            className="design-preview"
            style={{
              ...bodyStyle,
              fontSize: `${footerPx}px`,
              textAlign: 'center',
              color: '#666',
            }}
          >
            © 2026 Sasha Gala — Todos los derechos reservados
          </div>
        </div>
      </div>

      {/* ── ANIMACIONES ── */}
      <div className="design-card">
        <div className="design-card-head">
          <h3 className="design-card-title">Animaciones</h3>
          <p className="design-card-desc">Qué tan rápido se mueve el scroll automático.</p>
        </div>
        <div className="design-card-body">
          <SliderRow
            label="Scroll de proyectos (Home)"
            value={config.scroll_projects_speed ?? 30}
            min={10} max={100} step={5} unit=""
            onChange={v => update('scroll_projects_speed', v)}
          />
          <SliderRow
            label="Scroll de imágenes (Archivo)"
            value={config.scroll_images_speed ?? 50}
            min={10} max={100} step={5} unit=""
            onChange={v => update('scroll_images_speed', v)}
          />
          <p style={{ fontSize: '11px', color: '#888', marginTop: '8px', marginBottom: 0 }}>
            Valor más alto = más rápido. Los cambios se ven al recargar el sitio público.
          </p>
        </div>
      </div>
    </section>
  );
}

// ── shared row components ──────────────────────────────────

function SliderRow({ label, value, min, max, step, unit, onChange }) {
  const display = unit === '' ? value : `${value}${unit}`;
  return (
    <div className="design-row">
      <label>{label}</label>
      <div className="slider-control">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={e => onChange(parseFloat(e.target.value))}
        />
        <span className="slider-value">{display}</span>
      </div>
    </div>
  );
}

function SelectRow({ label, value, options, onChange }) {
  return (
    <div className="design-row">
      <label>{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)}>
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  );
}
