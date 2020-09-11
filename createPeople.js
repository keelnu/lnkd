/* eslint-disable no-unused-expressions */
const fs = require('fs');
const readline = require('readline');
const { google } = require('googleapis');
const { makeFilePath, getFromFile } = require('./utils/fileUtils');

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets.readonly'];

const TOKEN_PATH = 'token.json';
const { cohort } = getFromFile('credentials.json');
const cohortPath = makeFilePath('people.json');
const googleCredentials = makeFilePath('gapp-creds.json')

fs.readFile(googleCredentials, (err, content) => {
  if (err) return console.log('Error loading client secret file:', err);
  // Authorize a client with credentials, then call the Google Sheets API.
  authorize(JSON.parse(content), createPeople);
});

function authorize(credentials, callback) {
  const { client_secret, client_id, redirect_uris } = credentials.installed;
  const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

  // Check if we have previously stored a token.
  fs.readFile(TOKEN_PATH, (err, token) => {
    if (err) return getNewToken(oAuth2Client, callback);
    oAuth2Client.setCredentials(JSON.parse(token));
    callback(oAuth2Client);
  });
}

function getNewToken(oAuth2Client, callback) {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });
  console.log('Authorize this app by visiting this url:', authUrl);
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  rl.question('Enter the code from that page here: ', (code) => {
    rl.close();
    oAuth2Client.getToken(code, (err, token) => {
      if (err) return console.error('Error while trying to retrieve access token', err);
      oAuth2Client.setCredentials(token);
      // Store the token to disk for later program executions
      fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
        if (err) return console.error(err);
        console.log('Token stored to', TOKEN_PATH);
      });
      callback(oAuth2Client);
    });
  });
}

function createPeople(auth) {
  const sheets = google.sheets({ version: 'v4', auth });
  sheets.spreadsheets.values.get({
    spreadsheetId: '17ewhQD6dM97PgegSn_M9LCFIloDw7VJevDe9Pc4_ZuI',
    range: `${cohort}!A2:E`,
  }, (err, res) => {
    if (err) return console.log(`The API returned an error: ${err}`);
    const rows = res.data.values;
    if (rows.length) {
      // Print columns A and E, which correspond to indices 0 and 4.
      const cohortMate = [];
      rows.map((row) => {
        const person = {};
        person.name = row[0],
        person.linkedin = { url: row[3], didVisit: false },
        person.github = { url: row[4], didVisit: false },
        cohortMate.push(person);
      });
      console.log(cohortMate);
      fs.writeFileSync(cohortPath, JSON.stringify(cohortMate));
    } else {
      console.log('No data found.');
    }
  });
}
