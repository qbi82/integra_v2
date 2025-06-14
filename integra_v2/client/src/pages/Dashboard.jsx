import React, { useEffect, useState } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,    
  BarController, 
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { useNavigate } from 'react-router-dom';
import { Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement,  BarElement, 
  BarController,Title, Tooltip, Legend);

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
  const [selectedBarType, setSelectedBarType] = useState('633663');
  const [selectedType, setSelectedType] = useState('633663'); 
  const allRegionIds = Object.keys(regionNames);
  const [visibleRegions, setVisibleRegions] = useState(() =>
    Object.fromEntries(allRegionIds.map(id => [id, true]))
  );
  const [nbpRefHistoryAvg, setNbpRefHistoryAvg] = useState([]);
  const [selectedRegionForTypes, setSelectedRegionForTypes] = useState(allRegionIds[0]);
  const navigate = useNavigate();

  const [username, setUsername] = useState('');

  const [showExport, setShowExport] = useState(false);
  const [exportRegions, setExportRegions] = useState([allRegionIds[0]]);
  const [exportTypes, setExportTypes] = useState([Object.keys(housingTypeNames)[0]]);
  const [exportDateFrom, setExportDateFrom] = useState(2013);
  const [exportDateTo, setExportDateTo] = useState(2023);
  const [exportFormat, setExportFormat] = useState({ json: true, xml: false });

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

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/');
    }
  }, [navigate]);

 useEffect(() => {
  const token = localStorage.getItem('token');
  if (token) {
    fetch('http://localhost:4000/auth/me', {
      headers: { Authorization: 'Bearer ' + token }
    })
      .then(res => res.json())
      .then(data => setUsername(data.username || ''))
      .catch(() => setUsername(''));
  }
}, []);

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

  if (err) return <div style={{ color: 'red' }}>{err}</div>;
  if (!data) return <div>Ładowanie danych...</div>;

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

  const typeColors = [
    '#7b1fa2', 
    '#1976d2', 
    '#388e3c',
    '#fbc02d', 
  ];

  const datasetsByType = Object.entries(housingTypeNames).map(([typeId, typeName], idx) => {
    const regionData = (data.housing[typeId] || []).find(r => r.regionId === selectedRegionForTypes);
    const results = (regionData?.data?.results || []).filter(
      r => r.values[0]?.val != null && r.year >= 2013 && r.year <= 2023
    );
    return {
      label: typeName,
      data: results.map(r => r.values[0]?.val),
      borderColor: typeColors[idx],
      backgroundColor: typeColors[idx] + '22', 
      tension: 0.2,
      borderWidth: 4,
      pointRadius: 2,
    };
  });

  const housingChartDataByType = {
    labels: years,
    datasets: datasetsByType,
  };

  const barHousingTypeData = data.housing[selectedBarType] || [];
  const avgPricesByYear = years.map(year => {
    const values = barHousingTypeData
      .map(region =>
        (region.data?.results || []).find(r => r.year === parseInt(year))?.values[0]?.val
      )
      .filter(v => v != null);
    if (values.length === 0) return null;
    return values.reduce((a, b) => a + b, 0) / values.length;
  });

  const nbpRatesByYear = years.map(year =>
    nbpRefHistoryAvgFiltered.find(r => r.year === parseInt(year))?.avgRate ?? null
  );

  const barChartData = {
    labels: years,
    datasets: [
      {
        type: 'bar',
        label: 'Średnia cena mieszkań (PLN)',
        data: avgPricesByYear,
        backgroundColor: '#7b1fa2',
        yAxisID: 'y',
        order: 2,
      },
      {
        type: 'line',
        label: 'Stopa referencyjna NBP (%)',
        data: nbpRatesByYear,
        borderColor: 'orange',
        backgroundColor: 'rgba(255,165,0,0.15)',
        yAxisID: 'y1',
        tension: 0.2,
        pointRadius: 3,
        borderWidth: 5,
        order: 1,
      }
    ]
  };

  return (
    <div style={{ width:'100%', margin: '0 auto', padding: '0px' }}>
      <div className="dashboard-navbar">
        <div className="dashboard-navbar-left">
          <span className="dashboard-welcome">
            Witaj{username ? `, ${username}!` : '!'}
          </span>
          <button className="dashboard-export-btn" onClick={() => setShowExport(true)}>
            Eksportuj
          </button>
        </div>
        <button className="dashboard-logout-btn" onClick={handleLogout}>
          Wyloguj
        </button>
      </div>
      {showExport && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div className="login-container export-modal">
            <h3>Eksport danych</h3>
            <div className="export-modal-columns">
              <div>
                <strong>Regiony:</strong>
                <div className="export-regions-grid">
                  {allRegionIds.map(regionId => (
                    <label key={regionId}>
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
              </div>
              <div>
                <strong>Typy mieszkań:</strong>
                <div className="export-types-list">
                  {Object.entries(housingTypeNames).map(([typeId, name]) => (
                    <label key={typeId}>
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
              </div>
            </div>
            <div>
              <strong>Zakres lat:</strong><br />
              <input
                type="number"
                min="2013"
                max="2023"
                value={exportDateFrom}
                onChange={e => setExportDateFrom(Number(e.target.value))}
                style={{ width: 70 }}
              />{' '}
              do{' '}
              <input
                type="number"
                min="2013"
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
      <div style={{ display: 'flex', gap: 20, justifyContent: 'center', alignItems: 'flex-start', margin: '2rem auto', width:'100%'}}>
        <div style={{ flex: 1, minWidth: 500, maxWidth: 760, maxHeight: 625 }}>
          <h3 className="chart-section-title">Ceny mieszkań (wszystkie regiony, wybrany typ)</h3>
           <div className="chart-section-select">
            <label>Typ mieszkania:&nbsp;
              <select value={selectedType} onChange={e => setSelectedType(e.target.value)}>
                {Object.entries(housingTypeNames).map(([typeId, name]) => (
                  <option key={typeId} value={typeId}>{name}</option>
                ))}
              </select>
            </label>
          </div>
          <Line
            data={housingChartData}
            options={{
              maintainAspectRatio: false,
              plugins: {
                legend: {
                  position: 'top',
                  labels: {
                    boxWidth: 20,
                    font: { size: 12 },
                    padding: 10,
                  }
                }
              },
              elements: {
                point: {
                  radius: 2,
                  borderWidth: 4,
                  backgroundColor: '#fff',
                }
              },
              scales: {
                y: {
                  title: {
                    display: true,
                    text: 'Cena (PLN)'
                  },
                  ticks: {
                    stepSize: 50000,
                    callback: function (value) {
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
            height={400}
            width={700}
          />
        </div>
        <div style={{ flex: 1, minWidth: 500, maxWidth: 750, maxHeight: 510 }}>
          <h3 className="chart-section-title" style={{ paddingBottom: 146 }} >Stopa referencyjna NBP (historia)</h3>
          <Line
            data={nbpRefHistoryChartData}
            options={{
              maintainAspectRatio: false,
              plugins: {
                legend: {
                  position: 'top',
                  labels: {
                    boxWidth: 20,
                    font: { size: 12 },
                    padding: 10,
                  }
                }
              },
              elements: {
                point: {
                  radius: 2,
                  borderWidth: 4,
                  backgroundColor: '#fff',
                }
              },
            }}
            height={500}
            width={700}
          />
        </div>
      </div>
      <div
        style={{
          display: 'block',
          width: '100%',
          maxWidth: 1000,
          margin: '10rem auto 2rem auto',
          clear: 'both',
        }}
      >
        <h3 className="chart-section-title">Ceny mieszkań wg typu dla wybranego regionu</h3>
        <div className="chart-section-select">
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
        </div>
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
                  callback: function (value) {
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
            },
            elements: {
                point: {
                  radius: 3,
                  borderWidth: 5
                }
              }
          }}
        />
      </div>
      <div
  style={{
    display: 'block',
    width: '100%',
    maxWidth: 1100,
    margin: '4rem auto 1rem auto',
    clear: 'both',
  }}
>
  <h3 className="chart-section-title">Średnia cena mieszkań (wszystkie regiony, wybrany typ) i stopy referencyjne NBP</h3>
  <div className="chart-section-select">
    <label>
      Typ mieszkania:&nbsp;
      <select value={selectedBarType} onChange={e => setSelectedBarType(e.target.value)}>
        {Object.entries(housingTypeNames).map(([typeId, name]) => (
          <option key={typeId} value={typeId}>{name}</option>
        ))}
      </select>
    </label>
  </div>
  <Bar
    data={barChartData}
    options={{
      responsive: true,
      plugins: {
        legend: { position: 'top' },
        tooltip: { mode: 'index', intersect: false }
      },
      elements: {
        bar: {
          barPercentage: 0.7, 
          categoryPercentage: 0.7
        }
      },
      scales: {
        y: {
          type: 'linear',
          position: 'left',
          title: { display: true, text: 'Cena (PLN)' },
          ticks: {
            callback: value => value.toLocaleString('pl-PL') + ' zł',
            beginAtZero: true
          }
        },
        y1: {
          type: 'linear',
          position: 'right',
          title: { display: true, text: 'Stopa referencyjna (%)' },
          grid: { drawOnChartArea: false },
          min: 0,
          max: 8,
        },
        x: {
          title: { display: true, text: 'Rok' }
        }
      }
    }}
    width={800}
    height={400}
  />
</div>
    </div>
  );
};

export default Dashboard;