const Scene = require('telegraf/scenes/base')
const Markup = require('telegraf/markup')
const fields = require('../form/fields')

const { START, NEW_ORDER, FORM } = require('../../constants')

const newOrder = new Scene(NEW_ORDER)

const buttons = {
    continue: 'Продолжить ➡',
    back: '◀️ Назад'
}
const kb1 = Markup
    .keyboard([
        buttons.continue,
        buttons.back
    ])
    .resize()
    .extra()

newOrder.enter(ctx => {

    const html = '<b>Для оформления заявки нужны следующие данные:</b>\n\n' +
    Object
        .values(fields)
        .map(field => {
            return `- ${ field.label }`
        })
        .join('\n') +
    '\n\n<b>Продолжить?</b>'
    ctx.replyWithHTML(html, kb1)
})
newOrder.hears(buttons.back, ctx => ctx.scene.enter(START))
newOrder.hears([/да/i, buttons.continue], ctx => {
    ctx.scene.enter(FORM)
})

module.exports = newOrder