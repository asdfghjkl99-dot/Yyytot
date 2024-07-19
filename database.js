const { MongoClient, ServerApiVersion } = require('mongodb');
const dotenv = require('dotenv');

// تحميل المتغيرات البيئية
dotenv.config();

const uri = process.env.MONGODB_URI;

// التحقق من وجود رابط الاتصال
if (!uri) {
  console.error("خطأ: لم يتم تعيين MONGODB_URI في ملف .env");
  process.exit(1);
}

const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
  ssl: true,
  sslValidate: true,
  connectTimeoutMS: 30000,
  socketTimeoutMS: 45000,
  retryWrites: true,
  w: "majority"
});

let db;

async function connectToMongoDB() {
  try {
    // محاولة الاتصال
    await client.connect();
    console.log("تم الاتصال بنجاح بقاعدة البيانات MongoDB");

    // اختيار قاعدة البيانات
    db = client.db("ibosjgddw"); // استبدل "botData" باسم قاعدة البيانات الخاصة بك

    // اختبار الاتصال
    await db.command({ ping: 1 });
    console.log("تم التحقق من الاتصال بنجاح");

    return db;
  } catch (error) {
    console.error("حدث خطأ أثناء الاتصال بقاعدة البيانات:", error);
    if (error.name === 'MongoServerSelectionError') {
      console.error("تفاصيل الخطأ:", error.message);
      console.error("تأكد من أن عنوان IP الخاص بك مضاف إلى قائمة IP المسموح بها في MongoDB Atlas");
    }
    throw error;
  }
}

async function saveData(collectionName, data) {
  if (!db) {
    throw new Error("لم يتم الاتصال بقاعدة البيانات بعد");
  }
  try {
    const collection = db.collection(collectionName);
    await collection.deleteMany({});
    if (data instanceof Map && data.size > 0) {
      const dataArray = Array.from(data, ([key, value]) => ({ key, value }));
      await collection.insertMany(dataArray);
    } else if (Array.isArray(data) && data.length > 0) {
      await collection.insertMany(data);
    } else {
      throw new Error("البيانات المقدمة غير صالحة");
    }
    console.log(`تم حفظ البيانات في المجموعة ${collectionName} بنجاح`);
  } catch (error) {
    console.error(`خطأ في حفظ البيانات في المجموعة ${collectionName}:`, error);
    throw error;
  }
}

async function loadData(collectionName) {
  if (!db) {
    throw new Error("لم يتم الاتصال بقاعدة البيانات بعد");
  }
  try {
    const collection = db.collection(collectionName);
    const data = await collection.find().toArray();
    console.log(`تم تحميل البيانات من المجموعة ${collectionName} بنجاح`);
    return new Map(data.map(item => [item.key, item.value]));
  } catch (error) {
    console.error(`خطأ في تحميل البيانات من المجموعة ${collectionName}:`, error);
    throw error;
  }
}

async function closeConnection() {
  try {
    await client.close();
    console.log("تم إغلاق الاتصال بقاعدة البيانات بنجاح");
  } catch (error) {
    console.error("حدث خطأ أثناء إغلاق الاتصال بقاعدة البيانات:", error);
    throw error;
  }
}

// دالة لإعادة الاتصال في حالة فقدان الاتصال
async function reconnect() {
  console.log("محاولة إعادة الاتصال بقاعدة البيانات...");
  try {
    await connectToMongoDB();
  } catch (error) {
    console.error("فشلت محاولة إعادة الاتصال:", error);
    setTimeout(reconnect, 5000); // حاول مرة أخرى بعد 5 ثوانٍ
  }
}

// استمع لأحداث فقدان الاتصال
client.on('close', reconnect);

process.on('SIGINT', async () => {
  console.log("تم استلام إشارة إنهاء البرنامج. جاري إغلاق الاتصال...");
  try {
    await closeConnection();
    process.exit(0);
  } catch (error) {
    console.error("حدث خطأ أثناء إغلاق الاتصال:", error);
    process.exit(1);
  }
});

module.exports = {
  connectToMongoDB,
  saveData,
  loadData,
  closeConnection
};
