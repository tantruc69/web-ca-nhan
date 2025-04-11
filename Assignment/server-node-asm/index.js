require("dotenv").config();
const SECRET_KEY = process.env.SECRET_KEY;
console.log(SECRET_KEY);
if (!SECRET_KEY) {
  throw new Error("SECRET_KEY chưa được định nghĩa trong file .env!");
}
const express = require("express");
var app = express();
const nodemailer = require("nodemailer");
const port = 3000;
const cors = require("cors");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const bodyParser = require("body-parser");
const otpStorage = new Map();
app.use(express.json());

app.use(
  cors({
    origin: "http://localhost:8386",
    credentials: true,
  })
);
const {
  ProductsModel,
  BrandModel,
  OrdersModel,
  OrdersDetailModel,
  ProductAttributes,
  Voucher,
  UserModel,
  CommentModel,
} = require("./database");
const { Op } = require("sequelize");
//routes
app.post("/send-email", async (req, res) => {
  const { name, email, phone, message } = req.body;

  let transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  let mailOptions = {
    from: "info@mesvia.vn",
    to: email,
    subject: "Yêu cầu liên hệ từ khách hàng",
    html: `
          <h3>Thông tin khách hàng</h3>
          <p><strong>Tên:</strong> ${name}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Số điện thoại:</strong> ${phone}</p>
          <p><strong>Hỗ trợ:</strong> Cảm ơn ${name} đã liên hệ với chúng tôi. Chúng tôi sẽ liên hệ lại cho bạn trong thời gian ngắn nhất mong bạn giữ máy để được phản hồi tốt nhất.</p>
          <p>Trân trọng cảm ơn.</p>
      `,
  };

  try {
    await transporter.sendMail(mailOptions);
    res
      .status(200)
      .json({ success: true, message: "Email đã được gửi thành công!" });
  } catch (error) {
    console.error("Lỗi gửi email:", error);
    res.status(500).json({ success: false, message: "Lỗi khi gửi email!" });
  }
});
app.post("/checkout-order", async (req, res) => {
  try {
    const {
      fullname_order,
      phone_order,
      email_order,
      address_order,
      note_order,
      listSP,
      totalPrice,
    } = req.body;
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
    const id_order = Math.floor(Math.random() * 1000000);

    const mailOptions = {
      from: "info@mesvia.com",
      to: email_order,
      subject: `Xác nhận đơn hàng #${id_order}`,
      html: `
        <h2>Xin chào ${fullname_order},</h2>
        <p>Cảm ơn bạn đã đặt hàng tại shop của chúng tôi.</p>
        <p><strong>Mã đơn hàng:</strong> #${id_order}</p>
        <p><strong>Tổng thanh toán:</strong> ${totalPrice.toLocaleString()}đ</p>
        <table>
        <thead>
          <tr>
          <th>Sản phẩm</th>
          <th>Giá</th>
          <th>Số lượng</th>
          </tr>
          </thead>
          <tbody>
          <tr>
          ${listSP
            .map(
              (sp) =>
                `<td>${sp.name_pro}</td> 
              <td>
              ${sp.quantity_pro}
              </td>
              <td>
              ${sp.price_pro.toLocaleString()}đ
              </td>`
            )
            .join("")}
          </tr>
          </tbody>
        </table>  
          
        <p>Chúng tôi sẽ liên hệ với bạn sớm để xác nhận đơn hàng.</p>
      `,
    };

    await transporter.sendMail(mailOptions);
    const order = await OrdersModel.create({
      id_user: req.body.id_user,
      fullname_order,
      phone_order,
      email_order,
      address_order,
      note_order,
    });
    res.json({
      thong_bao: "Đặt hàng thành công! Email xác nhận đã được gửi.",
      dh: { id_order },
    });
  } catch (error) {
    console.error("Lỗi xử lý đơn hàng:", error);
    res
      .status(500)
      .json({ thong_bao: "Lỗi xử lý đơn hàng. Vui lòng thử lại!" });
  }
});
app.get("/brands", async (req, res) => {
  const brands_arr = await BrandModel.findAll({
    order: [["id_brand", "ASC"]],
  });
  res.json(brands_arr);
});
app.get("/brands/:id", async (req, res) => {
  const brands = await BrandModel.findByPk(req.params.id);
  res.json(brands);
});
app.get("/products", async (req, res) => {
  const page = parseInt(req.query.page?.toString() || "1", 10);
  const limit = parseInt(req.query.limit?.toString() || "10", 10);

  const offset = (page - 1) * limit;

  const { count, rows } = await ProductsModel.findAndCountAll({
    order: [["id_pro", "ASC"]],
    limit,
    offset,
  });

  res.json({
    totalItems: count,
    totalPages: Math.ceil(count / limit),
    currentPage: page,
    products: rows,
  });
});
app.get("/productsadmin", async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const offset = (page - 1) * limit;

  try {
    const { count, rows } = await ProductsModel.findAndCountAll({
      offset,
      limit,
      order: [["id_pro", "DESC"]],
    });

    res.json({
      products: rows,
      total: count,
      page,
      totalPages: Math.ceil(count / limit),
    });
  } catch (err) {
    res.status(500).json({ error: "Lỗi lấy sản phẩm" });
  }
});

