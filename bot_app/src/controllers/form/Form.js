module.exports = class Form {
    constructor(fields) {
        Object.keys(fields).forEach(key => {
            this[key] = fields[key].type()
        })
    }
}