const express = require('express');
const axios = require('axios');
const router = express.Router();
const Housing = require('../models/Housing');
const xml2js = require('xml2js');
const NBPRefRate = require('../models/NBPRefRate');

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
async function fetchNBPRefHistory() {
  const url = 'https://static.nbp.pl/dane/stopy/stopy_procentowe_archiwum.xml';
  try {
    const response = await axios.get(url, { responseType: 'text' });
    const xml = response.data;
    const result = await xml2js.parseStringPromise(xml, { explicitArray: false, mergeAttrs: true });

    // Każdy <pozycje> to zmiana stóp, interesuje nas tylko id="ref"
    const pozycjeArr = Array.isArray(result.stopy_procentowe_archiwum.pozycje)
      ? result.stopy_procentowe_archiwum.pozycje
      : [result.stopy_procentowe_archiwum.pozycje];

    // Zbierz daty i wartości stopy referencyjnej
    const refHistory = pozycjeArr
      .map(poz => {
        const date = poz.obowiazuje_od;
        // pozycja może być tablicą lub obiektem
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
  // Pobierz z bazy
  let rates = await NBPRefRate.findAll();
  if (rates.length === 0) {
    // Jeśli brak danych, pobierz z API i uzupełnij ręcznie
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

    // Dodaj brakujące lata 2016-2019 z wartością 1.5
    [2016, 2017, 2018, 2019].forEach(year => {
      if (!avgByYear.find(obj => obj.year === year)) {
        avgByYear.push({ year, avgRate: 1.5 });
      }
    });

    // Zapisz do bazy
    for (const { year, avgRate } of avgByYear) {
      await NBPRefRate.create({ year, avgRate });
    }
    rates = await NBPRefRate.findAll();
  }

  // Zwróć posortowane dane
  res.json(
    rates
      .map(r => ({ year: r.year, avgRate: r.avgRate }))
      .sort((a, b) => a.year - b.year)
  );
});
router.get('/bdl-data', async (req, res) => {
  try {
    // Sprawdź, czy dane już są w bazie
    const records = await Housing.findAll();
    // Zakładamy, że komplet to: typy * regiony * lata
    const expectedCount = housingType.length * REGION_IDS.length * YEARS.length;
    if (records.length >= expectedCount) {
      // Dane są kompletne, zwróć z bazy w tym samym formacie co dotychczas
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

    // Jeśli nie ma kompletu danych, pobierz z API i zapisz do bazy
    const housingData = {};
    for (const typeId of housingType) {
      housingData[typeId] = await fetchBDLData(typeId, YEARS, REGION_IDS);

      // Zapisz do bazy WSZYSTKIE rekordy
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
            });
          }
        }
      }
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

// Przykładowy endpoint testowy
router.get('/test', (req, res) => {
  res.json({ message: 'API działa!' });
});

module.exports = router;