app.get("/products-hot/:numberpro?", async (req, res) => {
  try {
    const numberpro = Number(req.params.numberpro) || 6;

    const product_arr = await ProductsModel.findAll({
      where: { status_pro: 1, hot_pro: 1 },
      order: [
        ["created_pro", "DESC"],
        ["price_pro", "ASC"],
      ],
      limit: numberpro,
    });

    res.json(product_arr);
  } catch (error) {
    console.error("Lỗi Sequelize:", error);
    res.status(500).json({ error: "Lỗi server", message: error.message });
  }
});

app.get("/products-new/:numberpro?", async (req, res) => {
  const numberpro = Number(req.params.numberpro) || 6;
  const sp_arr = await ProductsModel.findAll({
    where: { status_pro: 1 },
    order: [
      ["created_pro", "DESC"],
      ["price_pro", "ASC"],
    ],
    offset: 0,
    limit: numberpro,
  });
  res.json(sp_arr);
});
app.get("/products/:id", async (req, res) => {
  const id = Number(req.params.id);
  const sp = await ProductsModel.findOne({
    where: { id_pro: id },
  });
  res.json(sp);
});
app.get("/products-by-brands/:id", async (req, res) => {
  try {
    const id_brand = Number(req.params.id);
    const page = parseInt(req.query.page?.toString() || "1", 10);
    const limit = parseInt(req.query.limit?.toString() || "5", 10);
    const offset = (page - 1) * limit;

    const { count, rows } = await ProductsModel.findAndCountAll({
      where: { brand_id: id_brand, status_pro: 1 },
      order: [
        ["created_pro", "DESC"],
        ["price_pro", "ASC"],
      ],
      limit,
      offset,
    });

    res.json({
      totalItems: count,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      products: rows,
    });
  } catch (error) {
    console.error("Lỗi API /products-by-brands:", error);
    res.status(500).json({ error: "Lỗi server" });
  }
});

