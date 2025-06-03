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
  const [selectedRegion, setSelectedRegion] = useState('060610000000');
  const [selectedType, setSelectedType] = useState('633663'); // domyślny typ

  useEffect(() => {
    fetch('http://localhost:4000/api/bdl-data')
      .then(res => res.json())
      .then(setData)
      .catch(() => setErr('Błąd pobierania danych z serwera'));
  }, []);

const [nbpRefHistoryAvg, setNbpRefHistoryAvg] = useState([]);

useEffect(() => {
  fetch('http://localhost:4000/api/nbp-ref-history-avg')
    .then(res => res.json())
    .then(setNbpRefHistoryAvg)
    .catch(() => {});
}, []);

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
  if (err) return <div style={{ color: 'red' }}>{err}</div>;
  if (!data) return <div>Ładowanie danych...</div>;

  // Pobierz dane dla wybranego typu mieszkania i stopy procentowej
  const housingTypeData = data.housing[selectedType] || [];
  // Filtruj dane dla wybranego regionu
  const housingRegion = housingTypeData.find(r => r.regionId === selectedRegion);
  const housingResults = (housingRegion?.data?.results || []).filter(
    r => r.values[0]?.val != null && r.year >= 2013 && r.year <= 2023
  );


  const years = housingResults.map(r => r.year);
  const housingValues = housingResults.map(r => r.values[0]?.val);

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


  return (
    <div>
      <h1>Panel użytkownika</h1>
      <p>Jesteś zalogowany!</p>
      <h2>Dane z BDL</h2>
      <div>
        <label>Wybierz region:&nbsp;
          <select value={selectedRegion} onChange={e => setSelectedRegion(e.target.value)}>
            {Object.keys(regionNames).map(regionId => (
              <option key={regionId} value={regionId}>
                {regionNames[regionId]}
              </option>
            ))}
          </select>
        </label>
        <label style={{ marginLeft: 16 }}>Typ mieszkania:&nbsp;
          <select value={selectedType} onChange={e => setSelectedType(e.target.value)}>
            {Object.entries(housingTypeNames).map(([typeId, name]) => (
              <option key={typeId} value={typeId}>{name}</option>
            ))}
          </select>
        </label>
      </div>
      <div style={{ maxWidth: 800, margin: '2rem auto' }}>
        <h3>Ceny mieszkań</h3>
        <Line data={housingChartData} />
      </div>
        <div style={{ maxWidth: 800, margin: '2rem auto' }}>
          <h3>Stopa referencyjna NBP (historia)</h3>
            <Line data={nbpRefHistoryChartData} />
        </div>
    </div>
  );
};

export default Dashboard;