const Scene = require('telegraf/scenes/base')
const Markup = require('telegraf/markup')
const {
    START,
    NEW_ORDER,
    INFO,
} = require('../../constants')

const start = new Scene(START)

const buttons = {
    new_order: '🚀 Заказать обмер',
    info: 'ℹ Информация об услуге'
}

const kb = Markup
    .keyboard([
        buttons.new_order,
        buttons.info
    ])
    .resize()
    .extra()

start.enter(ctx => {
    ctx.reply('Чем могу помочь?', kb)
})

start.hears(buttons.new_order, ctx => {
    ctx.scene.enter(NEW_ORDER)
})

start.hears(buttons.info, ctx => {
    ctx.scene.enter(INFO)
})

module.exports = start