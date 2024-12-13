let usersCache = {};

// master | dev
const config = require('./config/master.json');
const validDomain = /^[A-Za-z_][A-Za-z0-9_]*$/;
const startReg = /^\d+$/;

const { Database } = require('./database');
const conn = new Database(config.database);

const { Bot } = require('grammy');
const bot = new Bot(config.token);

bot.api.setMyCommands([
    { command: "start", description: "Главное меню" },
    { command: "domain", description: "Уникальная ссылка" },
    { command: "switch", description: "Переключатель получения сообщений" },
    { command: "terms", description: "Условия использования" },
    { command: "support", description: "Обратная связь с разработчиком" },
]);

bot.command(["terms", "privacy"], (ctx) =>
    ctx.reply([
        `ℹ Условия использования бота @askforadvicebot`,
        `Используя бота @askforadvicebot, Вы соглашаетесь с фактом ознакомления с условиями использования как бота, так и сервиса Telegram, на основе которого бот функционирует.`,
        ``,
        `Бот @askforadvicebot предназначен для обмена одноразовыми сообщениями между пользователями бота (адресатом и адресантом). Пользователь бота, который принимает сообщения (адресат), не может узнать личность пользователя бота, который отправляет сообщение (адресант).`,
        `Прежде чем начать пользоваться ботом, пользователь обязан соблюдать правила Telegram. Наличие данных в системе бота @askforadvicebot автоматически подтверждает согласие с ними, а также согласие с фактом ознакомления с условиями использования как бота, так и сервиса Telegram.`,
        `Разработчик бота не несёт ответственность за отправляемый пользователями контент. В случае, если адресат (или адресант) использует бота во вред — адресант (или адресат) может связаться с поддержкой бота для получения помощи: @askforadvicehelp`,
        ``,
        `Основной функционал бота бесплатно доступен для всех пользователей Telegram.`,
        `Платный функционал бота позволяет покрыть стоимость хост-машины бота, а также финансово поддержать разработчика.`,
        ``,
        `Возврат средств за платный функционал доступен в течение 5 (пяти) дней после успешной покупки:`,
        `— За уникальную ссылку: /refund [домен без скобок]`
    ].join("\n"))
);

bot.command(["support", "paysupport"], (ctx) =>
    ctx.reply([
        `ℹ Обратная связь с разработчиком:`,
        `— Помощь по боту: https://t.me/askforadvicehelp/5`,
        `— Помощь по возврату средств: https://t.me/askforadvicehelp/7`
    ].join("\n"))
);

bot.command(["start", "help", "settings"], async (ctx) => {
    if (ctx.match) {
        const domain = ctx.match.split(/ +/)[0];
        const receiver = (startReg.test(domain))
            ? await conn.getUserByReceiveId(domain)
            : (validDomain.test(domain))
                ? await conn.getUserByDomain(domain)
                : null;

        if (!receiver)
            return ctx.reply([
                `❎ Получатель не найден. Вполне возможно, что ты перешёл по старой ссылке.`,
                `Начни получать анонимные сообщения${(startReg.test(domain)) ? "" : ` (с этим доменом!)`} уже сейчас: /start`
            ].join("\n"));

        if (receiver.receive_enabled === 0)
            return ctx.reply("❎ Получатель отключил возможность получать сообщения.");

        usersCache[ctx.from.id] = { type: "question", id: receiver.id };
        return bot.api.sendMessage(
            ctx.chat.id,
            `📧 Напиши сообщение для <b>${(!startReg.test(domain)) ? `^${domain}` : `#${receiver.receive_id}`}</b>, а он(-а) получит его анонимно!`,
            {
                parse_mode: "HTML",
                reply_markup: {
                    inline_keyboard: [
                        [{ text: "❌ Отменить отправку", callback_data: "cancel" }]
                    ]
                }
            }
        );
    }

    let user = await conn.getUserByTelegram(ctx.from.id);
    if (!user) user = await conn.createUser(ctx.from.id);
    if (user?.error) return ctx.reply([
        `❎ Произошла ошибка при получении информации из базы данных`,
        `Пожалуйста, повтори запрос чуть позже или обратись в поддержку: @askforadvicehelp`
    ].join("\n"));

    const userReceiveData = [
        `Начни получать анонимные сообщения уже сейчас:`,
        `— Постоянная ссылка: https://askforadvicebot.t.me/?start=${user.receive_id}`,
        `— Уникальная ссылка: /domain | /domains`,
    ].join("\n");

    return bot.api.sendMessage(
        ctx.chat.id,
        [
            `<b>ℹ Главное меню</b>`,
            `@askforadvice — это бот для анонимной пересылки сообщений от пользователей.`,
            ``,
            `Мы не отправляем никакой рекламы нашим пользователям, но взамен просим поддержать нашу деятельность копеечкой: /donate`,
            `Условия использования бота: /terms`,
            ``,
            (user.receive_enabled === 1)
                ? userReceiveData
                : `⌛ Получение сообщений приостановлено: /switch для возобновления`
        ].join("\n"),
        { parse_mode: "HTML" }
    );
});

