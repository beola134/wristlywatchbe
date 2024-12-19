// ptttController.js
const Pttt = require("../models/pttt");
const DonHang = require("../models/donhang"); // Assuming you have an Order model
const axios = require("axios").default;
const CryptoJS = require("crypto-js");
const moment = require("moment");
const qs = require("qs");
const Product = require("../models/product");
const ChiTietDonHang = require("../models/chitietdonhang");

// này là config cho ZaloPay
const config = {
  app_id: "2553",
  key1: "PcY4iZIKFCIdgZvA6ueMcMHHUbRLYjPL",
  key2: "kLtgPl8HHhfvMuDHPwKfgfsY4Ydm9eIz",
  endpoint: "https://sb-openapi.zalopay.vn/v2/create",
};
// ZaloPay Callback
exports.callback = async (req, res) => {
  const result = {};
  try {
    const { data: dataStr, mac: reqMac } = req.body;
    // Tính toán MAC để kiểm tra tính hợp lệ
    const mac = CryptoJS.HmacSHA256(dataStr, config.key2).toString();
    console.log("Generated MAC:", mac);
    if (reqMac !== mac) {
      // Callback không hợp lệ
      result.return_code = -1;
      result.return_message = "mac not equal";
    } else {
      // Parse dữ liệu từ ZaloPay
      const dataJson = JSON.parse(dataStr);
      const appTransId = dataJson["app_trans_id"];
      // Tìm đơn hàng dựa trên app_trans_id
      const order = await DonHang.findOne({ where: { app_trans_id: appTransId } });
      if (order) {
        // Cập nhật trạng thái đơn hàng
        order.trang_thai = "Đã xác nhận";
        order.trang_thai_thanh_toan = "Đã thanh toán";
        order.thanh_toan = true;
        await order.save();
        console.log(`Order ${appTransId} status updated to success.`);
        result.return_code = 1;
        result.return_message = "success";
      } else {
        result.return_code = -2;
        result.return_message = "Order not found";
      }
    }
  } catch (error) {
    console.error("Error in callback:", error.message);
    result.return_code = 0;
    result.return_message = error.message;
  }
  res.json(result);
  console.log("response sent:", result);
};

// ZaloPay Payment
exports.zaloPay = async (req, res) => {
  const { amount, orderDetails } = req.body;
  //Xác thực chi tiết đơn hàng và số tiền
  if (!orderDetails || !orderDetails.id_nguoi_dung || !orderDetails.chi_tiet_don_hang || amount <= 0) {
    return res.status(400).json({ message: "Invalid order details or amount" });
  }
  // Tạo mã giao dịch ngẫu nhiên
  const transID = Math.floor(Math.random() * 1000000);
  const app_trans_id = `${moment().format("YYMMDD")}_${transID}`;

  try {
    const order = await DonHang.create({
      app_trans_id,
      id_nguoi_dung: orderDetails.id_nguoi_dung,
      dia_chi: orderDetails.dia_chi || "",
      tong_tien: amount,
      trang_thai: "Chờ xác nhận",
      trang_thai_thanh_toan: "Chưa thanh toán",
      thanh_toan: false,
      id_phuong_thuc_thanh_toan: "3",
      ghi_chu: orderDetails.ghi_chu || "",
      phi_ship: orderDetails.phi_ship || "Miễn phí",
    });
    const chiTietPromises = orderDetails.chi_tiet_don_hang.map(async (ct) => {
      const product = await Product.findByPk(ct.id_san_pham);
      if (product) {
        await ChiTietDonHang.create({
          gia_san_pham: product.gia_giam > 0 ? product.gia_giam : product.gia_san_pham,
          ten_san_pham: product.ten_san_pham,
          so_luong: ct.so_luong,
          id_don_hang: order._id,
          id_san_pham: ct.id_san_pham,
        });
        product.so_luong -= ct.so_luong;
        await product.save();
      }
    });
    const embed_data = {
      redirecturl: "http://localhost:3001",
    };

    const paymentData = {
      app_id: config.app_id,
      app_trans_id: app_trans_id,
      app_user: orderDetails.id_nguoi_dung,
      app_time: Date.now(),
      item: JSON.stringify(orderDetails.chi_tiet_don_hang),
      embed_data: JSON.stringify(embed_data),
      amount: amount,
      description: `Payment for order #${transID}`,
      bank_code: "",
      callback_url: "https://c4e2-171-243-48-82.ngrok-free.app/pttt/callback",
    };

    const data = `${config.app_id}|${paymentData.app_trans_id}|${paymentData.app_user}|${paymentData.amount}|${paymentData.app_time}|${paymentData.embed_data}|${paymentData.item}`;
    paymentData.mac = CryptoJS.HmacSHA256(data, config.key1).toString();

    const response = await axios.post(config.endpoint, null, { params: paymentData });

    return res.status(200).json(response.data);
  } catch (error) {
    console.log(error.message);
    return res.status(500).json({ message: "Payment initiation failed" });
  }
};



