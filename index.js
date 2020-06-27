const { logError } = require('./src/util/log');
const bot = require('./src/bot')

bot.use(require('./src/middlewares'))

bot.catch(logError)

bot.launch()