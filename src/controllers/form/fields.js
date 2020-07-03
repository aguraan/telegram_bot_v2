const Markup = require('telegraf/markup')
const Extra = require('telegraf/extra')

const { reverseGeocode } = require('../../util/geocode')
const { logError } = require('../../util/log')

const {
    FORM,
    DOCUMENT,
    PHOTO,
    TEXT,
    URL,
    ADD,
    CONTINUE
} = require('../../constants')
const buttons = require('./buttons')

const fields = {
    name: {
        type: String,
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
        type: String,
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
        type: String,
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
        type: String,
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
    },
    files: {
        type: Array,
        question: 'Файлы ТЗ, планы, визуализация, ссылки на ТЗ, дополнительное описание:',
        label: 'Файлы ТЗ, планы, визуализация, ссылки на ТЗ, дополнительное описание',
        keyboard: Markup
            .keyboard([
                buttons.cancel
            ])
            .resize()
            .extra(),
        handlers: {
            on: {
                [PHOTO](ctx) {
                    const { form } = ctx.session
                    const { caption, photo, media_group_id } = ctx.message
                    const last = photo.length - 1
                    const { file_id, file_unique_id } = photo[last]

                    ctx.tg.getFileLink(file_id)
                        .then(file_path => {
                            const format = file_path.split('.').pop()
                            const number = form.files.length + 1
                            const file = {
                                filename: `picture_${ number }.${ format }`,
                                path: file_path,
                                cid: file_unique_id,
                                type: PHOTO
                            }
                            if (caption) file.caption = caption

                            form.files.push(file)
                            
                            if (media_group_id) {
                                if (ctx.session.media_group_id !== media_group_id)
                                    ctx.session.media_group_id = media_group_id
                                else return
                            }
                            anythingElse(ctx)
                        })                    
                },
                [DOCUMENT](ctx) {
                    const { form } = ctx.session
                    const { caption, document } = ctx.message
                    const { file_id, file_name } = document

                    ctx.tg.getFileLink(file_id)
                        .then(file_path => {
                            const file = {
                                filename: file_name,
                                path: file_path,
                                type: DOCUMENT
                            }
                            if (caption) file.caption = caption

                            form.files.push(file)
                            anythingElse(ctx)
                        })
                },
                [TEXT](ctx) {
                    const { form } = ctx.session
                    const { text } = ctx.message
                    
                    const isURL = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/.test(text)

                    if (isURL) {
                        form.files.push({
                            type: URL,
                            url: text
                        })
                    } 
                    if (!isURL) {
                        form.files.push({
                            type: TEXT,
                            text
                        })
                    }
                    anythingElse(ctx)
                },
                callback_query(ctx) {
                    const { data, message } = ctx.update.callback_query

                    if (data === ADD) {
                        ctx.reply('Что еще вы хотите добавить?')
                    }

                    if (data === CONTINUE) {
                        const { form } = ctx.session

                        if (!form.files.length) {
                            delete form.files
                        }
                        delete ctx.session.message_id
                        ctx.scene.enter(FORM)
                    }

                    ctx.deleteMessage(message.message_id)
                }
            }
        }
    }
}

async function anythingElse(ctx) {
    console.log('message_id:', ctx.session.message_id)
    const inlineKeyboard = Markup.inlineKeyboard([
        Markup.callbackButton('Добавить', ADD),
        Markup.callbackButton('Продолжить', CONTINUE)
    ])
        .extra()
    if (ctx.session.message_id) await ctx.deleteMessage(ctx.session.message_id)
        
    const { message_id } = await ctx.reply('Еще что нибудь добавить?', inlineKeyboard)
    ctx.session.message_id = message_id
}

module.exports = fields