bot.command(["my", "domains", "links"], async (ctx) => {
    let user = await conn.getUserByTelegram(ctx.from.id);
    if (!user) user = await conn.createUser(ctx.from.id);
    if (user?.error) return ctx.reply([
        `❎ Произошла ошибка при получении информации из базы данных`,
        `Пожалуйста, повтори запрос чуть позже или обратись в поддержку: @askforadvicehelp`
    ].join("\n"));

    const domains = user.domains
        .map((d) => `— <a href="https://askforadvicebot.t.me/?start=${d.domain}">${d.domain}</a> (получен ${new Date(d.ownedAt).toLocaleString({}, { timeZone: "Europe/Moscow" })} МСК ${(d.paymentID !== null) ? `за звёзды` : `от администратора`})`);

    return bot.api.sendMessage(
        ctx.chat.id,
        domains.length ? domains.join("\n") : "ℹ Нет активных уникальных ссылок (/domain)",
        { parse_mode: "HTML" }
    );
});

bot.command(["domain", "setdomain"], async (ctx) => {
    if (!ctx.match) return bot.api.sendMessage(
        ctx.chat.id,
        [
            `<b>🏠 Уникальная ссылка</b>`,
            `Является пожертвованием в пользу разработчика. Приобретается за Telegram Stars. После приобретения автоматически подключается к аккаунту и может использоваться для приёма сообщений совместно с постоянной ссылкой.`,
            ``,
            `— Установка: <i>/domain [домен без скобок]</i>`,
            `— Пример: <i>/domain askforadvice</i>`,
            `— Список всех доменов: <i>/domains</i>`
        ].join("\n"),
        { parse_mode: "HTML" }
    );

    const domain = ctx.match.split(/ +/)[0];
    if (!validDomain.test(domain) || domain.length >= 33)
        return ctx.reply([
            `❎ Такой домен взять не получится. Попробуй указать что-то другое, используя подсказку:`,
            `— Домен не может начинаться с цифр`,
            `— Допустимая длина домена — от 1 до 32 символов`,
            `— В домене допустимы только эти символы: A-Z, a-z, 0-9, нижнее подчёркивание`
        ].join("\n"));

    const user = await conn.getUserByTelegram(ctx.from.id);
    if (!user || user?.error) return ctx.reply([
        `❎ Произошла ошибка при получении информации из базы данных`,
        `Пожалуйста, повтори запрос чуть позже или обратись в поддержку: @askforadvicehelp`
    ].join("\n"));

    const userWithDomain = await conn.getUserByDomain(domain);
    if (userWithDomain)
        return ctx.reply(`❎ Указанная уникальная ссылка уже занята, но ты по-прежнему можешь использовать постоянную (или ранее полученную уникальную) ссылку.`);

    const domainPayment = await bot.api.sendInvoice(
        ctx.chat.id,
        `Домен ^${domain}`,
        `Домен ^${domain} для использования уникальной ссылки в Telegram-боте анонимных сообщений @askforadvicehelp`,
        `domain-payment--${domain}`,
        "XTR",
        [{ amount: Math.round(2000 / domain.length), label: "XTR" }]
    ).catch((err) => {
        console.warn(err.stack);
        return null;
    });
    if (!domainPayment)
        return ctx.reply([
            `❎ Произошла ошибка при выставлении счёта на оплату`,
            `Пожалуйста, повтори запрос чуть позже или обратись в поддержку: @askforadvicehelp`
        ].join("\n"));
});

bot.on("pre_checkout_query", async (ctx) => {
    const user = await conn.getUserByTelegram(ctx.from.id);
    if (!user || user?.error) return ctx.answerPreCheckoutQuery(false);

    const userWithDomain = await conn.getUserByDomain(domain);
    if (userWithDomain) return ctx.answerPreCheckoutQuery(false);

    return ctx.answerPreCheckoutQuery(true);
});

