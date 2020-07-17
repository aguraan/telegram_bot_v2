const Scene = require('telegraf/scenes/base')
const Markup = require('telegraf/markup')
const fs = require('fs').promises
const { join } = require('path')

const { START, INFO } = require('../../constants')

const info = new Scene(INFO)
const kb = Markup
    .keyboard([
        ['Процесс', 'Цены'],
        ['Примеры'],
        ['◀️ Назад']
    ])
    .resize()
    .extra()

info.enter(ctx => {
    ctx.reply('Что желаете узнать о нас?', kb)
})

info.hears('Процесс', ctx => {
    ctx.reply('Пока что ничего об этом не знаю.')
})

info.hears('Цены', ctx => {
    fs.readFile(join(__dirname, '../../content/price.md'), 'utf-8')
        .then(md => {
            ctx.replyWithMarkdown(md)
        })
})

info.hears('Примеры', ctx => {
    ctx.reply('Примеров пока еще мне не загрузили.')
})

info.hears('◀️ Назад', ctx => {
    ctx.scene.enter(START)
})


module.exports = info