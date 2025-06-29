const express = require('express');
const axios = require('axios');
const router = express.Router();
const Housing = require('../models/Housing');
const xml2js = require('xml2js');
const NBPRefRate = require('../models/NBPRefRate');
const json2xml = require('json2xml');
const sequelize = require('../db');
const BDL_CLIENT_ID = '83ff02da-2edd-4095-33b7-08dd9ceefd0f';


const housingType = [
  '633663', // 'do 40m2',
  '633664', // 'od 40.1 m2 do 60m2',
  '633665', // 'od 60m2 do 80m2',
  '633666', // 'od 80m2 do 100m2',
]

const jwt = require('jsonwebtoken');
const SECRET = 'tajny_klucz_jwt';

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Brak tokenu' });

  jwt.verify(token, SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: 'Nieprawidłowy token' });
    req.user = user;
    next();
  });
}

module.exports = authenticateToken;
const REGION_IDS = [
'023210000000',// REGION ZACHODNIOPOMORSKIE'
'030210000000',  //REGION DOLNOŚLĄSKIE
'031610000000',    //REGION OPOLSKIE
'040410000000',    //REGION KUJAWSKO-POMORSKIE
'042210000000',    //REGION POMORSKIE
'042810000000',    //REGION WARMIŃSKO-MAZURSKIE
'051010000000',    //REGION ŁÓDZKIE
'052610000000',    //REGION ŚWIĘTOKRZYSKIE
'060610000000',    //REGION LUBELSKIE
'061810000000',    //REGION PODKARPACKIE
'062010000000',    //REGION PODLASKIE
'071410000000',   //REGION WARSZAWSKI STOŁECZNY
'071420000000',  //REGION MAZOWIECKI REGIONALNY
'011210000000',    //REGION MAŁOPOLSKIE
'012410000000',    //REGION ŚLĄSKIE
'020810000000',   //REGION LUBUSKIE
'023010000000',    //REGION WIELKOPOLSKIE
];




const YEARS = Array.from({ length: 10 }, (_, i) => 2010 + i);


async function fetchBDLData(variableId, years, regionIds) {
  const results = [];

  const REQUESTS_PER_SECOND = 5;
  let requestCount = 0;
  let lastRequestTime = Date.now();

  for (const regionId of regionIds) {
    if (requestCount >= REQUESTS_PER_SECOND) {
      const now = Date.now();
      const wait = 1000 - (now - lastRequestTime);
      if (wait > 0) {
        await new Promise(res => setTimeout(res, wait));
      }
      requestCount = 0;
      lastRequestTime = Date.now();
    }

    const url = `https://bdl.stat.gov.pl/api/v1/data/by-variable/${variableId}`;
    const params = {
      format: 'json',
      'unit-parent-id': regionId,
      'unit-level': '3',
      year: years,
    };

    try {
      const response = await axios.get(url, {
        params,
        headers: {
          'X-ClientId': BDL_CLIENT_ID,
        },
      });

      const apiData = response.data;
      if (apiData.results && apiData.results.length > 0) {
        results.push({
          regionId,
          variableId,
          data: {
            results: apiData.results[0].values.map(v => ({
              year: v.year,
              values: [{ val: v.val }]
            }))
          }
        });
      }
    } catch (error) {
      console.error(`Błąd dla regionu ${regionId}, zmiennej ${variableId}:`, error.message);
    }

    requestCount++;
  }

  return results;
}
async function fetchNBPRefHistory() {
  const url = 'https://static.nbp.pl/dane/stopy/stopy_procentowe_archiwum.xml';
  try {
    const response = await axios.get(url, { responseType: 'text' });
    const xml = response.data;
    const result = await xml2js.parseStringPromise(xml, { explicitArray: false, mergeAttrs: true });

    const pozycjeArr = Array.isArray(result.stopy_procentowe_archiwum.pozycje)
      ? result.stopy_procentowe_archiwum.pozycje
      : [result.stopy_procentowe_archiwum.pozycje];

    // Zbierz daty i wartości stopy referencyjnej
    const refHistory = pozycjeArr
      .map(poz => {
        const date = poz.obowiazuje_od;
        const pozycjaArr = Array.isArray(poz.pozycja) ? poz.pozycja : [poz.pozycja];
        const ref = pozycjaArr.find(p => p.id === 'ref');
        if (ref) {
          return {
            date,
            rate: parseFloat(ref.oprocentowanie.replace(',', '.'))
          };
        }
        return null;
      })
      .filter(Boolean);

    return refHistory;
  } catch (e) {
    console.error('Błąd pobierania historii stóp NBP:', e.message);
    return [];
  }
}

