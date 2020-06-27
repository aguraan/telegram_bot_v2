const Scene = require('telegraf/scenes/base')
const Markup = require('telegraf/markup')
const Extra = require('telegraf/extra')
const Form = require('./Form')
const { reverseGeocode } = require('../../util/geocode')
const { sendMail } = require('../../util/transporter')
const { EMAIL_ADDRESS } = require('../../../config.json')
const { logError } = require('../../util/log')

const { START, FORM } = require('../../constants')

const buttons = {
    send: '✉ Отправить',
    edit: '✏ Изменить',
    cancel: '🚫 Отменить'
}

const kb1 = Markup
    .keyboard([
        buttons.cancel
    ])
    .resize()
    .extra()

const kb2 = Extra.markup(markup => {
    return markup.resize()
        .keyboard([
            markup.contactRequestButton('Отправить свой контакт'),
            buttons.cancel
        ])
})
const kb3 = Extra.markup(markup => {
    return markup.resize()
        .keyboard([
            markup.locationRequestButton('Отправить своё местоположение'),
            buttons.cancel
        ])
})
const kb4 = Markup
    .keyboard([
        buttons.send,
        buttons.edit,
        buttons.cancel
    ])
    .resize()
    .extra()

const labels = {
    name: {
        text: 'Введите имя человека, имеющего доступ на обьект:',
        label: 'Имя',
        keyboard: kb1
    },
    tel: {
        text: 'Введите контактный номер телефона для связи:',
        label: 'Контактный номер телефона',
        keyboard: kb2
    },
    address: {
        text: 'Введите адрес или отправьте местоположение, на котором необходимо сделать обмер:',
        label: 'Адрес проведения обмера',
        keyboard: kb3
    }
}

const form = new Scene(FORM)

form.enter(ctx => {
    ctx.session.form = new Form()
    askQuestion(ctx)
})

form.hears(buttons.cancel, ctx => ctx.scene.enter(START))

form.hears(buttons.edit, ctx => {
    const { form } = ctx.session

    if (form) {
        const ikb = Markup.inlineKeyboard(
            Object.entries(form).map(([key, value]) => {
                return [ Markup.callbackButton(labels[key].label, key) ]
            })
        )
        .extra()
        ctx.reply('Что вы хотите изменить?', ikb)
    }
})

form.hears(buttons.send, ctx => {
    const { form } = ctx.session

    const html = '<table>' +
    
    Object.entries(form).map(([key, value]) => {
        let out = value
        if (key === 'tel') {
            out = `<a href="tel:${ value }">${ value }</a>`
        }
        return `
            <tr>
                <td><strong>${ labels[key].label }:</strong></td>
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
    const { form } = ctx.session
    
    if (data) {
        if (data in form) {
            form[data] = ''
            askQuestion(ctx)
        }
    } else {
        ctx.reply('Ой, что-то пошло не так, попробуйте заново 🙁')
    }
})

form.on('contact', ctx => {
    const { form } = ctx.session

    if (form && !form.tel) {
        form.tel = ctx.update.message.contact.phone_number
        askQuestion(ctx)
    }
})

form.on('location', ctx => {
    const { form } = ctx.session
 
    if (form && !form.address) {
        reverseGeocode(ctx.message.location)
            .then(data => {
                form.address = data.formatted_address
                askQuestion(ctx)
            })
            .catch(logError)
    }
})

form.on('text', ctx => {
    const { form } = ctx.session

    for (const key in form) {
        if (!form[key]) {

            if (key === 'tel') {
                const validNumber = /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/i.test(ctx.message.text)
                if (!validNumber) {
                    ctx.reply('Это не телефонный номер')
                    break
                }
            }

            form[key] = ctx.message.text.trim()
            break
        }
    }

    askQuestion(ctx)
})

module.exports = form

function askQuestion(ctx) {
    const { form } = ctx.session
    if (form) {
        for (const key in form) {
            if (!form[key]) {
                ctx.reply(labels[key].text, labels[key].keyboard)
                break
            }
        }
    }

    printOrder(ctx)
}

function printOrder(ctx) {
    const { form } = ctx.session

    if (Object.values(form).every(item => !!item)) {

        const html = '<b>Ваша заявка сформирована:</b>\n\n' + 
        
        Object.entries(form).map(([key, value]) => {
            return `<b>- ${ labels[key].label }:</b> <i>${ value }</i>`
        }).join('\n')

        ctx.replyWithHTML(html, kb4)
    }
}