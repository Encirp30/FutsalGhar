require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

const seedUsers = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB Connected');

    await User.deleteMany({ role: { $in: ['admin', 'manager'] } });

    const admin = new User({
      username: 'admin',
      email: 'admin@futsalpro.com',
      password: 'admin123',
      role: 'admin',
      isVerified: true,
      profile: { fullName: 'Admin User' }
    });
    await admin.save();
    console.log('✅ Admin created');

    const manager = new User({
      username: 'manager',
      email: 'manager@futsalpro.com',
      password: 'manager123',
      role: 'manager',
      isVerified: true,
      profile: { fullName: 'Manager User' }
    });
    await manager.save();
    console.log('✅ Manager created');

    console.log('🎉 Done! Login with:');
    console.log('   Admin: admin / admin123');
    console.log('   Manager: manager / manager123');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

seedUsers();