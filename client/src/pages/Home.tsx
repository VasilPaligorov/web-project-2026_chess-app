import { useState } from 'react';
import axios from 'axios';

export default function Home() {
  const [response, setResponse] = useState<string | null>(null);

  async function testConnection() {
    try {
      const res = await axios.get('http://localhost:3000/api/health');
      setResponse(res.data.message);
    } catch {
      setResponse('Failed to connect to server');
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', padding: '2rem' }}>
      <h1>Head2Head Chess</h1>
      <button onClick={testConnection}>Test Server Connection</button>
      {response && <p>{response}</p>}
    </div>
  );
}
