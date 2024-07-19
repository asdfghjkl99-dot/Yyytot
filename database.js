const { MongoClient } = require('mongodb');

const uri = "mongodb+srv://SJGGDD:<MaySsonu0>@cluster0.gqfh8z3.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

async function testConnection() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    console.log("تم الاتصال بنجاح بقاعدة البيانات MongoDB");
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    await client.close();
  }
}

testConnection().catch(console.dir);
