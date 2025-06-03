const express = require('express');
const axios = require('axios');
const router = express.Router();
const Housing = require('../models/Housing');

const BDL_CLIENT_ID = '83ff02da-2edd-4095-33b7-08dd9ceefd0f';

const VARIABLE_IDS = {
  housingPrice : '633663',
  //interestRate: '176912',
};
const housingType = [
  '633663', // 'do 40m2',
  '633664', // 'od 40.1 m2 do 60m2',
  '633665', // 'od 60m2 do 80m2',
  '633666', // 'od 80m2 do 100m2',
]

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
const xml2js = require('xml2js');

// ...existing code...
async function fetchBDLData(variableId, years, regionIds) {
  const results = [];
  // Usuwamy xml2js i parser

  // Limit: 5 zapytań na sekundę (anonimowy użytkownik)
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
      format: 'json', // <-- zmiana na JSON
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

      // Odpowiedź jest już w formacie JSON
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
// ...existing code...

router.get('/bdl-data', async (req, res) => {
  try {
    // Pobierz dane dla wszystkich typów mieszkań
    const housingData = {};
    for (const typeId of housingType) {
      housingData[typeId] = await fetchBDLData(typeId, YEARS, REGION_IDS);
    }
    const interestData = await fetchBDLData(VARIABLE_IDS.interestRate, YEARS, REGION_IDS);

    res.json({
      housing: housingData,
      interest: interestData,
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

// Przykładowy endpoint testowy
router.get('/test', (req, res) => {
  res.json({ message: 'API działa!' });
});

module.exports = router;