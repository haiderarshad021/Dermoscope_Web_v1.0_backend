const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');

router.post('/add-user', adminController.addUser);
router.get('/users', adminController.getUsers);
router.put('/update-user/:id', adminController.updateUser);
router.delete('/delete-user/:id', adminController.deleteUser);
router.get('/next-username', adminController.getNextUsername);
router.get('/dashboard-data', adminController.getDashboardData);

module.exports = router;