bot.on("message:successful_payment", async (ctx) => {
    console.log(ctx.message.successful_payment);
    const payload = ctx.message.successful_payment.invoice_payload.split("--");
    switch (payload[0]) {
        case "domain-payment": {
            const domain = payload[1];

            const userWithDomain = await conn.getUserByDomain(domain);
            if (userWithDomain) {
                const refund = await bot.api.refundStarPayment(ctx.from.id, ctx.message.successful_payment.telegram_payment_charge_id)
                    .catch((err) => {
                        console.warn(err.stack);
                        console.warn(`AUTO REFUND | ${ctx.from.id} / ${ctx.message.successful_payment.telegram_payment_charge_id}`);
                        return null;
                    });
                if (!refund) return bot.api.sendMessage(
                    ctx.chat.id,
                    [
                        `❎ Указанная уникальная ссылка уже кем-то получена.`,
                        `Потраченные звёзды не были возвращены покупателю, поскольку произошла ошибка на стороне Telegram Bot API.`,
                        ``,
                        `Для возврата звёзд обратись в поддержку @askforadvice с указанием номера платежа: <code>${ctx.from.id} / ${ctx.message.successful_payment.telegram_payment_charge_id}</code>`
                    ].join("\n"),
                    { parse_mode: "HTML" }
                );

                return bot.api.sendMessage(
                    ctx.chat.id,
                    [
                        `❎ Указанная уникальная ссылка уже кем-то получена.`,
                        `Потраченные звёзды были возвращены покупателю.`
                    ].join("\n"),
                    { parse_mode: "HTML" }
                );
            }

            const userData = await conn.getUserByTelegram(ctx.from.id);
            if (!userData || userData?.error) {
                const refund = await bot.api.refundStarPayment(ctx.from.id, ctx.message.successful_payment.telegram_payment_charge_id)
                    .catch((err) => {
                        console.warn(err.stack);
                        console.warn(`AUTO REFUND | ${ctx.from.id} / ${ctx.message.successful_payment.telegram_payment_charge_id}`);
                        return null;
                    });
                if (!refund) return bot.api.sendMessage(
                    ctx.chat.id,
                    [
                        `❎ Указанная уникальная ссылка уже кем-то получена.`,
                        `Потраченные звёзды не были возвращены покупателю, поскольку произошла ошибка на стороне Telegram Bot API.`,
                        ``,
                        `Для возврата звёзд обратись в поддержку @askforadvice с указанием номера платежа: <code>${ctx.from.id} / ${ctx.message.successful_payment.telegram_payment_charge_id}</code>`
                    ].join("\n"),
                    { parse_mode: "HTML" }
                );

                return bot.api.sendMessage(
                    ctx.chat.id,
                    [
                        `❎ Указанная уникальная ссылка уже кем-то получена.`,
                        `Потраченные звёзды были возвращены покупателю.`
                    ].join("\n"),
                    { parse_mode: "HTML" }
                );
            }

            await conn.addUserDomain(domain, userData.id, ctx.message.successful_payment.telegram_payment_charge_id);
            return bot.api.sendMessage(
                ctx.chat.id,
                [
                    `✅ Уникальная ссылка установлена:`,
                    `— https://askforadvicebot.t.me/?start=${domain}`
                ].join("\n"),
                { parse_mode: "HTML" }
            );
        }
    }
});

bot.command(["refund", "domainrefund"], async (ctx) => {
    if (!ctx.match) return bot.api.sendMessage(
        ctx.chat.id,
        [
            `<b>🏠 Отказ от уникальной ссылки</b>`,
            `Можно отказаться от уникальной ссылки, если после платежа не прошло более 5 дней.`,
            ``,
            `— Отказ: <i>/refund [домен без скобок]</i>`,
            `— Пример: <i>/refund askforadvice</i>`,
            `— Список всех доменов: <i>/domains</i>`,
        ].join("\n"),
        { parse_mode: "HTML" }
    );

    const domain = ctx.match.split(/ +/)[0];
    const find = await conn.getUserByDomain(domain);
    if (!find || find?.telegram !== ctx.from.id)
        return ctx.reply(`❎ Указанный домен не занят.`);

    const domainToRefund = find.domains.find((d) => d.domain == domain);
    if (!domainToRefund)
        return ctx.reply(`❎ Нет права владения на указанный домен.`);

    const D5 = 5 * 24 * 60 * 60 * 1000;
    const expiresAt = new Date(domainToRefund.ownedAt).getTime() + D5;
    if (Date.now() >= expiresAt || domainToRefund.paymentID == null)
        return ctx.reply(`❎ Вернуть деньги за этот платёж нельзя.`);

    await conn.removeUserDomain(domainToRefund.domain, domainToRefund.ownerID);
    const refund = await bot.api.refundStarPayment(find.telegram, domainToRefund.paymentID)
        .catch((err) => {
            console.warn(err.stack);
            console.warn(`MANUAL REFUND | ${ctx.from.id} / ${domainToRefund.paymentID}`);
            return null;
        });
    if (!refund) return bot.api.sendMessage(
        ctx.chat.id,
        [
            `✅ Домен отвязан от профиля.`,
            `Потраченные звёзды не были возвращены покупателю, поскольку произошла ошибка на стороне Telegram Bot API.`,
            ``,
            `Для возврата звёзд обратись в поддержку @askforadvice с указанием номера платежа: <code>${ctx.from.id} / ${domainToRefund.paymentID}</code>`
        ].join("\n"),
        { parse_mode: "HTML" }
    );

    return bot.api.sendMessage(
        ctx.chat.id,
        [
            `✅ Домен отвязан от профиля.`,
            `Потраченные звёзды были возвращены покупателю.`
        ].join("\n"),
        { parse_mode: "HTML" }
    );
});

