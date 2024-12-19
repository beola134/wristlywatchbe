const { Sequelize, DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const { v4: uuidv4 } = require('uuid'); // Import UUID v4
const BinhLuan = sequelize.define('BinhLuan', {
    _id: {
        type: DataTypes.UUID,
        defaultValue: uuidv4,
        allowNull: false,
        primaryKey: true
    },
    noi_dung: {
        type: DataTypes.TEXT,
        allowNull: false,   
    },
    tra_loi_binh_luan: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    ngay_binh_luan: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
    },
    ngay_tra_loi: {
        type: Sequelize.DATE,
        allowNull: true,
        defaultValue: Sequelize.NOW
    },
    trang_thai: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
    },
    id_nguoi_dung: {
        type: DataTypes.STRING(255),
        allowNull: false,
        index: true
    },
    id_san_pham: {
        type: DataTypes.STRING(255),
        allowNull: false, 
        index: true
    }
}, {
    tableName: 'binh_luan',
    timestamps: false
});

module.exports = BinhLuan;
