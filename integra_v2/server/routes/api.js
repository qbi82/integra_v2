const express = require('express');
const axios = require('axios');
const router = express.Router();

//klient 83ff02da-2edd-4095-33b7-08dd9ceefd0f

async function fetchBDLData(variableId, years, regionIds) {
  const results = [];

  for (const regionId of regionIds) {
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
          'X-ClientId': '83ff02da-2edd-4095-33b7-08dd9ceefd0f',
        },
      });

      results.push({ regionId, variableId, data: response.data });
    } catch (error) {
      console.error(`Błąd dla regionu ${regionId}, zmiennej ${variableId}:`, error.message);
    }
  }

  return results;
}

// Przykładowy endpoint API
router.get('/test', (req, res) => {
  res.json({ message: 'API działa!' });
});

module.exports = router;