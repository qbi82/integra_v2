// wykres zamienic 
// export 
//frontend 
// jwt xd 
// 
// ...existing imports and code...

import React, { useState } from 'react';
// ...istniejące importy...

const Dashboard = () => {
  // ...istniejący kod...

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

  // ...istniejący kod...

  return (
    <div>
      {/* ...istniejący kod... */}
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
      {/* ...istniejący kod... */}
    </div>
  );
};

export default Dashboard;