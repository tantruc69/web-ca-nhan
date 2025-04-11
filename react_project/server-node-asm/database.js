const { Sequelize, DataTypes } = require("sequelize");
// Tạo đối tượng kết nối đến database
const sequelize = new Sequelize("web2091_reactjs_asm", "root", "", {
  host: "localhost",
  dialect: "mysql",
});

const BrandModel = sequelize.define(
  "brands",
  {
    id_brand: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    name_brand: { type: DataTypes.STRING, allowNull: false },
    created_brand: { type: DataTypes.INTEGER, defaultValue: 0 },
  },
  { timestamps: false, tableName: "brands" }
);

const ProductsModel = sequelize.define(
  "products",
  {
    id_pro: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name_pro: { type: DataTypes.STRING },
    description_pro: { type: DataTypes.STRING },
    price_pro: { type: DataTypes.INTEGER },
    discount_pro: { type: DataTypes.INTEGER },
    brand_id: { type: DataTypes.INTEGER },
    created_pro: { type: DataTypes.DATE },
    images_pro: { type: DataTypes.STRING },
    hot_pro: { type: DataTypes.INTEGER },
    view_pro: { type: DataTypes.INTEGER, defaultValue: 0 },
    short_des_pro: { type: DataTypes.STRING },
    status_pro: { type: DataTypes.INTEGER, defaultValue: 0 },
  },
  { timestamps: false, tableName: "products" }
);
const OrdersModel = sequelize.define(
  "orders",
  {
    id_order: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    bought_date: { type: DataTypes.DATE, defaultValue: new Date() },
    id_user: { type: DataTypes.INTEGER },
    fullname_order: { type: DataTypes.STRING },
    phone_order: { type: DataTypes.STRING },
    email_order: { type: DataTypes.STRING },
    note_order: { type: DataTypes.STRING, defaultValue: "" },
    address_order: { type: DataTypes.STRING, defaultValue: "" },
    status: {
      type: DataTypes.STRING,
      defaultValue: "Pending",
    },
    
  },
  { timestamps: false, tableName: "orders" }
);
const OrdersDetailModel = sequelize.define(
  "orders_detail",
  {
    id_order_detail: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    id_order: { type: DataTypes.INTEGER },
    id_pro: { type: DataTypes.INTEGER },
    quantity: { type: DataTypes.INTEGER },
  },
  { timestamps: false, tableName: "orders_detail" }
);
const ProductAttributes = sequelize.define(
  "attribute",
  {
    id_pro: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    size: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    shoulder_width: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
    chest_width: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
    front_length: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
    back_length: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
  },
  {
    tableName: "attributes",
    timestamps: false, // Nếu không có createdAt, updatedAt
  }
);
const Voucher = sequelize.define(
  "vouchers",
  {
    id_voucher: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    code: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    description: {
      type: DataTypes.TEXT,
    },
    discount_type: {
      type: DataTypes.ENUM("percent", "fixed"),
      allowNull: false,
    },
    discount_value: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
    min_order_value: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
    max_discount: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    start_date: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    end_date: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    usage_limit: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    used_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    status: {
      type: DataTypes.ENUM("active", "expired", "disabled"),
      allowNull: false,
    },
  },
  {
    tableName: "vouchers",
    timestamps: false, 
  }
);

const UserModel = sequelize.define(
  "users",
  {
    id_user: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    email_user: { type: DataTypes.STRING, allowNull: false },
    fullname_user: { type: DataTypes.STRING, allowNull: true },
    password_user: { type: DataTypes.STRING, allowNull: true },
    phone_user: { type: DataTypes.STRING, allowNull: true },
    address_user: { type: DataTypes.STRING, allowNull: true },
    images_user: { type: DataTypes.STRING, allowNull: true },
    role_user: { type: DataTypes.INTEGER, defaultValue: 1 },
    status_user: { type: DataTypes.INTEGER, defaultValue: 0 },
    email_verified_at: { type: DataTypes.STRING, defaultValue: 0 },
    remember_token: { type: DataTypes.STRING},
    created_at: { type: DataTypes.INTEGER, defaultValue: 0 },
  },
  { timestamps: false, tableName: "users" }
);

const CommentModel = sequelize.define(
  "comments",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    user_id: { type: DataTypes.INTEGER, allowNull: false },
    product_id: { type: DataTypes.INTEGER, allowNull: false },
    content: { type: DataTypes.TEXT, allowNull: false },
    rating: { type: DataTypes.INTEGER, allowNull: true },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  },
  { timestamps: false, tableName: "comments" }
);

CommentModel.belongsTo(UserModel, { foreignKey: "user_id" });
UserModel.hasMany(CommentModel, { foreignKey: "user_id" });


module.exports = {
  ProductsModel,
  BrandModel,
  OrdersModel,
  OrdersDetailModel,
  ProductAttributes,
  Voucher,
  UserModel,
  CommentModel
};
