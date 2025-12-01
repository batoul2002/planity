const express = require('express');
const router = express.Router();
const favoriteController = require('../controllers/favoriteController');
const { auth } = require('../middleware/auth');
const catchAsync = require('../middleware/catchAsync');

router.post('/', auth, catchAsync(favoriteController.toggleFavorite));
router.get('/mine', auth, catchAsync(favoriteController.getMyFavorites));
router.get('/count', auth, catchAsync(favoriteController.getFavoritesCount));

module.exports = router;