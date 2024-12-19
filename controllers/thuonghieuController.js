const ThuongHieu = require("../models/thuonghieu");
const upload = require("../config/update");
const { Op, where } = require('sequelize'); // Import Op từ sequelize

//lấy tất cả thương hiệu
exports.getAllThuongHieu = async (req, res) => {
  try {
    const th = await ThuongHieu.findAll();
    res.json({ th });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Lấy thương hiệu theo ID
exports.getthuonghieuById = async (req, res) => {
  try {
    const th = await ThuongHieu.findOne({ where: { _id: req.params.id } });
    if (!th) {
      return res.status(404).json({ error: "Không tìm thấy thương hiệu" });
    }
    res.json({ th });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Hàm xử lý việc thêm Thương hiệu với hình ảnh
exports.addThuongHieu = async (req, res) => {
  try {
    // Sử dụng upload.fields để xử lý nhiều hình ảnh
    upload.fields([{ name: "hinh_anh", maxCount: 1 }, { name: "hinh_anh2", maxCount: 1 }])(req, res, async (err) => {
      if (err) {
        return res.status(400).json({ error: err.message });
      }
      const { thuong_hieu, mo_ta } = req.body;
      // Kiểm tra nếu req.files tồn tại
      const hinh_anh = req.files && req.files.hinh_anh ? req.files.hinh_anh[0].originalname : "";
      const hinh_anh2 = req.files && req.files.hinh_anh2 ? req.files.hinh_anh2[0].originalname : "";
      // Tạo đối tượng cate
      const th = new ThuongHieu({ thuong_hieu, mo_ta, hinh_anh, hinh_anh2 });
      await th.save();
      res.json({ th });
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


// Hàm xử lý việc xóa Thương hiệu
exports.deletethuonghieu = async (req, res) => {
  try {
    const th = await ThuongHieu.findOne({ where: { _id: req.params.id } });
    if (!th) {
      return res.status(404).json({ error: "Không tìm thấy thương hiệu" });
    }
    await th.destroy();
    res.json({ message: "Xóa thương hiệu thành công" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Hàm xử lý việc cập nhật Thương hiệu
exports.updateThuongHieu = async (req, res) => {
  try {
    // Tìm Thương hiệu theo ID
    const th = await ThuongHieu.findOne({ where: { _id: req.params.id } });
    if (!th) {
      return res.status(404).json({ error: "Không tìm thấy thương hiệu" });
    }

    // Xử lý upload ảnh
    upload.fields([{ name: "hinh_anh", maxCount: 1 }, { name: "hinh_anh2", maxCount: 1 }])(req, res, async (err) => {
      if (err) {
        return res.status(400).json({ error: err.message });
      }

      // Cập nhật dữ liệu
      const { thuong_hieu, mo_ta } = req.body;
      th.thuong_hieu = thuong_hieu || th.thuong_hieu;
      th.mo_ta = mo_ta || th.mo_ta;

      // Cập nhật hình ảnh nếu có
      if (req.files && req.files.hinh_anh && req.files.hinh_anh.length > 0) {
        th.hinh_anh = req.files.hinh_anh[0].originalname;
      }
      if (req.files && req.files.hinh_anh2 && req.files.hinh_anh2.length > 0) {
        th.hinh_anh2 = req.files.hinh_anh2[0].originalname;
      }

      // Lưu thay đổi
      await th.save();
      res.json({ th });
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
