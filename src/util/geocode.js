const axios = require('axios')
const { Client } = require("@googlemaps/google-maps-services-js")
const { GEOCODE_API_KEY } = require('../../config.json')

const reverseGeocode = latlng => new Promise((resolve, reject) => {
    const client = new Client({})
    client
        .reverseGeocode({
            params: {
                latlng: {
                    lat: latlng.latitude,
                    lng: latlng.longitude
                },
                language: 'ru',
                key: GEOCODE_API_KEY
            }
        }, axios)
        .then(result => {
            const data = result.data.results
            resolve(data[0])
        })
        .catch(err => {
            reject(err)
        })
})

module.exports = {
    reverseGeocode
}