const nodemailer = require('nodemailer')
const axios = require('axios')
const url = require('url')
const {
    GOOGLE_REFRESH_TOKEN,
    google,
    EMAIL_ADMIN,
    EMAIL_ADDRESS
} = require('../../config.json')

let accessToken = ''

const transporter = nodemailer.createTransport({ 
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
        type: 'OAuth2'
    }
})

transporter.set('oauth2_provision_cb', (user, renew, callback) => {
    if (renew) {
        generateAccessToken()
            .then(({ data }) => {
                accessToken = data.access_token
                callback(null, accessToken)
            })
            .catch(callback)
    } else {
        callback(null, accessToken)
    }
})

function generateAccessToken() {
    const params = new url.URLSearchParams({
        client_id: google.client_id,
        client_secret: google.client_secret,
        grant_type: 'refresh_token',
        refreshToken: GOOGLE_REFRESH_TOKEN
    })
    return axios.post(google.token_uri, params.toString())
}

function sendMail(options) {
    const base = {
        from: `"🤖 Telegram bot" ${ EMAIL_ADDRESS }`,
        generateTextFromHTML: true,
        auth: {
            user: EMAIL_ADMIN
        }
    }
    return transporter.sendMail({
        ...base,
        ...options
    })
}

module.exports = (ctx, next) => {
    console.log('ctx.sendMail', ctx.sendMail)
    console.log(sendMail)
    if (!ctx.sendMail) {
        ctx.sendMail = sendMail
        return next()
    } else {
        return next()
    }
}
