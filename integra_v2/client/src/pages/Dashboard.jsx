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
  const [selectedRegionForTypes, setSelectedRegionForTypes] = useState(allRegionIds[0]);
  const navigate = useNavigate();

  // Stan do eksportu
  const [showExport, setShowExport] = useState(false);
  const [exportRegions, setExportRegions] = useState(allRegionIds);
  const [exportTypes, setExportTypes] = useState(Object.keys(housingTypeNames));
  const [exportDateFrom, setExportDateFrom] = useState(2010);
  const [exportDateTo, setExportDateTo] = useState(2023);
  const [exportFormat, setExportFormat] = useState({ json: true, xml: false });

  // Funkcja eksportu
  const handleExport = async () => {
    const params = new URLSearchParams();
    exportRegions.forEach(r => params.append('regions', r));
    exportTypes.forEach(t => params.append('types', t));
    params.append('dateFrom', exportDateFrom);
    params.append('dateTo', exportDateTo);
    if (exportFormat.json) params.append('format', 'json');
    if (exportFormat.xml) params.append('format', 'xml');

    const res = await fetch(`http://localhost:4000/api/export?${params.toString()}`, {
      headers: { Authorization: 'Bearer ' + localStorage.getItem('token') }
    });
    const blob = await res.blob();
    const contentDisposition = res.headers.get('Content-Disposition');
    let filename = 'export';
    if (contentDisposition) {
      const match = contentDisposition.match(/filename="?([^"]+)"?/);
      if (match) filename = match[1];
    }
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
    setShowExport(false);
  };

  // Wymuś logowanie
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/');
    }
  }, [navigate]);

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

  // Wykres 1: regiony na jednym wykresie, typ mieszkania wybierany
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

  // Wykres 2: typy mieszkań na jednym wykresie, region wybierany
  const datasetsByType = Object.entries(housingTypeNames).map(([typeId, typeName]) => {
    const regionData = (data.housing[typeId] || []).find(r => r.regionId === selectedRegionForTypes);
    const results = (regionData?.data?.results || []).filter(
      r => r.values[0]?.val != null && r.year >= 2013 && r.year <= 2023
    );
    return {
      label: typeName,
      data: results.map(r => r.values[0]?.val),
      borderColor: '#' + ((Math.abs(typeId.split('').reduce((a, c) => a + c.charCodeAt(0), 0)) * 654321) % 0xffffff).toString(16).padStart(6, '0'),
      backgroundColor: 'rgba(0,0,0,0.05)',
      tension: 0.2,
    };
  });

  const housingChartDataByType = {
    labels: years,
    datasets: datasetsByType,
  };

  
  return (
    <div>
      <h1>Panel użytkownika</h1>
      <button onClick={handleLogout} style={{ float: 'right', marginTop: '-3rem' }}>Wyloguj</button>
      <p>Jesteś zalogowany!</p>
      <h2>Dane z BDL</h2>
      <button onClick={() => setShowExport(true)} style={{ margin: '1rem 0' }}>Eksportuj</button>
      {showExport && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div style={{ background: '#fff', padding: 24, borderRadius: 8, minWidth: 350 }}>
            <h3>Eksport danych</h3>
            <div>
              <strong>Regiony:</strong><br />
              {allRegionIds.map(regionId => (
                <label key={regionId} style={{ display: 'block' }}>
                  <input
                    type="checkbox"
                    checked={exportRegions.includes(regionId)}
                    onChange={e => {
                      setExportRegions(regions =>
                        e.target.checked
                          ? [...regions, regionId]
                          : regions.filter(r => r !== regionId)
                      );
                    }}
                  />
                  {regionNames[regionId]}
                </label>
              ))}
            </div>
            <div>
              <strong>Typy mieszkań:</strong><br />
              {Object.entries(housingTypeNames).map(([typeId, name]) => (
                <label key={typeId} style={{ display: 'block' }}>
                  <input
                    type="checkbox"
                    checked={exportTypes.includes(typeId)}
                    onChange={e => {
                      setExportTypes(types =>
                        e.target.checked
                          ? [...types, typeId]
                          : types.filter(t => t !== typeId)
                      );
                    }}
                  />
                  {name}
                </label>
              ))}
            </div>
            <div>
              <strong>Zakres lat:</strong><br />
              <input
                type="number"
                min="2010"
                max="2023"
                value={exportDateFrom}
                onChange={e => setExportDateFrom(Number(e.target.value))}
                style={{ width: 70 }}
              />{' '}
              do{' '}
              <input
                type="number"
                min="2010"
                max="2023"
                value={exportDateTo}
                onChange={e => setExportDateTo(Number(e.target.value))}
                style={{ width: 70 }}
              />
            </div>
            <div>
              <strong>Format eksportu:</strong><br />
              <label>
                <input
                  type="checkbox"
                  checked={exportFormat.json}
                  onChange={e => setExportFormat(f => ({ ...f, json: e.target.checked }))}
                /> JSON
              </label>
              <label style={{ marginLeft: 16 }}>
                <input
                  type="checkbox"
                  checked={exportFormat.xml}
                  onChange={e => setExportFormat(f => ({ ...f, xml: e.target.checked }))}
                /> XML
              </label>
            </div>
            <div style={{ marginTop: 16 }}>
              <button onClick={handleExport} disabled={!exportFormat.json && !exportFormat.xml}>Eksportuj</button>
              <button onClick={() => setShowExport(false)} style={{ marginLeft: 8 }}>Anuluj</button>
            </div>
          </div>
        </div>
      )}
      <div>
        <label>Typ mieszkania:&nbsp;
          <select value={selectedType} onChange={e => setSelectedType(e.target.value)}>
            {Object.entries(housingTypeNames).map(([typeId, name]) => (
              <option key={typeId} value={typeId}>{name}</option>
            ))}
          </select>
        </label>
      </div>
      {/* Dwa wykresy obok siebie */}
      <div style={{ display: 'flex', gap: 32, justifyContent: 'center', margin: '2rem auto', maxWidth: 1700 }}>
        <div style={{ flex: 1, minWidth: 400 }}>
          <h3>Ceny mieszkań (wszystkie regiony, wybrany typ)</h3>
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
        <div style={{ flex: 1, minWidth: 400 }}>
          <h3>Stopa referencyjna NBP (historia)</h3>
          <Line data={nbpRefHistoryChartData} />
        </div>
      </div>
      {/* Pozostałe wykresy pod spodem */}
      <div style={{ maxWidth: 1000, margin: '2rem auto' }}>
        <h3>Ceny mieszkań wg typu dla wybranego regionu</h3>
        <label>
          Wybierz region:&nbsp;
          <select
            value={selectedRegionForTypes}
            onChange={e => setSelectedRegionForTypes(e.target.value)}
          >
            {allRegionIds.map(regionId => (
              <option key={regionId} value={regionId}>
                {regionNames[regionId]}
              </option>
            ))}
          </select>
        </label>
        <Line
          data={housingChartDataByType}
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
    </div>
  );
};

export default Dashboard;