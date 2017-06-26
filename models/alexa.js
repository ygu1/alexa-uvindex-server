import _ from 'underscore';
import * as serviceModel from './service';

const userSession = {};

module.exports = (alexaApp) => {
  alexaApp.launch(async (req, res) => {
    if (_.isEmpty(req.context) || _.isEmpty(req.context.System)) {
      res.say('Can not get your zipcode, please run it on a real device.');
      return res.send();
    }
    if (_.isEmpty(req.context.System.user.permissions)) {
      res.say('please approve sun proof to get your device postal code.');
      res.say('you can find the permission card in your alexa app.');
      res.card({
        type: 'AskForPermissionsConsent',
        permissions: [
          'read::alexa:device:all:address:country_and_postal_code'
        ]
      });
      return res.send();
    }
    const userId = req.context.System.user.userId;
    const consentToken = req.context.System.user.permissions.consentToken;
    const deviceId = req.context.System.device.deviceId;
    const apiEndpoint = req.context.System.apiEndpoint;
    try {
      const zipcode = await serviceModel.getZip(apiEndpoint, consentToken, deviceId);
      userSession[userId] = zipcode;
      res.say(`sun proof has been launched. your zipcode is ${zipcode}.`);
      res.say('you can ask the uv index now. for example, you can say, what\'s the uv index now.');
      res.shouldEndSession(false, 'you can ask the uv index now. for example, you can say, what\'s the uv index now.');
      return res.send();
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
      res.say('You can do like this, Alexa, open sun proof.');
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
        res.say(`For zipcode ${zipcode}, tomorrow, the max uv index will be ${uvindex.toFixed(1)}.`);
        res.say(keyWord.keyWord);
        return res.send();
      }
      res.say(`For zipcode ${zipcode}, today, the max uv index is ${uvindex.toFixed(1)}.`).send();
      res.say(keyWord.keyWord);
      return res.send();
    } catch (e) {
      console.log(e);
      return res.say('sorry, can not get the uv index now.').send();
    }
  });

  alexaApp.intent('suggestionIntent', {
    utterances: [
      'give me some protection tips.',
      'how to protect',
      'do you have any suggestion'
    ]
  }, async (req, res) => {
    const userId = req.getSession().details.userId;
    if (_.isEmpty(userSession[userId])) {
      res.say('Please launch the sun proof to get your location first.');
      res.say('You can do like this, Alexa, open sun proof.');
      return res.send();
    }
    try {
      const time = 'current';
      const zipcode = userSession[userId];
      const location = await serviceModel.zipToGeo(zipcode);
      const uvindex = await serviceModel.getUvIndex(location.lat, location.lng, time);
      const suggestions = serviceModel.uvIndexCheck(uvindex).suggestion;
      res.say(`for uv index ${uvindex.toFixed(1)}, there are ${suggestions.length + 1} suggestions.`);
      for (let i = 0; i < suggestions.length; i += 1) {
        res.say(`${i + 1}. ${suggestions[i]}`);
      }
      return res.send();
    } catch (e) {
      console.log(e);
      return res.say('sorry, can not get the suggestion now.').send();
    }
  });

  alexaApp.intent('AMAZON.StopIntent', (request, response) => {
    response.say('The sun proof has been ended, thanks for using it.').shouldEndSession(true);
    return response.send();
  });

  alexaApp.intent('AMAZON.CancelIntent', (request, response) => {
    response.say('The sun proof has been ended, thanks for using it.').shouldEndSession(true);
    return response.send();
  });

  alexaApp.intent('AMAZON.HelpIntent', (request, response) => {
    response.say('there are the tips how to use sun proof.');
    response.say('if you want to know today\'s uv index , for example, you can say: what\'s the uv index today.');
    response.say('if you want to get some protection tips, for example, you can say: give me some protection tips.');
    response.say('what can i do for you now?');
    return response.shouldEndSession(false).send();
  });
};
