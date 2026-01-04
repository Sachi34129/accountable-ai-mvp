import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

function Login() {
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is already logged in
    const userId = localStorage.getItem('userId');
    if (userId) {
      navigate('/dashboard');
    }
  }, [navigate]);

  const handleGoogleLogin = () => {
    window.location.href = '/api/auth/google';
  };

  const handleGitHubLogin = () => {
    window.location.href = '/api/auth/github';
  };

  const handleTestLogin = () => {
    // For testing: use the test user we created
    localStorage.setItem('userId', 'test-user-1');
    navigate('/dashboard');
  };

  return (
    <div style={{ padding: '2rem', textAlign: 'center', maxWidth: '400px', margin: '0 auto' }}>
      <h1>Login to Accountable AI</h1>
      <div style={{ marginTop: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <button 
          onClick={handleTestLogin}
          style={{ padding: '1rem', fontSize: '1rem', cursor: 'pointer', backgroundColor: '#4CAF50', color: 'white', border: 'none', borderRadius: '4px' }}
        >
          🧪 Test Login (Skip OAuth)
        </button>
        <button onClick={handleGoogleLogin}>Login with Google</button>
        <button onClick={handleGitHubLogin}>Login with GitHub</button>
      </div>
    </div>
  );
}

export default Login;

