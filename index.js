const fs = require("fs")
const readline = require("readline")
const { google } = require("googleapis")

require("dotenv").config()

// If modifying these scopes, delete token.json.
const SCOPES = ["https://www.googleapis.com/auth/calendar.readonly", "https://www.googleapis.com/auth/calendar.events"]
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const TOKEN_PATH = "token.json"

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 * @param {google.auth.OAuth2} oAuth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback for the authorized client.
 */
function getAccessToken(oAuth2Client, callback) {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
  })
  console.log("Authorize this app by visiting this url:", authUrl)
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })
  rl.question("Enter the code from that page here: ", (code) => {
    rl.close()
    oAuth2Client.getToken(code, (err, token) => {
      if (err) return console.error("Error retrieving access token", err)
      oAuth2Client.setCredentials(token)
      // Store the token to disk for later program executions
      fs.writeFile(TOKEN_PATH, JSON.stringify(token), (error) => {
        if (error) return console.error(error)
        console.log("Token stored to", TOKEN_PATH)
        return 0
      })
      callback(oAuth2Client)
      return 0
    })
  })
}

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize(callback) {
  // eslint-disable-next-line camelcase
  const { client_secret, client_id } = process.env
  // eslint-disable-next-line camelcase
  const redirect_uris = JSON.parse(process.env.redirect_uris)
  const oAuth2Client = new google.auth.OAuth2(
    client_id, client_secret, redirect_uris[0]
  )

  // Check if we have previously stored a token.
  fs.readFile(TOKEN_PATH, (err, token) => {
    if (err) return getAccessToken(oAuth2Client, callback)
    oAuth2Client.setCredentials(JSON.parse(token))
    callback(oAuth2Client)
    return 0
  })
}

/**
 * Lists the next 10 events on the user's primary calendar.
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
 */
function listEvents(auth) {
  const calendar = google.calendar({ version: "v3", auth })
  calendar.events.list({
    calendarId: "primary",
    timeMin: (new Date()).toISOString(),
    maxResults: 10,
    singleEvents: true,
    orderBy: "startTime",
  }, (err, res) => {
    if (err) return console.log(`The API returned an error: ${err}`)
    const events = res.data.items
    if (events.length) {
      console.log("Upcoming 10 events:")
      events.forEach((event) => {
        const start = event.start.dateTime || event.start.date
        console.log(`${start} - ${event.summary}`)
      })
    } else {
      console.log("No upcoming events found.")
    }
    return 0
  })
}

function createEvent(auth) {
  const calendar = google.calendar({ version: "v3", auth })

  const event = {
    summary: "Close Trac Event",
    location: "CG 84, 2nd Floor, Sector 2, Salt Lake, Kolkata - 700091 ",
    description: "Signing a Deal",
    start: {
      dateTime: "2021-05-21T03:30:00.000Z"
    },
    end: {
      dateTime: "2021-05-21T04:00:00.000Z"
    },
    reminders: {
      useDefault: false,
      overrides: [
        { method: "popup", minutes: 10 },
      ]
    },
  }

  calendar.events.insert({
    auth,
    calendarId: "primary",
    resource: event,
  }, (err, eventJson) => {
    if (err) {
      console.log(`There was an error contacting the Calendar service: ${err}`)
      return
    }
    console.log("Event created: %s", eventJson)
  })
}

// Authorize a client with credentials, then call the Google Calendar API.
// authorize(listEvents)
authorize(createEvent)
