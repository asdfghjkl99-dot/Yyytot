const { MongoClient, ServerApiVersion } = require('mongodb');
const dotenv = require('dotenv');

dotenv.config();

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
  tlsAllowInvalidCertificates: true // إضافة هذا الخيار لتجاوز مشاكل SSL
});

let db;

async function connectToMongoDB() {
  try {
    await client.connect();
    console.log("تم الاتصال بنجاح بقاعدة البيانات MongoDB");
    db = client.db("SJGGDD"); // استبدل "botData" باسم قاعدة البيانات الخاصة بك
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
    if (data instanceof Map) {
      const dataArray = Array.from(data, ([key, value]) => ({ key, value }));
      await collection.insertMany(dataArray);
    } else if (data instanceof Set) {
      const dataArray = Array.from(data, value => ({ value }));
      await collection.insertMany(dataArray);
    } else {
      await collection.insertMany(Array.isArray(data) ? data : [data]);
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
    if (data.length > 0 && 'key' in data[0]) {
      return new Map(data.map(item => [item.key, item.value]));
    } else if (data.length > 0 && 'value' in data[0]) {
      return new Set(data.map(item => item.value));
    }
    return data;
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
