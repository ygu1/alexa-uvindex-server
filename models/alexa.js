import _ from 'underscore';
import * as serviceModel from './service';

const userSession = {};

module.exports = (alexaApp) => {
  alexaApp.launch(async (req, res) => {
    if (_.isEmpty(req.context.System)) {
      return res.say('please approve sun proof to get your device country and postal code in your application settings.').send();
    }
    const userId = req.context.System.user.userId;
    const consentToken = req.context.System.user.permissions.consentToken;
    const deviceId = req.context.System.device.deviceId;
    const apiEndpoint = req.contex.System.apiEndpoint;
    try {
      const zipcode = await serviceModel.getZip(apiEndpoint, consentToken, deviceId);
      userSession[userId] = zipcode;
      return res.say('sun proof has been launched.').send();
    } catch (e) {
      console.log(e);
      return res.say('I can not get your zipcode now, please try it later.').send();
    }
  });

  alexaApp.dictionary = { names: ['today', 'now', 'tomorrow'] };

  alexaApp.intent('checkIntent', {
    slots: { NAME: 'LITERAL' },
    utterances: [
      'check the uv index for {names|NAME}',
      'check it for {names|NAME}',
      'what\'s the uv index {names|NAME}',
      'what will the uv index be {names|NAME}'
    ]
  }, async (req, res) => {
    const timeWord = req.slot('NAME');
    const userId = req.getSession().details.userId;
    if (_.isEmpty(userSession[userId])) {
      res.say('Please launch the sun proof to get your location first.');
      res.say('You can do, Alexa, open sun proof.');
      return res.send();
    }
    try {
      let time = 'current';
      if (timeWord === 'tomorrow') {
        time = new Date(new Date().getTime() + 24 * 60 * 60 * 1000);
      }
      const zipcode = userSession[userId];
      const location = await serviceModel.zipToGeo(zipcode);
      const uvindex = await serviceModel.getUvIndex(location.lat, location.lng, time);
      const keyWord = serviceModel.uvIndexCheck(uvindex);
      if (timeWord === 'tomorrow') {
        res.say(`tomorrow, the max uv index will be ${uvindex.toFixed(1)}.`);
        res.say(keyWord.keyWord);
        return res.send();
      }
      res.say(`today, the max uv index is ${uvindex.toFixed(1)}.`).send();
      res.say(keyWord.keyWord);
      return res.send();
    } catch (e) {
      console.log(e);
      return res.say('sorry, can not get the uv index now.').send();
    }
  });
};
