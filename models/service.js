import request from 'request';
import _ from 'underscore';
import AWS from 'aws-sdk';
import settings from '../settings';

AWS.config.update({ region: settings.dynamodb.region });
const dynamodb = new AWS.DynamoDB();
const tableName = settings.dynamodb.tableName;

module.exports.putItem = (item) => {
  return new Promise((resolve, reject) => {
    const params = {
      Item: {
        userId: {
          S: item.userId
        },
        zipcode: {
          S: item.zipcode
        }
      },
      TableName: tableName,
      ReturnConsumedCapacity: 'INDEXES'
    };
    dynamodb.putItem(params, (err, data) => {
      if (err) {
        return reject(err);
      }
      return resolve(data);
    });
  });
};

module.exports.updateItem = (item) => {
  return new Promise((resolve, reject) => {
    const params = {
      TableName: tableName,
      Key: {
        userId: {
          S: item.userId
        }
      },
      ExpressionAttributeValues: {
        ':val': {
          S: item.zipcode
        }
      },
      UpdateExpression: 'set zipcode = :val',
      ReturnValues: 'ALL_NEW'
    };
    dynamodb.updateItem(params, (err, data) => {
      if (err) {
        return reject(err);
      }
      return resolve(data);
    });
  });
};

module.exports.getItemByUserId = (userId) => {
  return new Promise((resolve, reject) => {
    const params = {
      Key: {
        userId: {
          S: userId
        }
      },
      TableName: tableName
    };
    dynamodb.getItem(params, (err, data) => {
      if (err) {
        return reject(err);
      }
      return resolve(data);
    });
  });
};

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

module.exports.getUvIndexByLocation = (city, state) => {
  return new Promise((resolve, reject) => {
    const url = `${settings.weather.url}${settings.weather.key}/conditions/q/${state}/${city}.json`;
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
