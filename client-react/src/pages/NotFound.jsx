import { Link } from 'react-router-dom';
import { Header } from '../componentes/Header';

export function NotFound() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header />
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        gap: '16px',
        padding: '40px',
        textAlign: 'center',
      }}>
        <h1 style={{ fontWeight: 300, fontSize: '72px', margin: 0, letterSpacing: '-2px' }}>404</h1>
        <p style={{ color: '#666', fontSize: '16px', margin: 0 }}>La página que buscás no existe.</p>
        <Link to="/" style={{ color: '#000', textDecoration: 'underline', marginTop: '8px' }}>
          Volver al inicio
        </Link>
      </div>
    </div>
  );
}
