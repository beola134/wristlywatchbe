const voucher = require("../models/voucher");
const { Sequelize } = require("sequelize");
const sequelize = require("../config/database"); //; // Adjust the path as necessary
const { Op } = require("sequelize");

//thêm voucher
const addVoucher = async (req, res) => {
  const {
    ma_voucher,
    gia_tri,
    phan_tram,
    so_luong,
    bat_dau,
    ket_thuc,
    mo_ta,
    don_hang_toi_thieu,
    mota2,
    trang_thai
  } = req.body;

  try {
    const newVoucher = await voucher.create({
      ma_voucher,
      gia_tri,
      phan_tram,
      so_luong,
      bat_dau,
      ket_thuc,
      mo_ta,
      don_hang_toi_thieu,
      mota2,
      trang_thai
    });

    res.status(201).json(newVoucher);
  } catch (error) {
    res.status(500).json({ error: error.message });
    console.log(error);
  }
};

//tìm kiếm voucher theo mã voucher để áp dụng cho đơn hàng dùng phương thức post
const getVoucherByCode = async (req, res) => {
  const { ma_voucher, orderTotal } = req.body;

  try {
    const voucherFound = await voucher.findOne({ where: { ma_voucher } });
    if (!voucherFound) {
      return res
        .status(404)
        .json({ error: `Không tìm thấy voucher với mã: ${ma_voucher}` });
    }
    // Kiểm tra hạn sử dụng
    const currentDate = new Date();
    if (
      new Date(voucherFound.bat_dau) > currentDate ||
      new Date(voucherFound.ket_thuc) < currentDate
    ) {
      return res
        .status(404)
        .json({
          error: `Voucher đã hết hạn, hết hạn vào: ${voucherFound.ket_thuc}`,
        });
    }
    // Kiểm tra giá trị đơn hàng tối thiểu và tối đa (nếu cần)
    const donHangToiThieu = voucherFound.don_hang_toi_thieu;
    if (donHangToiThieu && orderTotal < donHangToiThieu) {
      return res.status(404).json({
          error: `Đơn hàng phải có giá trị tối thiểu là: ${donHangToiThieu}`,
        });
    }

    res.status(200).json(voucherFound);
  } catch (error) {
    console.error("Error fetching voucher:", error);
    res.status(500).json({ error: "Đã xảy ra lỗi khi kiểm tra voucher" });
  }
};

/////////////////////////////////////////

// lấy voucher theo ID
const getVoucherById = async (req, res) => {
  const { id } = req.params;

  try {
    const voucherFound = await voucher.findOne({ where: { _id: id } });
    if (voucherFound) {
      res.status(200).json(voucherFound);
    } else {
      res.status(404).json({ message: "Voucher not found" });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// show all vouchers
const getAllVouchers = async (req, res) => {
  try {
    const { ma_voucher, limit = 2, page = 1 } = req.query;
    let filter = { [Op.and]: [] };
    if (ma_voucher) {
      filter[Op.and].push({ ma_voucher: { [Op.like]: `%${ma_voucher}%` } });
    }
    const offset = (page - 1) * limit;
    const { rows: vouchers, count: totalVouchers } = await voucher.findAndCountAll({
      where: filter,
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    // Xử lý ngày hiện tại
    const currentDate = new Date();
    for (const voucherItem of vouchers) {
      // Chuyển đổi ket_thuc sang kiểu Date
      const ketThucDate = voucherItem.ket_thuc ? new Date(voucherItem.ket_thuc) : null;
      // Kiểm tra dữ liệu null hoặc không hợp lệ
      if (!ketThucDate || isNaN(ketThucDate)) {
        console.warn(`Voucher có _id: ${voucherItem._id} có ngày kết thúc (ket_thuc) không hợp lệ`);
        continue;
      }
      const soLuong = voucherItem.so_luong ?? 0; // Gán giá trị mặc định nếu null hoặc undefined
      // Điều kiện xóa
      const shouldDelete =
        (soLuong <= 0 && ketThucDate >= currentDate) || 
        (soLuong > 0 && ketThucDate <= currentDate); 

      console.log(`Should delete: ${shouldDelete}`);

      if (shouldDelete) {
        console.log(`Deleting voucher with _id: ${voucherItem._id}`);
        await voucher.destroy({ where: { _id: voucherItem._id } });
        console.log(`Deleted voucher with _id: ${voucherItem._id}`);
      }
    }
    // Tính tổng số trang
    const totalPages = Math.ceil(totalVouchers / limit);
    // Kết quả trả về nếu không có voucher
    if (!vouchers || vouchers.length === 0) {
      return res.status(200).json({
        vouchers: [],
        currentPage: parseInt(page),
        totalPages: 0,
        totalVouchers: 0,
        message: "Không tìm thấy voucher",
      });
    }

    // Kết quả trả về nếu có voucher
    res.status(200).json({
      vouchers,
      currentPage: parseInt(page),
      totalPages,
      totalVouchers,
    });
  } catch (error) {
    console.error("Error in getAllVouchers:", error.message);
    res.status(500).json({ error: error.message });
  }
};

// cập nhật voucher
const updateVoucher = async (req, res) => {
  const { id } = req.params;
  const {
    ma_voucher,
    gia_tri,
    bat_dau,
    ket_thuc,
    so_luong,
    phan_tram,
    mo_ta,
    mota2,
    don_hang_toi_thieu,
  } = req.body;

  try {
    const voucherToUpdate = await voucher.findOne({ where: { _id: id } });

    if (!voucherToUpdate) {
      return res.status(404).json({ error: "Không tìm thấy voucher" });
    }

    voucherToUpdate.ma_voucher = ma_voucher || voucherToUpdate.ma_voucher;
    voucherToUpdate.gia_tri = gia_tri || voucherToUpdate.gia_tri;
    voucherToUpdate.bat_dau = bat_dau || voucherToUpdate.bat_dau;
    voucherToUpdate.ket_thuc = ket_thuc || voucherToUpdate.ket_thuc;
    voucherToUpdate.so_luong = so_luong || voucherToUpdate.so_luong;
    voucherToUpdate.phan_tram = phan_tram || voucherToUpdate.phan_tram;
    voucherToUpdate.mo_ta = mo_ta || voucherToUpdate.mo_ta;
    voucherToUpdate.don_hang_toi_thieu =
      don_hang_toi_thieu || voucherToUpdate.don_hang_toi_thieu;
    voucherToUpdate.mota2 = mota2 || voucherToUpdate.mota2
    await voucherToUpdate.save();

    res
      .status(200)
      .json({ message: "Cập nhật thành công", voucher: voucherToUpdate });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// xóa voucher
// Hàm xử lý việc xóa danh mục
const deleteVouCher = async (req, res) => {
  const { id } = req.params;
  try {
    const voucherToDelete = await voucher.findOne({ where: { _id: id } });
    if (!voucherToDelete) {
      return res.status(404).json({ error: "Không tìm thấy voucher" });
    }
    await voucherToDelete.destroy();
    res.json({ message: "Xóa thành công" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

////////////////////////////////////
//lấy tất cả vocher bên người dùng
const getvoucher = async (req, res) => {
  try {
    const vouchers = await voucher.findAll(
      {limit:4}
    );
    res.status(200).json({ vouchers });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

//ẩn voucher và hiện voucher

module.exports = {
  addVoucher,
  getVoucherByCode,
  getAllVouchers,
  updateVoucher,
  deleteVouCher,
  getVoucherById,
  getvoucher,
  
};
