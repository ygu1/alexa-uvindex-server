import _ from 'underscore';
import serviceModel from './service';

module.exports = (alexaApp) => {
  alexaApp.dictionary = { names: ['today', 'now', 'tomorrow'] };

  alexaApp.launch(async (req, res) => {
    let userDetail = {};
    let zipcode = '';
    const userId = req.getSession().details.userId;
    try {
      userDetail = await serviceModel.getItemByUserId(userId);
    } catch (e) {
      console.log(e);
    }
    if (_.isEmpty(userDetail)) {
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
      const consentToken = req.context.System.user.permissions.consentToken;
      const deviceId = req.context.System.device.deviceId;
      const apiEndpoint = req.context.System.apiEndpoint;
      try {
        zipcode = await serviceModel.getZip(apiEndpoint, consentToken, deviceId);
        await serviceModel.putItem({ userId, zipcode });
      } catch (e) {
        console.log(e);
        return res.say('I can not get your zipcode now, please try it later.').send();
      }
    } else {
      zipcode = userDetail.Item.zipcode.S;
    }
    res.say(`sun proof has been launched. your zipcode is ${zipcode}.`);
    res.say('you can ask the uv index now. for example, you can say, what\'s the uv index now.');
    res.shouldEndSession(false, 'you can ask the uv index now. for example, you can say, what\'s the uv index now.');
    return res.send();
  });

  alexaApp.intent('checkIntent', {
    slots: { NAME: 'LITERAL' },
    utterances: [
      'check the uv index for {names|NAME}',
      'check it for {names|NAME}',
      'what\'s the uv index {names|NAME}',
      'what will the uv index be {names|NAME}'
    ]
  }, async (req, res) => {
    const userId = req.getSession().details.userId;
    let userDetail = {};
    try {
      userDetail = await serviceModel.getItemByUserId(userId);
    } catch (e) {
      console.log(e);
    }
    if (_.isEmpty(userDetail)) {
      res.say('Please launch the sun proof to get your location first.');
      res.say('You can do like this, Alexa, open sun proof.');
      return res.send();
    }
    const zipcode = userDetail.Item.zipcode.S;
    try {
      const uvindex = await serviceModel.getUvIndexByZip(zipcode);
      const keyWord = serviceModel.uvIndexCheck(uvindex);
      res.say(`For zipcode ${zipcode}, now, the uv index is ${uvindex}.`).send();
      res.say(keyWord.keyWord);
      return res.send();
    } catch (e) {
      console.log(e);
      return res.say('sorry, can not get the uv index now.').send();
    }
  });

  alexaApp.intent('locationIntent', {
    slots: {
      CITY: 'AMAZON.US_CITY',
      STATE: 'AMAZON.US_STATE'
    },
    utterances: [
      'what\'s the uv index in {CITY} {STATE}.'
    ]
  }, async (req, res) => {
    const city = req.slot('CITY');
    const state = req.slot('STATE');
    try {
      const uvindex = await serviceModel.getUvIndexByLocation(city, state);
      const keyWord = serviceModel.uvIndexCheck(uvindex);
      res.say(`the uv index in ${city}, ${state} now is ${uvindex}.`).send();
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
    let userDetail = {};
    try {
      userDetail = await serviceModel.getItemByUserId(userId);
    } catch (e) {
      console.log(e);
    }
    if (_.isEmpty(userDetail)) {
      res.say('Please launch the sun proof to get your location first.');
      res.say('You can do like this, Alexa, open sun proof.');
      return res.send();
    }
    const zipcode = userDetail.Item.zipcode.S;
    try {
      const uvindex = await serviceModel.getUvIndexByZip(zipcode);
      const suggestions = serviceModel.uvIndexCheck(uvindex).suggestion;
      res.say(`for uv index ${uvindex}, there are ${suggestions.length + 1} suggestions.`);
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
    response.say('if you want to know the uv index for your current location, for example, you can say: what\'s the uv index now.');
    response.say('if you want to know the uv index for another location, for example, you can say: what\'s the uv index in seattle, washington.');
    response.say('if you want to get some protection tips, for example, you can say: give me some protection tips.');
    response.say('what can i do for you now?');
    return response.shouldEndSession(false).send();
  });
};
