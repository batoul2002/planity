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
    },
    {
      name: 'Al Jawad Restaurant',
      category: 'catering',
      pricing: { type: 'package', amount: 500 },
      city: 'Beirut',
      amenities: ['Delivery', 'Live stations'],
      styles: ['Lebanese'],
      cuisines: ['Lebanese'],
      dietaryOptions: ['Vegetarian'],
      photos: ['/images/catering/aljawad/aljawadCatering.png'],
      verified: true
    },
    {
      name: 'Cremino Patisserie',
      category: 'catering',
      pricing: { type: 'per-person', amount: 8 },
      city: 'Beirut',
      amenities: ['Desserts', 'Delivery'],
      styles: ['Patisserie'],
      cuisines: ['Desserts'],
      dietaryOptions: [],
      photos: ['/images/catering/cremino/creminoPatisserie.jpeg'],
      verified: true
    },
    {
      name: 'Tasty Bees',
      category: 'catering',
      pricing: { type: 'per-person', amount: 7 },
      city: 'Beirut',
      amenities: ['Desserts', 'Delivery'],
      styles: ['Lebanese'],
      cuisines: ['Desserts'],
      dietaryOptions: [],
      photos: ['/images/catering/tastyBees/tastybeesCatering.jpeg'],
      verified: true
    },
    {
      name: 'Al Sultan Sweets',
      category: 'catering',
      pricing: { type: 'per-person', amount: 9 },
      city: 'Beirut',
      amenities: ['Desserts', 'Delivery'],
      styles: ['Lebanese'],
      cuisines: ['Desserts'],
      dietaryOptions: [],
      photos: ['/images/catering/alsultan/alsultan.jpg'],
      verified: true
    },
    {
      name: 'Al Shareq Sweets',
      category: 'catering',
      pricing: { type: 'per-person', amount: 8 },
      city: 'Beirut',
      amenities: ['Desserts', 'Delivery'],
      styles: ['Lebanese'],
      cuisines: ['Desserts'],
      dietaryOptions: [],
      photos: ['/images/catering/alshareq/alshareq.png'],
      verified: true
    },
    {
      name: 'Al Bohsali 1870',
      category: 'catering',
      pricing: { type: 'per-person', amount: 10 },
      city: 'Beirut',
      amenities: ['Desserts', 'Delivery'],
      styles: ['Lebanese'],
      cuisines: ['Desserts'],
      dietaryOptions: [],
      photos: ['/images/catering/albohsali/albohsali.png'],
      verified: true
    },
    {
      name: 'Daze Sweets',
      category: 'catering',
      pricing: { type: 'per-person', amount: 8 },
      city: 'Beirut',
      amenities: ['Desserts', 'Delivery'],
      styles: ['Patisserie'],
      cuisines: ['Desserts'],
      dietaryOptions: [],
      photos: ['/images/catering/daze/daze.jpeg'],
      verified: true
    },
    {
      name: 'Al Baba Sweets',
      category: 'catering',
      pricing: { type: 'per-person', amount: 8 },
      city: 'Khalde',
      amenities: ['Desserts', 'Delivery'],
      styles: ['Lebanese'],
      cuisines: ['Desserts'],
      dietaryOptions: [],
      photos: ['/images/catering/albaba/albaba.png'],
      verified: true
    },
    {
      name: 'Alabdallah Restaurant',
      category: 'catering',
      pricing: { type: 'package', amount: 450 },
      city: 'Beirut',
      amenities: ['Delivery', 'Platters'],
      styles: ['Lebanese'],
      cuisines: ['Lebanese'],
      dietaryOptions: ['Vegetarian'],
      photos: ['/images/catering/alabdalla/alabdullahRest.png'],
      verified: true
    }
  ];

  await Vendor.insertMany(vendors);

  await MetaOption.insertMany([
    { category: 'event-type', key: 'wedding', labels: { en: 'Wedding', ar: 'Wedding' }, order: 1 },
    { category: 'event-type', key: 'corporate', labels: { en: 'Corporate', ar: 'Corporate' }, order: 2 },
    { category: 'service-category', key: 'venue', labels: { en: 'Venue', ar: 'Venue' }, order: 1 },
    { category: 'service-category', key: 'photographer', labels: { en: 'Photographer', ar: 'Photographer' }, order: 2 },
    { category: 'service-category', key: 'catering', labels: { en: 'Catering', ar: 'Catering' }, order: 3 }
  ]);

  console.log('Seed done!');
  process.exit();
};

seed();
