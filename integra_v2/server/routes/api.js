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
'071410000000 ',   //REGION WARSZAWSKI STOŁECZNY
'071420000000 ',  //REGION MAZOWIECKI REGIONALNY
];




const YEARS = Array.from({ length: 10 }, (_, i) => 2010 + i);
const xml2js = require('xml2js');

async function fetchBDLData(variableId, years, regionIds) {
  const results = [];
  const parser = new xml2js.Parser({ explicitArray: false });

  for (const regionId of regionIds) {
    const url = `https://bdl.stat.gov.pl/api/v1/data/by-variable/${variableId}`;
    const params = {
      format: 'xml',
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
        responseType: 'text',
      });

      const parsed = await parser.parseStringPromise(response.data);

      const unitData = parsed.singleVariableData?.results?.unitData;
      let resultsArr = [];
      if (unitData && unitData.values && unitData.values.yearVal) {
        const yearVals = Array.isArray(unitData.values.yearVal)
          ? unitData.values.yearVal
          : [unitData.values.yearVal];
        resultsArr = yearVals.map(yv => ({
          year: yv.year,
          values: [{ val: Number(yv.val) }]
        }));
      }

      results.push({
        regionId,
        variableId,
        data: {
          results: resultsArr
        }
      });
    } catch (error) {
      console.error(`Błąd dla regionu ${regionId}, zmiennej ${variableId}:`, error.message);
    }
  }

  return results;
}

router.get('/bdl-data', async (req, res) => {
  try {
    const housingData = await fetchBDLData(VARIABLE_IDS.housingPrice, YEARS, REGION_IDS);
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