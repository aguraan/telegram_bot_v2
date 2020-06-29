const Scene = require('telegraf/scenes/base')
const Markup = require('telegraf/markup')
const Form = require('./Form')
const fields = require('./fields')
const { FORM, START } = require('../../constants')
const { EMAIL_ADDRESS } = require('../../../config.json')
const { sendMail } = require('../../util/transporter')
const { isFunction } = require('util')


const form = new Scene(FORM)
const buttons = require('./buttons')

const kb = Markup
    .keyboard([
        buttons.send,
        buttons.edit,
        buttons.cancel
    ])
    .resize()
    .extra()

form.enter(ctx => {

    if (!ctx.session.form) {
        ctx.session.form = new Form()
    }

    const { form } = ctx.session

    for (const key in form) {
        if (!form[key]) {
            ctx.scene.enter(key)
            return
        }
    }

    const html = '<b>Ваша заявка сформирована:</b>\n\n' + 
    
    Object
        .entries(form)
        .map(([key, value]) => {
            return `<b>- ${ fields[key].label }:</b> <i>${ value }</i>`
        }).join('\n')

    ctx.replyWithHTML(html, kb)
})

form.hears(buttons.cancel, ctx => {
    ctx.scene.enter(START)
})

form.hears(buttons.edit, ctx => {
    const { form } = ctx.session

    if (form) {
        const ikb = Markup.inlineKeyboard(
            Object
                .keys(form)
                .map(key => {
                    return [ Markup.callbackButton(fields[key].label, key) ]
                })
        )
            .extra()
        ctx.reply('Что вы хотите изменить?', ikb)
    }
})

form.hears(buttons.send, ctx => {
    const { form } = ctx.session

    const html = '<table>' +
    
    Object
        .entries(form)
        .map(([key, value]) => {
            let out = value
            if (key === 'tel') {
                out = `<a href="tel:${ value }">${ value }</a>`
            }
            return `
                <tr>
                    <td><strong>${ fields[key].label }:</strong></td>
                    <td><i>${ out }</i></td>
                </tr>
            `
        }).join('') +

    '</table>'

    ctx.reply('⏳ Отправляю...')
    
    sendMail({
        to: EMAIL_ADDRESS,
        subject: `Заявка от ${ ctx.from.first_name } ${ ctx.from.last_name } | #${ ctx.from.id }`,
        html
    })
        .then(() => {
            ctx.reply('✅ Заявка успешно отправлена.')
            ctx.scene.enter(START)
        })
        .catch(error => {
            ctx.reply('‼ Возникла ошибка. Заявка не доставлена...')
            logError(error)
        })
})

form.on('callback_query', ctx => {
    const { data } = ctx.update.callback_query
    
    ctx.scene.enter(data)
})

for (const key in fields) {
    const field = fields[key]
    field.scene = new Scene(key)

    field.scene.enter(ctx => {
        ctx.reply(field.question, field.keyboard)
    })

    field.scene.hears(buttons.cancel, ctx => ctx.scene.enter(START))

    if (field.handlers) {

        for (const handler in field.handlers) {

            const middleware = field.handlers[handler]
            
            if ( isFunction(middleware) ) {
                field.scene[handler](middleware.bind(field))
            } else {
                for (const listener in middleware) {

                    if ( Array.isArray(middleware[listener]) ) {
                        field.scene[handler](listener, ...middleware[listener].map(func => func.bind(field)))
                    } else {
                        field.scene[handler](listener, middleware[listener].bind(field))
                    }
                }
            }
        }
    }

    field.scene.on('message', ctx => ctx.scene.reenter())
}

const scenes = Object
    .values(fields)
    .map(field => field.scene)

scenes.push(form)

module.exports = scenes