module.exports = {
  googlekey: process.env.googlekey,
  weatherkey: process.env.weatherkey,
  weather: {
    url: 'http://api.wunderground.com/api/',
    key: process.env.weatherApiKey || ''
  },
  dynamodb: {
    region: 'us-east-1',
    tableName: 'uvindex'
  }
};