app.get("/search/:keyword/:page", async (req, res) => {
  try {
    const keyWord = req.params.keyword;
    const page = Number(req.params.page) || 1;
    const limit = 10;
    const offset = (page - 1) * limit;

    const products = await ProductsModel.findAll({
      where: {
        name_pro: { [Op.like]: `%${keyWord}%` },
        status_pro: 1,
      },
      order: [["created_pro", "DESC"]],
      offset: offset,
      limit: limit,
    });

    res.json({ products });
  } catch (error) {
    console.error("Lỗi tìm kiếm:", error);
    res.status(500).json({ error: "Lỗi server", message: error.message });
  }
});
app.post("/checkout-order", async (req, res) => {
  let {
    fullname_order,
    id_user,
    phone_order,
    email_order,
    address_order,
    note_order,
  } = req.body;
  await OrdersModel.create({
    id_user: id_user,
    fullname_order: fullname_order,
    phone_order: phone_order,
    email_order: email_order,
    address_order: address_order,
    note_order: note_order,
  })
    .then(function (item) {
      res.json({ thong_bao: "Đã thêm đơn hàng", dh: item });
    })
    .catch(function (error) {
      res.json({
        thong_bao: "Lỗi tạo đơn hàng",
        error,
      });
    });
});
app.post("/add-to-cart", async (req, res) => {
  let { id_order, id_pro, quantity } = req.body;
  await OrdersDetailModel.create({
    id_order: id_order,
    id_pro: id_pro,
    quantity: quantity,
  })
    .then(function (item) {
      res.json({ thong_bao: "Đã thêm vào giỏ hàng", sp: item });
    })
    .catch(function (item) {
      res.json({ thong_bao: "Lỗi thêm giỏ hàng", error });
    });
});
app.get("/product-attributes/:id_pro", async (req, res) => {
  const { id_pro } = req.params;
  try {
    const sizes = await ProductAttributes.findAll({
      where: { id_pro },
      attributes: [
        "size",
        "shoulder_width",
        "chest_width",
        "front_length",
        "back_length",
      ],
    });

    if (sizes.length === 0) {
      return res
        .status(404)
        .json({ message: "Không tìm thấy kích thước sản phẩm" });
    }

    res.json(sizes);
  } catch (error) {
    console.error("Lỗi khi lấy dữ liệu kích thước:", error);
    res.status(500).json({ error: "Lỗi server" });
  }
});
app.get("/vouchers", async (req, res) => {
  try {
    const currentDate = new Date();
    const vouchers = await Voucher.findAll({
      where: {
        end_date: { [Op.gt]: currentDate },
        status: "active",
      },
    });

    res.json(vouchers);
  } catch (error) {
    console.error("Lỗi khi lấy danh sách voucher:", error);
    res.status(500).json({ error: "Lỗi server khi lấy danh sách voucher" });
  }
});

app.post("/login", async (req, res) => {
  try {
    const { email_user, password_user } = req.body;

    if (!email_user || !password_user) {
      return res.status(400).json({ message: "Thiếu email hoặc mật khẩu!" });
    }

    const user = await UserModel.findOne({ where: { email_user } });

    if (!user) {
      return res.status(401).json({ message: "Email không tồn tại!" });
    }

    const isMatch = await bcrypt.compare(password_user, user.password_user);
    console.log("Mật khẩu nhập:", password_user);
    console.log("Mật khẩu trong DB:", user.password_user);
    console.log(
      "Kết quả so sánh:",
      await bcrypt.compare(password_user, user.password_user)
    );

    if (!isMatch) {
      return res.status(401).json({ message: "Mật khẩu không đúng!" });
    }

    const token = jwt.sign(
      {
        id_user: user._id,
        fullname_user: user.fullname_user,
        email_user: user.email_user,
        role_user: user.role_user,
      },
      SECRET_KEY,
      { expiresIn: "1h" }
    );

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "Strict",
      maxAge: 3600000,
    });

    res.json({
      message: "Đăng nhập thành công!",
      remember_token: user.remember_token,
      fullname_user: user.fullname_user,
      email_user: user.email_user,
      phone_user: user.phone_user,
      address_user: user.address_user,
      role_user: user.role_user,
    });
  } catch (error) {
    console.error("Lỗi server:", error);
    res.status(500).json({ message: "Lỗi server!", error: error.message });
  }
});