bot.command(["switch", "message", "msg", "swt"], async (ctx) => {
    const user = await conn.getUserByTelegram(ctx.from.id);
    if (!user || user?.error)
        return ctx.reply([
            `❎ Произошла ошибка при получении информации из базы данных`,
            `Пожалуйста, повтори запрос чуть позже или обратись в поддержку: @askforadvicehelp`
        ].join("\n"));

    const newStatus = (user.receive_enabled === 1) ? 0 : 1;
    const isUpdated = await conn.updateUserReceiveStatus(user.id, newStatus);
    if (!isUpdated) {
        console.error(isUpdated.stack);
        return ctx.reply([
            `❎ Ошибка ${(newStatus === 0) ? "отключения" : "включения"} сообщений`,
            `Пожалуйста, повтори запрос чуть позже или обратись в поддержку: @askforadvicehelp`
        ].join("\n"));
    }

    return ctx.reply(`✅ Получение сообщений ${(newStatus === 0) ? "приостановлено" : "возобновлено"}`);
});

bot.command(["donate", "don", "sup"], (ctx) =>
    bot.api.sendMessage(
        ctx.chat.id,
        [
            `💰 Бот работает за счёт пожертвований пользователей и не показывает рекламу:`,
            `— ${config.donateWallet}`
        ].join("\n"),
        { parse_mode: "HTML" }
    )
);

bot.on("callback_query:data", (ctx) => {
    if (ctx.callbackQuery.data === "cancel") {
        if (usersCache[ctx.from.id])
            delete usersCache[ctx.from.id];

        return bot.api.editMessageText(
            ctx.callbackQuery.message.chat.id,
            ctx.callbackQuery.message.message_id,
            "ℹ Начни получать анонимные сообщения уже сейчас: /start",
            {
                reply_markup: { inline_keyboard: [] }
            }
        );
    }
});

bot.on([
    "message:text",
    "message:audio",
    "message:media",
    "message:voice",
    "message:video_note",
    "message:sticker"
], async (ctx) => {
    if (!usersCache[ctx.from.id]) return;

    const receiver = await conn.getUserById(usersCache[ctx.from.id]?.id);
    if (!receiver || receiver?.receive_enabled === 0) {
        delete usersCache[ctx.from.id];
        return ctx.reply([
            `❌ Получатель самоликвидировался или отключил приём сообщений во время поиска его данных.`,
            `Начни получать анонимные сообщения уже сейчас: /start`
        ].join("\n"));
    }

    const msgPing = await bot.api.sendMessage(
        receiver.telegram,
        `<b>📧 У тебя новое сообщение</b>`,
        { parse_mode: "HTML" }
    ).catch(() => null);
    if (!msgPing) {
        delete usersCache[ctx.from.id];
        return ctx.reply([
            `❎ Произошла ошибка при попытке уведомить о сообщении`,
            `Пожалуйста, повтори запрос чуть позже или обратись в поддержку: @askforadvicehelp`
        ].join("\n"));
    }

    const msgReply = await bot.api.copyMessage(
        receiver.telegram,
        ctx.chat.id,
        ctx.message.message_id
    ).catch((err) => {
        console.warn(err.stack);
        return null;
    });
    if (!msgReply) {
        delete usersCache[ctx.from.id];
        return ctx.reply([
            `❎ Произошла ошибка при попытке переслать сообщение`,
            `Пожалуйста, повтори запрос чуть позже или обратись в поддержку: @askforadvicehelp`
        ].join("\n"));
    }

    delete usersCache[ctx.from.id];
    return bot.api.sendMessage(
        ctx.chat.id,
        [
            `✅ Твоё сообщение только что было отправлено!`,
            `<i>Самореклама: начни получать анонимные сообщения уже сейчас <b>по команде /start</b></i>`
        ].join("\n"),
        { parse_mode: "HTML" }
    );
});

process.once("SIGINT", () => bot.stop());
process.once("SIGTERM", () => bot.stop());

setTimeout(async () => {
    console.info(`* Getting users cache...`);
    usersCache = await conn.getUsersCache(config.token.split(":")[0]);
    setInterval(async () => {
        await conn.setUsersCache(config.token.split(":")[0], usersCache);
    }, 30 * 1000);

    console.info(`* Bot is starting polling...`);
    bot.start();
}, 500);