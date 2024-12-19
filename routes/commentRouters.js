const express = require("express");
const router = express.Router();
const commentController = require("../controllers/commentController");
//show tất cả bình luận
//http://localhost:5000/comment/showAll
router.get("/showAll", commentController.showAllComment);
//thêm bình luận
//http://localhost:5000/comment/add
router.post("/add", commentController.addComment);

//lấy tất cả bình luận theo _id sản phẩm
//http://localhost:5000/comment/getAll/:id_san_pham
router.get("/getAll/:id_san_pham", commentController.getAllComment);

//api ẩn hoặc hiện bình luận
//http://localhost:5000/comment/changeStatus/:id
router.put("/changeStatus/:id", commentController.toggleComment);

//api trả lời bình luận bên phía admin
//http://localhost:5000/comment/reply/:id
router.post("/reply/:id", commentController.replyComment);
//lấy chi tiết bình luận theo _id bình luận
//http://localhost:5000/comment/get/:id
router.get("/get/:id", commentController.getComment);

//cập nhật bình luận
//http://localhost:5000/comment/update/:id
router.put("/update/:id", commentController.updateComment);


module.exports = router;
