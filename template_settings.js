module.exports = {
  weather: {
    url: 'http://api.wunderground.com/api/',
    key: process.env.weatherApiKey
  },
  dynamodb: {
    region: process.env.region,
    tableName: process.env.tableName
  }
};
