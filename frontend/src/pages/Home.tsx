import { Link } from 'react-router-dom';

function Home() {
  return (
    <div style={{ padding: '2rem', textAlign: 'center' }}>
      <h1>Accountable AI</h1>
      <p>Your AI-powered Virtual Chartered Accountant</p>
      <div style={{ marginTop: '2rem' }}>
        <Link to="/login">
          <button>Get Started</button>
        </Link>
      </div>
    </div>
  );
}

export default Home;

