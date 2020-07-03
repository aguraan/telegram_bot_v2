const Scene = require('telegraf/scenes/base')
const Markup = require('telegraf/markup')
const Form = require('./Form')
const fields = require('./fields')
const { FORM, START, DOCUMENT, PHOTO, TEXT, URL } = require('../../constants')
const { EMAIL_ADDRESS } = require('../../../config.json')
const { sendMail } = require('../../util/transporter')
const { isFunction } = require('util')
const querystring = require('querystring')


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
        ctx.session.form = new Form(fields)
    }

    const { form } = ctx.session

    for (const key in form) {
        let isEmpty = false

        if (Array.isArray(form[key])) {
            isEmpty = !form[key].length
        } else {
            isEmpty = !form[key]
        }

        if (isEmpty) {
            ctx.scene.enter(key)
            return
        }
    }

    const content = Object
        .entries(form)
        .map(([key, value]) => {
            if (key === 'files') {
                return `<b>- ${ fields[key].label }:</b>\n\n` + [
                    value
                        .filter(obj => obj.type === TEXT)
                        .map(obj => `<i>${ obj.text }</i>`)
                        .join('\n\n'),
                    value
                        .filter(obj => obj.type === URL)
                        .map(obj => `<a href="${ obj.url }">${ querystring.unescape(obj.url) }</a>`)
                        .join('\n\n'),
                    value
                        .filter(obj => obj.type === DOCUMENT || obj.type === PHOTO)
                        .map(obj => `<a href="${ obj.path }">[ ${ obj.filename } ]</a>`)
                        .join(' '),
                ]
                    .filter(item => !!item)
                    .join('\n\n')
            }
            return `<b>- ${ fields[key].label }:</b> <i>${ value }</i>`
        })
        .join('\n')

    const html = '<b>Ваша заявка сформирована:</b>\n\n' + content

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

    const mailOptions = {
        to: EMAIL_ADDRESS,
        subject: `Заявка от ${ ctx.from.first_name } ${ ctx.from.last_name } | #${ ctx.from.id }`,
    }

    mailOptions.attachments = form.files.filter(file => file.type === DOCUMENT || file.type === PHOTO)

    const embededImages = form.files
        .filter(file => file.type === PHOTO)
        .map(file => {
            const figcaption = file.caption ? `<figcaption>${ file.caption }</figcaption>` : ''
            const figure = `
                <figure style="margin: 5px;">
                    <img src="cid:${ file.cid }" alt="" width="200" />
                    ${ figcaption }
                </figure>`
            return figure
        })
        .join('')
    
    const links = form.files
        .filter(file => file.type === URL)
        .map(file => {
            return `<a href="${ file.url }">${ querystring.unescape(file.url) }</a>`
        })
        .join('')
    
    const text = form.files
        .filter(file => file.type === TEXT)
        .map(file => {
            return `<p>${ file.text }</p>`
        })
        .join('')

    delete form.files

    const tableBody = Object
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
        }).join('')

    mailOptions.html = `
        <table>${ tableBody }</table>
        <br/>
        ${ text ? `<div>${ text }</div><br/>` : '' }
        ${ links ? `<div style="display: flex; flex-direction: column;">${ links }</div><br/>` : '' }
        ${ embededImages ? `<div style="display: flex;">${ embededImages }</div>` : '' }
    `

    ctx.reply('⏳ Отправляю...')
    
    sendMail(mailOptions)
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