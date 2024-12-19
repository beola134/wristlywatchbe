require('dotenv').config();
const { OAuth2Client } = require('google-auth-library');
const Users = require("../models/users");
const jwt = require('jsonwebtoken');

// Google client ID
const client_id = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
const client = new OAuth2Client(client_id);

if (!process.env.ACCESS_TOKEN_SECRET) {
    throw new Error('ACCESS_TOKEN_SECRET is not defined in environment variables');
}

async function verifyGoogleToken(token) {
    const ticket = await client.verifyIdToken({
        idToken: token,
        audience: client_id
    });
    return ticket.getPayload();
}

// Google login
const googleLogin = async (req, res) => {
    const { token } = req.body;
    console.log('Received token:', token);

    try {
        if (!token) {
            throw new Error('Token không hợp lệ');
        }

        const payload = await verifyGoogleToken(token);
        if (!payload) {
            throw new Error('Mã thông báo Google không hợp lệ');
        }

        const { email, name, given_name, picture } = payload;
        let account = await Users.findOne({ where: { email } });

        if (account) {
            // Nếu tài khoản đã tồn tại, thực hiện đăng nhập mà không cập nhật thông tin
            const tokenJwt = jwt.sign(
                { _id: account._id, email: account.email, quyen: account.quyen },
                process.env.ACCESS_TOKEN_SECRET,
                { expiresIn: '1h' }
            );
            res.cookie('token', tokenJwt, { httpOnly: true, maxAge: 60 * 60 * 1000 });
            return res.status(200).json({ message: 'Login success', token: tokenJwt });
        }

        // Nếu chưa có tài khoản, tạo tài khoản mới mà không bao gồm googleId
        account = await Users.create({
            ho_ten: name,
            ten_dang_nhap: given_name,
            hinh_anh: picture,
            email,
            quyen: '2', // Quyền mặc định cho người dùng mới là 2
        });

        const tokenJwt = jwt.sign(
            { _id: account._id, email: account.email, quyen: account.quyen },
            process.env.ACCESS_TOKEN_SECRET,
            { expiresIn: '1h' }
        );
        res.cookie('token', tokenJwt, { httpOnly: true, maxAge: 60 * 60 * 1000 });
        res.status(200).json({ message: 'Login success', token: tokenJwt });
        console.log('Created new account:', account.toJSON());

    } catch (error) {
        console.error('Login failed:', error.message);
        res.status(400).json({ message: 'Login failed', error: error.message });
    }
};

module.exports = { googleLogin };
