const Markup = require('telegraf/markup')
const Extra = require('telegraf/extra')

const { reverseGeocode } = require('../../util/geocode')
const { logError } = require('../../util/log')

const { FORM } = require('../../constants')
const buttons = require('./buttons')

const fields = {
    name: {
        question: 'Введите имя человека, имеющего доступ на обьект:',
        label: 'Имя',
        keyboard: Markup
            .keyboard([
                buttons.cancel
            ])
            .resize()
            .extra(),
        handlers: {
            on: {
                text(ctx) {
                    const { form } = ctx.session
                    form.name = ctx.message.text.trim()
                    ctx.scene.enter(FORM)
                }
            }
        }
    },
    tel: {
        question: 'Введите контактный номер телефона для связи:',
        label: 'Контактный номер телефона',
        keyboard: Extra.markup(markup => {
            return markup.resize()
                .keyboard([
                    markup.contactRequestButton('Отправить свой контакт'),
                    buttons.cancel
                ])
        }),
        handlers: {
            on: {
                text(ctx) {
                    const { form } = ctx.session
                    const telephone = ctx.message.text.trim()
                    const validNumber = /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/i.test(telephone)
                    if (!validNumber) {
                        ctx.reply('Это не телефонный номер')
                            .then(() => {
                                ctx.scene.reenter()
                            })
                    } else {
                        form.tel = telephone
                        ctx.scene.enter(FORM)
                    }
                },
                contact(ctx) {
                    const { form } = ctx.session
                    form.tel = ctx.message.contact.phone_number
                    ctx.scene.enter(FORM)
                }
            }
        }
    },
    address: {
        question: 'Введите адрес или отправьте местоположение, на котором необходимо сделать обмер:',
        label: 'Адрес проведения обмера',
        keyboard: Extra.markup(markup => {
            return markup.resize()
                .keyboard([
                    markup.locationRequestButton('Отправить своё местоположение'),
                    buttons.cancel
                ])
        }),
        handlers: {
            on: {
                text(ctx) {
                    const { form } = ctx.session
                    form.address = ctx.message.text.trim()
                    ctx.scene.enter(FORM)
                },
                location(ctx) {
                    const { form } = ctx.session
                    reverseGeocode(ctx.message.location)
                        .then(data => {
                            form.address = data.formatted_address
                            ctx.scene.enter(FORM)
                        })
                        .catch(logError)
                }
            }
        }
    },
    email: {
        question: 'Введите адрес эл. почты, для получения результатов:',
        label: 'Адрес эл. почты',
        keyboard: Markup
            .keyboard([
                buttons.cancel
            ])
            .resize()
            .extra(),
        handlers: {
            on: {
                text(ctx) {
                    const { form } = ctx.session
                    const email = ctx.message.text.trim()
                    const validEmail = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/.test(email)
                    if (!validEmail) {
                        ctx.reply('Недопустимый адрес эл. почты')
                            .then(() => {
                                ctx.scene.reenter()
                            })
                    } else {
                        form.email = email
                        ctx.scene.enter(FORM)
                    }
                }
            }
        }
    }
}

module.exports = fields