import { GoogleLogin } from '@react-oauth/google';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { Header } from '../componentes/Header';
import './About.css'; // Podemos reusar estilos o crear Login.css

const API_URL = import.meta.env.VITE_API_URL || 'https://sasha-api.aguilucho.ar/api';

export function Login() {
  const navigate = useNavigate();

  useEffect(() => {
    if (localStorage.getItem('adminToken')) {
      navigate('/admin', { replace: true });
    }
  }, []);

  const handleSuccess = async (credentialResponse) => {
    try {
      // 1. Enviar el token de Google a nuestro Backend Flask
      const response = await fetch(`${API_URL}/auth/google-login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token: credentialResponse.credential }),
      });

      const data = await response.json();

      if (response.ok) {
        // 2. Guardar nuestro propio JWT y los datos del usuario
        localStorage.setItem('adminToken', data.token);
        localStorage.setItem('adminUser', JSON.stringify(data.user));

        console.log('Login exitoso:', data.user.name);

        // 3. Redirigir al panel de administración (que crearemos luego)
        navigate('/admin');
      } else {
        console.error('Error del servidor:', data);
        alert(`${data.error}${data.detail ? ': ' + data.detail : ''}`);
      }
    } catch (error) {
      console.error('Error conectando con el servidor:', error);
      alert('Error de conexión con el servidor');
    }
  };

  const handleError = () => {
    console.log('Login Fallido');
    alert('No se pudo iniciar sesión con Google');
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header />
      <div style={{ 
        flex: 1, 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center',
        flexDirection: 'column',
        gap: '20px'
      }}>
        <h1 style={{ fontWeight: 300 }}>Administración</h1>
        <p style={{ color: '#666', marginBottom: '10px' }}>Inicia sesión para gestionar el portfolio</p>
        
        <GoogleLogin
          onSuccess={handleSuccess}
          onError={handleError}
          useOneTap={false}
          itp_support={true}
          use_fedcm_for_prompt={false}
          theme="outline"
          shape="rectangular"
        />
      </div>
    </div>
  );
}
