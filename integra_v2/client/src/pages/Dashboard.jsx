import React, { useEffect, useState } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { useNavigate } from 'react-router-dom';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

const regionNames = {
  '023210000000': 'REGION ZACHODNIOPOMORSKIE',
  '030210000000': 'REGION DOLNOŚLĄSKIE',
  '031610000000': 'REGION OPOLSKIE',
  '040410000000': 'REGION KUJAWSKO-POMORSKIE',
  '042210000000': 'REGION POMORSKIE',
  '042810000000': 'REGION WARMIŃSKO-MAZURSKIE',
  '051010000000': 'REGION ŁÓDZKIE',
  '052610000000': 'REGION ŚWIĘTOKRZYSKIE',
  '060610000000': 'REGION LUBELSKIE',
  '061810000000': 'REGION PODKARPACKIE',
  '062010000000': 'REGION PODLASKIE',
  '071410000000': 'REGION WARSZAWSKI STOŁECZNY',
  '071420000000': 'REGION MAZOWIECKI REGIONALNY',
  '011210000000': 'REGION MAŁOPOLSKIE',
  '012410000000': 'REGION ŚLĄSKIE',
  '020810000000': 'REGION LUBUSKIE',
  '023010000000': 'REGION WIELKOPOLSKIE',
};
const housingTypeNames = {
  '633663': 'do 40m2',
  '633664': 'od 40.1 m2 do 60m2',
  '633665': 'od 60m2 do 80m2',
  '633666': 'od 80m2',
};

const Dashboard = () => {
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');
  const [selectedType, setSelectedType] = useState('633663');
  const allRegionIds = Object.keys(regionNames);
  const [visibleRegions, setVisibleRegions] = useState(() =>
    Object.fromEntries(allRegionIds.map(id => [id, true]))
  );
  const [nbpRefHistoryAvg, setNbpRefHistoryAvg] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetch('http://localhost:4000/api/bdl-data')
      .then(res => res.json())
      .then(setData)
      .catch(() => setErr('Błąd pobierania danych z serwera'));
  }, []);

  useEffect(() => {
    fetch('http://localhost:4000/api/nbp-ref-history-avg')
      .then(res => res.json())
      .then(setNbpRefHistoryAvg)
      .catch(() => {});
  }, []);
  useEffect(() => {
    fetch('http://localhost:4000/api/secure-data', {
      headers: {
        Authorization: 'Bearer ' + localStorage.getItem('token')
      }
    })
      .then(res => res.json())
      .then(data => {
        // obsłuż dane chronione
        console.log('Dane chronione:', data);
      })
      .catch(() => {
        // obsłuż błąd autoryzacji
      });
  }, []);

  if (err) return <div style={{ color: 'red' }}>{err}</div>;
  if (!data) return <div>Ładowanie danych...</div>;

  const handleRegionCheckbox = (regionId) => {
    setVisibleRegions(prev => ({
      ...prev,
      [regionId]: !prev[regionId]
    }));
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/');
  };

  const nbpRefHistoryAvgFiltered = nbpRefHistoryAvg.filter(
    r => parseInt(r.year, 10) >= 2013 && parseInt(r.year, 10) <= 2023
  );

  const nbpRefHistoryLabels = nbpRefHistoryAvgFiltered.map(r => r.year);
  const nbpRefHistoryValues = nbpRefHistoryAvgFiltered.map(r => r.avgRate);

  const nbpRefHistoryChartData = {
    labels: nbpRefHistoryLabels,
    datasets: [
      {
        label: 'Średnia roczna stopa referencyjna NBP',
        data: nbpRefHistoryValues,
        borderColor: 'orange',
        backgroundColor: 'rgba(255,165,0,0.1)',
        tension: 0.2,
      },
    ],
  };

  const housingTypeData = data.housing[selectedType] || [];
  const datasets = housingTypeData
    .filter(region => visibleRegions[region.regionId])
    .map(region => {
      const results = (region.data?.results || []).filter(
        r => r.values[0]?.val != null && r.year >= 2013 && r.year <= 2023
      );
      return {
        label: regionNames[region.regionId] || region.regionId,
        data: results.map(r => r.values[0]?.val),
        borderColor: '#' + ((Math.abs(region.regionId.split('').reduce((a, c) => a + c.charCodeAt(0), 0)) * 1234567) % 0xffffff).toString(16).padStart(6, '0'),
        backgroundColor: 'rgba(0,0,0,0.05)',
        tension: 0.2,
      };
    });

  const years = Array.from({ length: 11 }, (_, i) => (2013 + i).toString());

  const housingChartData = {
    labels: years,
    datasets,
  };

  return (
    <div>
      <h1>Panel użytkownika</h1>
      <button onClick={handleLogout} style={{ float: 'right', marginTop: '-3rem' }}>Wyloguj</button>
      <p>Jesteś zalogowany!</p>
      <h2>Dane z BDL</h2>
      <div>
        <label>Typ mieszkania:&nbsp;
          <select value={selectedType} onChange={e => setSelectedType(e.target.value)}>
            {Object.entries(housingTypeNames).map(([typeId, name]) => (
              <option key={typeId} value={typeId}>{name}</option>
            ))}
          </select>
        </label>
      </div>
      <div style={{ maxWidth: 1000, margin: '2rem auto' }}>
        <h3>Ceny mieszkań</h3>
        <Line
          data={housingChartData}
          options={{
            scales: {
              y: {
                title: {
                  display: true,
                  text: 'Cena (PLN)'
                },
                ticks: {
                  stepSize: 50000,
                  callback: function(value) {
                    return value.toLocaleString('pl-PL') + ' zł';
                  }
                }
              },
              x: {
                title: {
                  display: true,
                  text: 'Rok'
                }
              }
            }
          }}
        />

      </div>
      <div style={{ maxWidth: 800, margin: '2rem auto' }}>
        <h3>Stopa referencyjna NBP (historia)</h3>
        <Line data={nbpRefHistoryChartData} />
      </div>
    </div>
  );
};

export default Dashboard;