app.post("/register", async (req, res) => {
  try {
    const {
      email_user,
      password_user,
      fullname_user,
      phone_user,
      address_user,
      images_user,
    } = req.body;

    if (!email_user || !password_user || !fullname_user || !phone_user) {
      return res.status(400).json({ message: "Thiếu thông tin người dùng!" });
    }

    const existingUser = await UserModel.findOne({ where: { email_user } });
    if (existingUser) {
      return res.status(400).json({ message: "Email này đã được đăng ký!" });
    }
    const rememberToken = jwt.sign({ email_user }, process.env.SECRET_KEY, {
      expiresIn: "30d",
    });
    const hashedPassword = await bcrypt.hash(password_user, 10);
    console.log("Mật khẩu gốc:", password_user);
    console.log("Mật khẩu sau khi hash:", hashedPassword);

    await UserModel.create({
      email_user,
      password_user: hashedPassword,
      fullname_user,
      phone_user,
      address_user,
      images_user,
      remember_token: rememberToken,
    });

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: "info@mesvia.vn",
      to: email_user,
      subject: "Xác nhận đăng ký tài khoản",
      html: `
        <h3>Chào ${fullname_user},</h3>
        <p>Bạn đã đăng ký thành công tài khoản trên hệ thống của chúng tôi.</p>
        <p>Chúc bạn có trải nghiệm tốt nhất!</p>
        <p><strong>Chuyển đến trang web:</strong><a href="https://facebook.com/iamttruc05">mesvia.com.vn</a></p>

        <br/>
        <p><strong>Hỗ trợ:</strong> Nếu bạn có bất kỳ vấn đề nào, vui lòng liên hệ với chúng tôi.</p>
        <p><strong>Liên hệ với chúng tôi:</strong>info@mesvia.vn</p>
      `,
    };

    await transporter.sendMail(mailOptions);

    res.json({ message: "Đăng ký thành công! Vui lòng kiểm tra email." });
  } catch (error) {
    console.error("Lỗi server:", error);
    res.status(500).json({ message: "Lỗi server!" });
  }
});
const transporter = nodemailer.createTransport({
  service: "Gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

app.post("/request-reset", async (req, res) => {
  const { email } = req.body;
  const user = await UserModel.findOne({ where: { email_user: email } });
  if (!user) {
    return res.status(400).json({ message: "Email không tồn tại!" });
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  otpStorage.set(email, { otp, expires: Date.now() + 5 * 60 * 1000 });

  await transporter.sendMail({
    from: "info@mesvia.com",
    to: email,
    subject: "Mã OTP đặt lại mật khẩu",
    text: `Mã OTP của bạn là: ${otp}`,
  });

  res.json({ message: "Mã OTP đã được gửi đến email của bạn." });
});

app.post("/reset-password", async (req, res) => {
  const { email, otp, newPassword } = req.body;
  const storedOtp = otpStorage.get(email);

  if (!storedOtp || storedOtp.otp !== otp || storedOtp.expires < Date.now()) {
    return res
      .status(400)
      .json({ message: "Mã OTP không hợp lệ hoặc đã hết hạn!" });
  }

  try {
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    const [updatedRows] = await UserModel.update(
      { password_user: hashedPassword },
      { where: { email_user: email } }
    );

    if (updatedRows === 0) {
      return res
        .status(400)
        .json({ message: "Không tìm thấy tài khoản hoặc lỗi cập nhật." });
    }

    otpStorage.delete(email);

    res.json({ message: "Mật khẩu đã được đặt lại thành công." });
  } catch (error) {
    console.error("Lỗi đặt lại mật khẩu:", error);
    res.status(500).json({ message: "Lỗi server, vui lòng thử lại sau!" });
  }
});
app.get("/comments", async (req, res) => {
  try {
    const { product_id, limit = 5, offset = 0 } = req.query;

    if (!product_id) {
      return res.status(400).json({ message: "Thiếu product_id" });
    }

    const comments = await CommentModel.findAll({
      where: { product_id },
      include: [
        {
          model: UserModel,
          attributes: ["fullname_user", "images_user"],
        },
      ],
      order: [["created_at", "DESC"]],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    res.json(comments);
  } catch (error) {
    console.error("Lỗi khi lấy bình luận:", error);
    res.status(500).json({ message: "Lỗi server" });
  }
});

app.post("/comments", async (req, res) => {
  try {
    console.log("Dữ liệu nhận được từ client:", req.body); // Debug

    const { user_id, product_id, content, rating } = req.body;

    if (!user_id || !product_id || !content) {
      return res.status(400).json({ message: "Thiếu dữ liệu bắt buộc!" });
    }

    const newComment = await CommentModel.create({
      user_id,
      product_id,
      content,
      rating,
      created_at: new Date(),
    });

    res.status(201).json({
      message: "Bình luận đã được thêm thành công!",
      comment: newComment,
    });
  } catch (error) {
    console.error("Lỗi khi thêm bình luận:", error);
    res.status(500).json({ message: "Lỗi server!" });
  }
});

app.post("/get_user", async (req, res) => {
  const { remember_token } = req.body;

  if (!remember_token) {
    return res.status(400).json({ error: "Thiếu token" });
  }

  try {
    const user = await UserModel.findOne({
      where: { remember_token },
      attributes: ["id_user", "fullname_user", "email_user"],
    });

    if (!user) {
      return res.status(404).json({ error: "Không tìm thấy user" });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ error: "Lỗi server", details: error.message });
  }
});
app.post("/get_orders_by_user", async (req, res) => {
  const { id_user } = req.body;

  if (!id_user) {
    return res.status(400).json({ error: "Thiếu id_user" });
  }

  try {
    const orders = await OrdersModel.findAll({
      where: { id_user },
      order: [["id_order", "DESC"]],
    });

    res.json(orders);
  } catch (error) {
    res
      .status(500)
      .json({ error: "Lỗi server khi lấy đơn hàng của người dùng" });
  }
});

app.post("/update_user", async (req, res) => {
  const { id_user, fullname_user, email_user } = req.body;

  try {
    await UserModel.update(
      { fullname_user, email_user },
      { where: { id_user } }
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Lỗi server", details: error.message });
  }
});

// Admin
app.get("/users", async (req, res) => {
  try {
    const users = await UserModel.findAll();
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: "Lỗi server" });
  }
});

app.patch("/users/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { status_user, role_user } = req.body;

    const updateData = {};
    if (status_user !== undefined) updateData.status_user = status_user;
    if (role_user !== undefined) updateData.role_user = role_user;

    const [updated] = await UserModel.update(updateData, {
      where: { id_user: id },
    });

    if (!updated) {
      return res.status(404).json({ message: "Người dùng không tồn tại" });
    }

    const user = await UserModel.findOne({ where: { id_user: id } });
    res.json({ message: "Người dùng đã được cập nhật", ...user.dataValues });
  } catch (error) {
    res.status(500).json({ message: "Lỗi server", error });
  }
});
app.post("/change-password", async (req, res) => {
  const { email, pass_old, pass_new1, pass_new2 } = req.body;

  if (!email || !pass_old || !pass_new1 || !pass_new2) {
    return res.status(400).json({ message: "Vui lòng nhập đầy đủ thông tin" });
  }

  if (pass_new1 !== pass_new2) {
    return res.status(400).json({ message: "Mật khẩu mới không khớp" });
  }

  try {
    const user = await UserModel.findOne({ where: { email_user: email } });

    if (!user) {
      return res.status(404).json({ message: "Không tìm thấy người dùng" });
    }

    const isMatch = await bcrypt.compare(pass_old, user.password_user);
    if (!isMatch) {
      return res.status(401).json({ message: "Mật khẩu cũ không đúng" });
    }

    const hashedNewPass = await bcrypt.hash(pass_new1, 10);

    await UserModel.update(
      { password_user: hashedNewPass },
      { where: { email_user: email } }
    );

    return res.json({ message: "Đổi mật khẩu thành công!" });
  } catch (err) {
    console.error("Lỗi khi đổi mật khẩu:", err);
    return res.status(500).json({ message: "Lỗi máy chủ" });
  }
});
app.post("/brands", async (req, res) => {
  const { name_brand } = req.body;
  try {
    const newBrand = await BrandModel.create({ name_brand });
    res.status(201).json(newBrand);
  } catch (error) {
    res.status(500).json({ error: "Lỗi khi thêm thương hiệu" });
  }
});

app.put("/brands/:id", async (req, res) => {
  const { id } = req.params;
  const { name_brand } = req.body;
  try {
    const brand = await BrandModel.findByPk(id);
    if (!brand)
      return res.status(404).json({ error: "Không tìm thấy thương hiệu" });

    brand.name_brand = name_brand;
    await brand.save();
    res.json(brand);
  } catch (error) {
    res.status(500).json({ error: "Lỗi khi cập nhật thương hiệu" });
  }
});

app.delete("/brands/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await BrandModel.destroy({ where: { id_brand: id } });
    res.json({ message: "Xóa thành công" });
  } catch (error) {
    res.status(500).json({ error: "Lỗi xóa thương hiệu" });
  }
});

