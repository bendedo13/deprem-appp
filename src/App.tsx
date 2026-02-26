
import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import EarthquakeList from './components/EarthquakeList';
import SOS from './components/SOS';
import Footer from './components/Footer';
import './App.css';

const App: React.FC = () => {
  const [earthquakes, setEarthquakes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sosActive, setSosActive] = useState(false);

  useEffect(() => {
    fetchEarthquakes();
    const interval = setInterval(fetchEarthquakes, 60000);
    return () => clearInterval(interval);
  }, []);

  const fetchEarthquakes = async () => {
    try {
      const response = await fetch('http://localhost:8086/api/earthquakes');
      const data = await response.json();
      setEarthquakes(data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching earthquakes:', error);
      setLoading(false);
    }
  };

  return (
    <div className="App">
      <Header />
      {sosActive && <SOS onClose={() => setSosActive(false)} />}
      <main className="main-content">
        <button 
          className="sos-button"
          onClick={() => setSosActive(true)}
        >
          SOS
        </button>
        <EarthquakeList earthquakes={earthquakes} loading={loading} />
      </main>
      <Footer />
    </div>
  );
};

export default App;
