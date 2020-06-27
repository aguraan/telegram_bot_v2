const { Composer } = require('telegraf')
const Stage = require('telegraf/stage')
const session = require('telegraf/session')
const {
    START
} = require('../constants')

const startScene = require('../controllers/start')
const newOrderScene = require('../controllers/new_order')
const infoScene = require('../controllers/info')
const formScene = require('../controllers/form')

const composer = new Composer()

const stage = new Stage([
    startScene,
    newOrderScene,
    infoScene,
    formScene
])

composer.use(session())
composer.use(stage.middleware())

composer.command('start', (ctx) => ctx.scene.enter(START))
composer.on('message', (ctx) => ctx.reply('Выберите, что Вас интересует из меню'))

module.exports = composer