app.post("/products", async (req, res) => {
  const {
    name_pro,
    description_pro,
    price_pro,
    discount_pro,
    brand_id,
    images_pro,
    hot_pro,
    short_des_pro,
    status_pro,
  } = req.body;
  try {
    const newProduct = await ProductsModel.create({
      name_pro,
      description_pro,
      price_pro,
      discount_pro,
      brand_id,
      images_pro,
      hot_pro,
      short_des_pro,
      status_pro,
      created_pro: new Date(),
    });
    res.status(201).json(newProduct);
  } catch (error) {
    res.status(500).json({ error: "Lỗi khi thêm sản phẩm" });
  }
});
app.put("/products/:id", async (req, res) => {
  const { id } = req.params;
  const {
    name_pro,
    description_pro,
    price_pro,
    discount_pro,
    brand_id,
    images_pro,
    hot_pro,
    short_des_pro,
    status_pro,
  } = req.body;
  try {
    const product = await ProductsModel.findByPk(id);
    if (!product) {
      return res.status(404).json({ error: "Sản phẩm không tồn tại" });
    }
    product.name_pro = name_pro;
    product.description_pro = description_pro;
    product.price_pro = price_pro;
    product.discount_pro = discount_pro;
    product.brand_id = brand_id;
    product.images_pro = images_pro;
    product.hot_pro = hot_pro;
    product.short_des_pro = short_des_pro;
    product.status_pro = status_pro;
    await product.save();
    res.json(product);
  } catch (error) {
    res.status(500).json({ error: "Lỗi khi sửa sản phẩm" });
  }
});
app.delete("/products/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const product = await ProductsModel.findByPk(id);
    if (!product) {
      return res.status(404).json({ error: "Sản phẩm không tồn tại" });
    }
    await product.destroy();
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: "Lỗi khi xóa sản phẩm" });
  }
});

app.get("/orders", async (req, res) => {
  try {
    const orders = await OrdersModel.findAll({ order: [["id_order", "DESC"]] });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: "Lỗi khi lấy đơn hàng" });
  }
});

app.put("/orders/:id", async (req, res) => {
  const { status } = req.body;
  try {
    const order = await OrdersModel.findByPk(req.params.id);
    if (!order)
      return res.status(404).json({ error: "Không tìm thấy đơn hàng" });

    order.status = status;
    await order.save();
    res.json({ message: "Cập nhật thành công" });
  } catch (err) {
    res.status(500).json({ error: "Lỗi khi cập nhật" });
  }
});

app
  .listen(port, () => {
    console.log(`Ung dung dang chay o port ${port}`);
  })
  .on("error", function (err) {
    console.log(`Loi xay ra khi chay ung dung ${err}`);
  });
