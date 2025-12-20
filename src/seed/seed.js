require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const User = require('../models/User');
const Vendor = require('../models/Vendor');
const MetaOption = require('../models/MetaOption');

const seed = async () => {
  await connectDB();

  // Clean existing
  await User.deleteMany();
  await Vendor.deleteMany();
  await MetaOption.deleteMany();

  // Create admin user
  const admin = new User({
    name: 'Admin User',
    email: 'admin@planity.com',
    password: 'password123',
    role: 'admin',
    isVerified: true
  });
  await admin.save();

  // Create planner
  const planner = new User({
    name: 'Event Planner',
    email: 'planner@planity.com',
    password: 'password123',
    role: 'planner',
    isVerified: true
  });
  await planner.save();

  // Create vendors
  const vendors = [
    {
      name: 'Olive Garden Venue',
      category: 'venue',
      pricing: { type: 'package', amount: 5000 },
      city: 'New York',
      amenities: ['WiFi', 'Parking'],
      styles: ['Modern', 'Classic'],
      cuisines: [],
      dietaryOptions: [],
      photos: [],
      verified: true,
      averageRating: 4.5,
      ratingCount: 10
    },
    {
      name: 'Elegant Photography',
      category: 'photographer',
      pricing: { type: 'per-person', amount: 100 },
      city: 'New York',
      amenities: [],
      styles: ['Portrait', 'Event'],
      cuisines: [],
      dietaryOptions: [],
      photos: [],
      verified: true,
      averageRating: 4.8,
      ratingCount: 15
    }
  ];

  await Vendor.insertMany(vendors);

  await MetaOption.insertMany([
    { category: 'event-type', key: 'wedding', labels: { en: 'Wedding', ar: 'حفل زفاف' }, order: 1 },
    { category: 'event-type', key: 'corporate', labels: { en: 'Corporate', ar: 'فعالية شركات' }, order: 2 },
    { category: 'service-category', key: 'venue', labels: { en: 'Venue', ar: 'قاعة' }, order: 1 },
    { category: 'service-category', key: 'photographer', labels: { en: 'Photographer', ar: 'مصور' }, order: 2 }
  ]);

  console.log('Seed done!');
  process.exit();
};

seed();
