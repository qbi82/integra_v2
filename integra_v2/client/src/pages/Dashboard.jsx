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
};


const Dashboard = () => {
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('060000000000');

  useEffect(() => {
    fetch('http://localhost:4000/api/bdl-data')
      .then(res => res.json())
      .then(setData)
      .catch(() => setErr('Błąd pobierania danych z serwera'));
  }, []);

  if (err) return <div style={{ color: 'red' }}>{err}</div>;
  if (!data) return <div>Ładowanie danych...</div>;

  // Filtruj dane dla wybranego regionu
  const housingRegion = data.housing.find(r => r.regionId === selectedRegion);
  const interest = data.interest[1]; // Polska ogółem

  // Przygotuj dane do wykresów, filtrując tylko te z wartościami liczbowymi
  const housingResults = housingRegion?.data?.results?.filter(r => r.values[0]?.val != null) || [];
  const interestResults = interest?.data?.results?.filter(r => r.values[0]?.val != null) || [];

  const years = housingResults.map(r => r.year);
  const housingValues = housingResults.map(r => r.values[0]?.val);
  const interestYears = interestResults.map(r => r.year);
  const interestValues = interestResults.map(r => r.values[0]?.val);

  const housingChartData = {
    labels: years,
    datasets: [
      {
        label: `Ceny mieszkań (${regionNames[selectedRegion]})`,
        data: housingValues,
        borderColor: 'blue',
        backgroundColor: 'rgba(0,0,255,0.1)',
      },
    ],
  };

  const interestChartData = {
    labels: interestYears,
    datasets: [
      {
        label: 'Stopy procentowe (Polska)',
        data: interestValues,
        borderColor: 'green',
        backgroundColor: 'rgba(0,255,0,0.1)',
      },
    ],
  };

  return (
    <div>
      <h1>Panel użytkownika</h1>
      <p>Jesteś zalogowany!</p>
      <h2>Dane z BDL</h2>
      <div>
        <label>Wybierz region:&nbsp;
          <select value={selectedRegion} onChange={e => setSelectedRegion(e.target.value)}>
            {data.housing.map(r => (
              <option key={r.regionId} value={r.regionId}>
                {regionNames[r.regionId] || r.regionId}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div style={{ maxWidth: 700, margin: '2rem auto' }}>
        <Line data={housingChartData} options={{ responsive: true, plugins: { legend: { position: 'top' } } }} />
      </div>
      <div style={{ maxWidth: 700, margin: '2rem auto' }}>
        <Line data={interestChartData} options={{ responsive: true, plugins: { legend: { position: 'top' } } }} />
      </div>
    </div>
  );
};

export default Dashboard;