const Scene = require('telegraf/scenes/base')
const Markup = require('telegraf/markup')

const { START, NEW_ORDER, FORM } = require('../../constants')

const newOrder = new Scene(NEW_ORDER)

const buttons = {
    continue: 'Продолжить ➡',
    back: '◀️ Назад'
}
const kb = Markup
    .keyboard([
        buttons.continue,
        buttons.back
    ])
    .resize()
    .extra()

newOrder.enter(ctx => {
    const html = '<b>Для оформления заявки нужны следующие данные:</b>\n\n' +
    '- Имя\n' +
    '- Контактный номер телефона\n' +
    '- Адрес проведения обмера\n' +
    '- Дополнительная информация\n\n' +
    '<b>Продолжить?</b>'
    ctx.replyWithHTML(html, kb)
})
newOrder.hears(buttons.back, ctx => ctx.scene.enter(START))
newOrder.hears([/да/i, buttons.continue], ctx => {
    ctx.scene.enter(FORM)
})

module.exports = newOrder