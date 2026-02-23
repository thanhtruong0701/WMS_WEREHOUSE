# 🏭 WMS - Warehouse Management System

Hệ thống quản lý xuất nhập tồn kho Material & Thành phẩm (FG), xây dựng với React + Ant Design + Node.js + PostgreSQL.

---

## 📋 Yêu cầu

| Tool | Version |
|------|---------|
| Docker Desktop | ≥ 4.0 |
| Node.js | ≥ 18 |
| npm | ≥ 9 |

---

## 🚀 Cách chạy nhanh (Docker)

```bash
# 1. Copy env file
cp .env.example .env

# 2. Chạy toàn bộ hệ thống
docker-compose up -d

# 3. Truy cập
#    Frontend:  http://localhost:3000
#    Backend:   http://localhost:3001
#    Swagger:   http://localhost:3001/api-docs
```

---

## 🛠️ Chạy thủ công (không Docker)

### Bước 1: Cài PostgreSQL và tạo database
```sql
CREATE DATABASE wms_db;
CREATE USER wms_user WITH PASSWORD '123456Qwe@';
GRANT ALL PRIVILEGES ON DATABASE wms_db TO wms_user;

-- Chạy schema và seed
\i backend/sql/001_schema.sql
\i backend/sql/002_seed.sql
```

### Bước 2: Backend
```bash
cd backend
npm install
# Sửa .env với thông tin DB của bạn
npm run dev
# Backend chạy tại http://localhost:3001
```

### Bước 3: Frontend
```bash
cd frontend
npm install
npm run dev
# Frontend chạy tại http://localhost:3000
```

---

## 🔑 Tài khoản mặc định

| Username | Mật khẩu | Vai trò |
|----------|-----------|---------|
| admin | 123456Qwe@ | Admin (toàn quyền) |
| staff01 | 123456Qwe@ | Nhân viên kho |
| viewer01 | 123456Qwe@ | Chỉ xem |

> **Lưu ý:** Password mặc định trong seed data là `123456Qwe@`. Nếu hash không khớp, chạy lệnh đặt lại:
> ```bash
> cd backend
> node -e "const b=require('bcryptjs'); b.hash('123456Qwe@',10).then(h=>console.log(h))"
> ```
> Rồi cập nhật `002_seed.sql` với hash mới và re-seed.

---

## 📁 Cấu trúc Project

```
quan_ly_kho/
├── docker-compose.yml
├── .env.example
├── backend/
│   ├── Dockerfile
│   ├── .env
│   ├── package.json
│   ├── sql/
│   │   ├── 001_schema.sql    # Database schema
│   │   └── 002_seed.sql      # Sample data
│   └── src/
│       ├── app.js            # Express app
│       ├── server.js         # Entry point
│       ├── config/           # DB, logger, swagger
│       ├── middleware/        # auth, audit, error
│       └── modules/
│           ├── auth/         # Login, JWT
│           ├── materials/    # Kho NVL
│           ├── fg/           # Kho Thành phẩm
│           ├── transactions/ # Xác nhận GD
│           ├── dashboard/    # KPI stats
│           ├── excel/        # Import/Export
│           ├── users/        # Quản lý users
│           └── warehouses/   # Kho + Audit log
└── frontend/
    ├── Dockerfile
    ├── vite.config.js
    ├── index.html
    └── src/
        ├── main.jsx          # Entry + theme
        ├── App.jsx           # Router
        ├── index.css         # Global styles
        ├── api/              # Axios + all APIs
        ├── context/          # AuthContext
        ├── components/       # Layout
        └── pages/
            ├── Login/
            ├── Dashboard/    # KPI + Charts
            ├── Materials/    # CRUD + Stock
            ├── FG/           # CRUD + Prod/Ship
            ├── Transactions/ # Confirm GD
            ├── Users/        # Admin only
            └── AuditLog/     # Admin only
```

---

## 🔌 API Endpoints

| Method | Endpoint | Mô tả |
|--------|---------|-------|
| POST | `/api/auth/login` | Đăng nhập |
| GET | `/api/dashboard/stats` | Dashboard KPIs |
| GET/POST | `/api/materials` | Danh sách / Tạo NVL |
| POST | `/api/materials/:id/stock-in` | Nhập kho NVL |
| POST | `/api/materials/:id/stock-out` | Xuất kho NVL |
| GET/POST | `/api/fg-products` | Danh sách / Tạo FG |
| POST | `/api/fg-products/:id/production-in` | Nhập từ SX |
| POST | `/api/fg-products/:id/shipment-out` | Xuất shipment |
| POST | `/api/transactions/material/:id/confirm` | Xác nhận phiếu NVL |
| GET | `/api/excel/export/material` | Export IOS Material |
| GET | `/api/excel/export/fg` | Export IOS FG |
| POST | `/api/excel/import/material` | Import Excel NVL |
| POST | `/api/excel/import/fg` | Import Excel FG |

📖 **Swagger Docs:** http://localhost:3001/api-docs

---

## 🧪 Test API nhanh

```bash
# Đăng nhập
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"123456Qwe@"}'

# Lấy danh sách vật liệu (cần token)
curl http://localhost:3001/api/materials \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

## 🎯 Tính năng

- ✅ **Auth:** JWT, 3 roles (Admin/Staff/Viewer)
- ✅ **Dashboard:** KPI cards, biểu đồ 6 tháng, cảnh báo tồn thấp
- ✅ **Kho NVL:** CRUD, nhập kho, xuất kho, validate tồn
- ✅ **Kho FG:** CRUD, production in, shipment out, validate tồn
- ✅ **Giao dịch:** Draft → Confirmed workflow
- ✅ **Import/Export Excel:** Tương thích format IOS
- ✅ **Audit Log:** Ghi lại mọi thao tác
- ✅ **Soft delete:** Không xóa cứng dữ liệu
- ✅ **Swagger:** API docs tại /api-docs
