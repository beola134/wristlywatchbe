const CMT = require("../models/comment");
const Product = require("../models/product");
const Users = require("../models/users");
const { Op } = require("sequelize");
const { DonHang, ChiTietDonHang } = require("../models");
// Show tất cả bình luận
exports.showAllComment = async (req, res) => {
  try {
    const { page = 1, limit = 5, ten_dang_nhap } = req.query;
    const offset = (page - 1) * limit;
    let filter = {};
    if (ten_dang_nhap) {
      const users = await Users.findAll({
        where: {
          ten_dang_nhap: {
            [Op.like]: `%${ten_dang_nhap}%`,
          },
        },
      });

      if (users.length === 0) {
        return res.status(200).json({
          comments: [],
          totalComments: 0,
          totalPages: 0,
          currentPage: page,
        });
      }
      const userIds = users.map((user) => user._id);
      filter = { id_nguoi_dung: { [Op.in]: userIds } };
    }
    const comments = await CMT.findAll({
      order: [["ngay_binh_luan", "DESC"]],
      where: filter,
      limit,
      offset,
    });

    // Lấy thông tin người dùng cho từng bình luận
    const commentsWithUser = await Promise.all(
      comments.map(async (comment) => {
        const user = await Users.findOne({ where: { _id: comment.id_nguoi_dung } });
        return {
          ...comment.dataValues,
          user: user
            ? {
                _id: user._id,
                ten_dang_nhap: user.ten_dang_nhap,
                hinh_anh: user.hinh_anh,
              }
            : null,
        };
      })
    );

    // Tính tổng số bình luận và trang
    const totalComments = await CMT.count({ where: filter });
    const totalPages = Math.ceil(totalComments / limit);

    return res.status(200).json({
      comments: commentsWithUser,
      totalComments,
      totalPages,
      currentPage: page,
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: "Lỗi server" });
  }
};

//Bình luận sản phẩm theo _id sản phẩm và _id người dùng
exports.addComment = async (req, res) => {
  try {
    const { id_san_pham, id_nguoi_dung, noi_dung} = req.body;
    // Kiểm tra xem sản phẩm và người dùng có tồn tại không
    const [product, user] = await Promise.all([
      Product.findOne({ where: { _id: id_san_pham } }),
      Users.findOne({ where: { _id: id_nguoi_dung } }),
    ]);

    if (!product) {
      return res.status(400).json({ message: "Không tìm thấy sản phẩm" });
    }
    if (!user) {
      return res.status(400).json({ message: "Không tìm thấy người dùng" });
    }
    // Tạo bình luận
    const comment = await CMT.create({
      noi_dung,
      id_nguoi_dung,
      id_san_pham,
      ngay_binh_luan: new Date(),
    });

    res.status(201).json({
      message: "Bình luận thành công",
      comment: {
        id: comment._id,
        noi_dung: comment.noi_dung,
        id_nguoi_dung: comment.id_nguoi_dung,
        id_san_pham: comment.id_san_pham,
        ngay_binh_luan: comment.ngay_binh_luan,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};

//lấy tất cả bình luận theo _id sản phẩm
exports.getAllComment = async (req, res) => {
  try {
    const { id_san_pham } = req.params;
    const { page = 1, limit = 3 } = req.query;
    const offset = (page - 1) * limit;
    
    // Kiểm tra xem sản phẩm có tồn tại không
    const product = await Product.findOne({ where: { _id: id_san_pham } });
    if (!product) {
      return res.status(404).json({ message: "Không tìm thấy sản phẩm" });
    }

    // Lấy tất cả bình luận có trang_thai = 1 theo _id sản phẩm với phân trang
    const comments = await CMT.findAll({
      where: { id_san_pham, trang_thai: 1 },  // Thêm điều kiện lọc trang_thai = 1
      limit,
      offset,
    });

    // Lấy thông tin người dùng cho từng bình luận
    const commentsWithUser = await Promise.all(
      comments.map(async (comment) => {
        const user = await Users.findOne({ where: { _id: comment.id_nguoi_dung } });
        return {
          ...comment.dataValues,
          user: user
            ? {
                _id: user._id,
                ten_dang_nhap: user.ten_dang_nhap,
                hinh_anh: user.hinh_anh,
              }
            : null,
        };
      })
    );

    // Tính tổng số bình luận có trang_thai = 1 theo _id sản phẩm đó
    const totalComments = await CMT.count({ where: { id_san_pham, trang_thai: 1 } });  // Cập nhật điều kiện
    const totalPages = Math.ceil(totalComments / limit); // Tổng số trang

    res.status(200).json({
      comments: commentsWithUser,
      totalComments,
      totalPages,
      currentPage: page,
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: "Lỗi server" });
  }
};


//viết api ẩn hoặc hiện bình luận
exports.toggleComment = async (req, res) => {
  try {
    const { id } = req.params;
    const comment = await CMT.findOne({ where: { _id: id } });
    if (!comment) {
      return res.status(404).json({ message: "Không tìm thấy bình luận" });
    }
    const updatedComment = await comment.update({ trang_thai: !comment.trang_thai });
    res.status(200).json({
      message: "Cập nhật trạng thái bình luận thành công",
      comment: updatedComment,
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: "Lỗi server" });
  }
};

//api trả lời bình luận bên phía admin bắt buộc phải đăng nhập
exports.replyComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { tra_loi_binh_luan } = req.body;
    const comment = await CMT.findOne({ where: { _id: id } });
    if (!comment) {
      return res.status(404).json({ message: "Không tìm thấy bình luận" });
    }
    const updatedComment = await comment.update({ tra_loi_binh_luan,
      ngay_tra_loi: new Date()
     });
    console.log(updatedComment);
    res.status(200).json({
      message: "Trả lời bình luận thành công",
      comment: updatedComment,
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: "Lỗi server" });
  }
};

//lấy chi tiết bình luận theo _id bình luận
exports.getComment = async (req, res) => {
  try {
    const { id } = req.params;
    const comment = await CMT.findOne({ where: { _id: id } });
    if (!comment) {
      return res.status(404).json({ message: "Không tìm thấy bình luận" });
    }
    res.status(200).json({comment});
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: "Lỗi server" });
  }
};

//cập nhật bình luận
exports.updateComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { tra_loi_binh_luan } = req.body;
    const comment = await CMT.findOne({ where: { _id: id } });
    if (!comment) {
      return res.status(404).json({ message: "Không tìm thấy bình luận" });
    }
    const updatedComment = await comment.update({ tra_loi_binh_luan });
    res.status(200).json({
      message: "Cập nhật bình luận thành công",
      comment: updatedComment,
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: "Lỗi server" });
  }
};