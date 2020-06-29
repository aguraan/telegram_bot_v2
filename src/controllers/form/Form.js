const fields = require('./fields')

module.exports = class Form {
    constructor() {
        Object.keys(fields).forEach(key => {
            this[key] = ''
        })
    }
}