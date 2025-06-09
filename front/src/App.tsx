import { useState } from 'react';
import TamagotchiLibrary from './lib/tamagotchi/TamagotchiLibrary';
import './App.css';

function App() {
  const [showTamagotchi, setShowTamagotchi] = useState(true);
  const [showTutorial, setShowTutorial] = useState(true);
  const [lastState, setLastState] = useState<any>(null);
  const [useAPI, setUseAPI] = useState(false);
  const [identity, setIdentity] = useState('demo-user-123');
  
  return (
    <div style={{ padding: '20px' }}>
      <h1>Hyligotchi Demo</h1>
      
      <div style={{ marginBottom: '20px', display: 'flex', gap: '10px' }}>
        <button 
          onClick={() => setShowTamagotchi(!showTamagotchi)}
          style={{
            padding: '10px 20px',
            fontSize: '16px',
            cursor: 'pointer',
            borderRadius: '5px',
            border: '2px solid #333',
            background: showTamagotchi ? '#f44336' : '#4CAF50',
            color: 'white',
            fontWeight: 'bold'
          }}
        >
          {showTamagotchi ? 'Hide' : 'Show'} Tamagotchi
        </button>
        
        <button 
          onClick={() => setShowTutorial(!showTutorial)}
          style={{
            padding: '10px 20px',
            fontSize: '16px',
            cursor: 'pointer',
            borderRadius: '5px',
            border: '2px solid #333',
            background: showTutorial ? '#ff9800' : '#2196F3',
            color: 'white',
            fontWeight: 'bold'
          }}
        >
          Tutorial: {showTutorial ? 'ON' : 'OFF'}
        </button>
        
        <button 
          onClick={() => setUseAPI(!useAPI)}
          style={{
            padding: '10px 20px',
            fontSize: '16px',
            cursor: 'pointer',
            borderRadius: '5px',
            border: '2px solid #333',
            background: useAPI ? '#4CAF50' : '#9e9e9e',
            color: 'white',
            fontWeight: 'bold'
          }}
        >
          API: {useAPI ? 'ENABLED' : 'DISABLED'}
        </button>
      </div>
      
      <p>This is a demo of the Tamagotchi library. Click the mini tamagotchi device in the bottom right corner to open the full experience!</p>
      <p>Use the "Tutorial" button to toggle the tutorial on/off for testing. In production, you'd typically show the tutorial only for new users.</p>
      <p><strong>Note:</strong> In demo mode, wallet connection is simulated. In production, pass isWalletConnected and onConnectWallet props.</p>
      {useAPI && (
        <div style={{ padding: '10px', background: '#e3f2fd', borderRadius: '5px', marginTop: '10px' }}>
          <strong>API Mode Active:</strong> Make sure the server is running at {import.meta.env.VITE_HYLIGOTCHI_API_URL || 'http://localhost:4008'}
          <br />
          <label style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '5px' }}>
            Identity: 
            <input 
              type="text" 
              value={identity} 
              onChange={(e) => setIdentity(e.target.value)}
              style={{ padding: '5px', borderRadius: '3px', border: '1px solid #ccc' }}
            />
          </label>
        </div>
      )}
      
      {lastState && (
        <div style={{ marginTop: '20px', padding: '10px', background: '#f0f0f0', borderRadius: '5px' }}>
          <h3>Last State Update:</h3>
          <pre>{JSON.stringify(lastState, null, 2)}</pre>
        </div>
      )}
      
      <TamagotchiLibrary 
        enabled={showTamagotchi}
        username="Player1"
        position="fixed"
        style={{ bottom: 40, right: 30, scale: 1.5 }}
        miniSize={120}
        showTutorial={showTutorial}
        onExpand={() => console.log('Tamagotchi expanded!')}
        onCollapse={() => console.log('Tamagotchi collapsed!')}
        onTutorialComplete={() => {
          console.log('Tutorial completed!');
          setShowTutorial(false); // Auto-hide tutorial after completion
        }}
        onStateChange={(state) => {
          console.log('Tamagotchi state changed:', state);
          setLastState(state);
        }}
        // Demo mode: wallet is always connected
        isWalletConnected={true}
        onConnectWallet={() => {
          console.log('Connect wallet clicked - in production, this would open wallet modal');
          alert('In production, this would open the wallet connection modal');
        }}
        // API integration
        identity={useAPI ? identity : undefined}
        useAPI={useAPI}
      />
    </div>
  );
}

export default App;
