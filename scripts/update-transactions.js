const { MongoClient } = require('mongodb');
require('dotenv').config();

async function main() {
  const client = new MongoClient(process.env.DATABASE_URL);
  
  try {
    await client.connect();
    const db = client.db();
    const transactions = db.collection('Transaction');

    // 更新所有 groupMemberId 為空字符串的交易
    const result = await transactions.updateMany(
      { groupMemberId: '' },
      { $set: { groupMemberId: null } }
    );

    console.log(`Updated ${result.modifiedCount} transactions`);
  } catch (error) {
    console.error('Error updating transactions:', error);
  } finally {
    await client.close();
  }
}

main(); 