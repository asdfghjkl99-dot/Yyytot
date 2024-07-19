const { MongoClient, ServerApiVersion } = require('mongodb');
const dotenv = require('dotenv');

// تحميل المتغيرات البيئية
dotenv.config();

const uri = process.env.MONGODB_URI;

const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1
});

let db;

async function connectToMongoDB() {
  try {
    await client.connect();
    console.log("تم الاتصال بنجاح بقاعدة البيانات MongoDB");
    db = client.db("botData"); // استبدل "botData" باسم قاعدة البيانات الخاصة بك
    return db;
  } catch (error) {
    console.error("حدث خطأ أثناء الاتصال بقاعدة البيانات:", error);
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
    if (data.size > 0) {
      const dataArray = Array.from(data, ([key, value]) => ({ key, value }));
      await collection.insertMany(dataArray);
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
    const map = new Map(data.map(item => [item.key, item.value]));
    console.log(`تم تحميل البيانات من المجموعة ${collectionName} بنجاح`);
    return map;
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

module.exports = {
  connectToMongoDB,
  saveData,
  loadData,
  closeConnection
};