router.get('/nbp-ref-history-avg', async (req, res) => {
  let rates = await NBPRefRate.findAll();
  if (rates.length === 0) {
    const history = await fetchNBPRefHistory();

    const byYear = {};
    history.forEach(({ date, rate }) => {
      const year = date.slice(0, 4);
      if (!byYear[year]) byYear[year] = [];
      byYear[year].push(rate);
    });

    let avgByYear = Object.entries(byYear).map(([year, rates]) => ({
      year: parseInt(year, 10),
      avgRate: rates.reduce((a, b) => a + b, 0) / rates.length,
    }));

    [2016, 2017, 2018, 2019].forEach(year => {
      if (!avgByYear.find(obj => obj.year === year)) {
        avgByYear.push({ year, avgRate: 1.5 });
      }
    });

    // transakcja start
    const transaction = await sequelize.transaction();
    try {
      for (const { year, avgRate } of avgByYear) {
        await NBPRefRate.create({ year, avgRate }, { transaction });
      }
      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
    // transakcja koniec

    rates = await NBPRefRate.findAll();
  }

  res.json(
    rates
      .map(r => ({ year: r.year, avgRate: r.avgRate }))
      .sort((a, b) => a.year - b.year)
  );
});
router.get('/bdl-data', async (req, res) => {
  try {
    const records = await Housing.findAll();
    const expectedCount = housingType.length * REGION_IDS.length * YEARS.length;
    if (records.length >= expectedCount) {
      const housingData = {};
      for (const typeId of housingType) {
        housingData[typeId] = REGION_IDS.map(regionId => ({
          regionId,
          variableId: typeId,
          data: {
            results: records
              .filter(r => r.typeId === typeId && r.regionId === regionId)
              .map(r => ({
                year: r.year,
                values: [{ val: r.price }]
              }))
          }
        }));
      }
      return res.json({ housing: housingData });
    }

    const housingData = {};
    const transaction = await sequelize.transaction();
    try {
      for (const typeId of housingType) {
        housingData[typeId] = await fetchBDLData(typeId, YEARS, REGION_IDS);
        for (const region of housingData[typeId]) {
          for (const result of region.data.results) {
            const price = result.values[0]?.val ?? null;
            if (price != null) {
              await Housing.findOrCreate({
                where: {
                  regionId: region.regionId,
                  year: result.year,
                  typeId: typeId,
                },
                defaults: {
                  price: price,
                },
                transaction 
              });
            }
          }
        }
      }
      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }

    res.json({
      housing: housingData,
    });
  } catch (e) {
    res.status(500).json({ error: 'Błąd pobierania danych z BDL', details: e.message });
  }
});

router.post('/save-housing', async (req, res) => {
  try {
    const { regionId, year, price } = req.body;
    if (!regionId || !year || price == null) {
      return res.status(400).json({ success: false, message: 'Brak wymaganych danych' });
    }
    const record = await Housing.create({ regionId, year, price });
    res.json({ success: true, record });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.get('/housing-db', async (req, res) => {
  try {
    const records = await Housing.findAll();
    res.json(records);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

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

router.get('/export', async (req, res) => {
  const { regions, types, dateFrom, dateTo, format } = req.query;
  const regionArr = Array.isArray(regions) ? regions : [regions];
  const typeArr = Array.isArray(types) ? types : [types];
  const formats = Array.isArray(format) ? format : [format];
  const from = parseInt(dateFrom, 10);
  const to = parseInt(dateTo, 10);

  // Pobierz rekordy mieszkan
  const records = await Housing.findAll({
    where: {
      regionId: regionArr,
      typeId: typeArr,
      year: { [require('sequelize').Op.between]: [from, to] }
    }
  });

  // Pobierz stopy procentowe z bazy
  const nbpRates = await NBPRefRate.findAll();
  const ratesByYear = {};
  nbpRates.forEach(r => {
    ratesByYear[r.year] = r.avgRate;
  });

  //mapowanie danych do formatu eksportu
  const data = records.map(r => ({
    region: regionNames[r.regionId] || r.regionId,
    type: housingTypeNames[r.typeId] || r.typeId,
    year: r.year,
    price: r.price,
    intRate: ratesByYear[r.year] ?? null
  }));

  let files = [];
  if (formats.includes('json')) {
    files.push({
      content: JSON.stringify(data, null, 2),
      type: 'application/json',
      filename: 'export.json'
    });
  }
  if (formats.includes('xml')) {
    files.push({
      content: json2xml({ records: data }),
      type: 'application/xml',
      filename: 'export.xml'
    });
  }

  if (files.length === 1) {
    res.setHeader('Content-Disposition', `attachment; filename="${files[0].filename}"`);
    res.setHeader('Content-Type', files[0].type);
    res.send(files[0].content);
  } else {
    const archiver = require('archiver');
    res.setHeader('Content-Disposition', 'attachment; filename="export.zip"');
    res.setHeader('Content-Type', 'application/zip');
    const archive = archiver('zip');
    archive.pipe(res);
    files.forEach(f => archive.append(f.content, { name: f.filename }));
    archive.finalize();
  }
});

module.exports = router;