import request from 'request';
import _ from 'underscore';
import moment from 'moment';
import settings from '../settings';

module.exports.getZip = (apiEndpoint, consentToken, deviceId) => {
  return new Promise((resolve, reject) => {
    const url = `${apiEndpoint}/v1/devices/${deviceId}/settings/address/countryAndPostalCode`;
    request({
      url,
      method: 'GET',
      headers: {
        Authorization: `Bearer ${consentToken}`
      }
    }, (error, res, body) => {
      if (error) {
        return reject(error);
      }
      try {
        const result = JSON.parse(body);
        if (_.isEmpty(result.postalCode)) {
          return reject({ error: 'wrong response.' });
        }
        return resolve(result.postalCode);
      } catch (e) {
        return reject(e);
      }
    });
  });
};

module.exports.zipToGeo = (zipcode) => {
  return new Promise((resolve, reject) => {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${zipcode}&key=${settings.googlekey}`;
    request(url, (error, res, body) => {
      if (error) {
        return reject(error);
      }
      try {
        const result = JSON.parse(body);
        if (result.status !== 'OK') {
          return reject({ error: 'wrong response.' });
        }
        if (_.isEmpty(result.results[0].geometry.location)) {
          return reject({ error: 'wrong response.' });
        }
        return resolve(result.results[0].geometry.location);
      } catch (e) {
        return reject(e);
      }
    });
  });
};

module.exports.getUvIndex = (lat, lng, date) => {
  return new Promise((resolve, reject) => {
    const geoLocation = `${lat.toFixed(1)},${lng.toFixed(1)}`;
    let time = null;
    if (date !== 'current') {
      time = `${moment.utc(date).format('YYYY-MM-DD')}Z`;
    } else {
      time = 'current';
    }
    const url = `http://api.openweathermap.org/v3/uvi/${geoLocation}/${time}.json?appid=${settings.weatherkey}`;
    request(url, (error, res, body) => {
      if (error) {
        return reject(error);
      }
      try {
        const result = JSON.parse(body);
        if (!_.isEmpty(result.message)) {
          return reject({ error: 'wrong response.' });
        }
        return resolve(result.data);
      } catch (e) {
        return reject(e);
      }
    });
  });
};

module.exports.getUvIndexByZip = (zipcode) => {
  return new Promise((resolve, reject) => {
    const url = `${settings.weather.url}${settings.weather.key}/conditions/q/${zipcode}.json`;
    request(url, (error, res, body) => {
      if (error) {
        return reject(error);
      }
      try {
        const result = JSON.parse(body);
        if (_.isEmpty(result.current_observation || result.current_observation.UV)) {
          return reject({ error: 'wrong response.' });
        }
        return resolve(result.current_observation.UV);
      } catch (e) {
        return reject(e);
      }
    });
  });
};

module.exports.uvIndexCheck = (uvindex) => {
  if (uvindex >= 0 && uvindex < 3) {
    return {
      keyWord: 'low danger from the sun\'s UV rays for the average person.',
      suggestion: [
        'Wear sunglasses on bright days.',
        'If you burn easily, cover up and use broad spectrum SPF 30+ sunscreen.',
        'Watch out for bright surfaces, like sand, water and snow, which reflect UV and increase exposure.'
      ]
    };
  } else if (uvindex >= 3 && uvindex < 6) {
    return {
      keyWord: 'moderate risk of harm from unprotected sun exposure.',
      suggestion: [
        'Stay in shade near midday when the sun is strongest.',
        'If outdoors, wear protective clothing, a wide-brimmed hat, and UV-blocking sunglasses.',
        'Generously apply broad spectrum SPF 30+ sunscreen every 2 hours, even on cloudy days, and after swimming or sweating.',
        'Watch out for bright surfaces, like sand, water and snow, which reflect UV and increase exposure.'
      ]
    };
  } else if (uvindex >= 6 && uvindex < 8) {
    return {
      keyWord: 'high risk of harm from unprotected sun exposure. Protection against skin and eye damage is needed.',
      suggestion: [
        'Reduce time in the sun between 10 a.m. and 4 p.m.',
        'If outdoors, seek shade and wear protective clothing, a wide-brimmed hat, and UV-blocking sunglasses.',
        'Generously apply broad spectrum SPF 30+ sunscreen every 2 hours, even on cloudy days, and after swimming or sweating.',
        'Watch out for bright surfaces, like sand, water and snow, which reflect UV and increase exposure.'
      ]
    };
  } else if (uvindex >= 8 && uvindex < 11) {
    return {
      keyWord: 'very high risk of harm from unprotected sun exposure. Take extra precautions because unprotected skin and eyes will be damaged and can burn quickly.',
      suggestion: [
        'Minimize sun exposure between 10 a.m. and 4 p.m.',
        'If outdoors, seek shade and wear protective clothing, a wide-brimmed hat, and UV-blocking sunglasses.',
        'Generously apply broad spectrum SPF 30+ sunscreen every 2 hours, even on cloudy days, and after swimming or sweating.',
        'Watch out for bright surfaces, like sand, water and snow, which reflect UV and increase exposure.'
      ]
    };
  }
  return {
    keyWord: 'extreme risk of harm from unprotected sun exposure. Take all precautions because unprotected skin and eyes can burn in minutes.',
    suggestion: [
      'Try to avoid sun exposure between 10 a.m. and 4 p.m.',
      'If outdoors, seek shade and wear protective clothing, a wide-brimmed hat, and UV-blocking sunglasses.',
      'Generously apply broad spectrum SPF 30+ sunscreen every 2 hours, even on cloudy days, and after swimming or sweating.',
      'Watch out for bright surfaces, like sand, water and snow, which reflect UV and increase exposure.'
    ]
  };
};
