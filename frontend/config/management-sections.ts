export const sections = {
  organizations: {
    title: "Tổ chức",
    description:
      "Tra cứu các tổ chức sử dụng LawScan và thông tin hoạt động của từng tổ chức.",
    icon: "building",
    columns: ["Tổ chức", "Mã số thuế", "Chủ sở hữu", "Trạng thái", "Ngày tạo"],
    statusIndex: 3,
    rows: [
      [
        "Công ty Luật Minh Khang",
        "0312456789",
        "Nguyễn Minh Khang",
        "Đang hoạt động",
        "09/10/2026",
      ],
      [
        "Nova Retail",
        "0109123456",
        "Trần Ngọc Anh",
        "Đang hoạt động",
        "04/10/2026",
      ],
      [
        "An Phát Logistics",
        "0318899123",
        "Lê Hoàng Nam",
        "Cần xác minh",
        "28/09/2026",
      ],
      [
        "Horizon Technology",
        "0107788456",
        "Vũ Thanh Hà",
        "Tạm ngưng",
        "16/09/2026",
      ],
    ],
  },
  users: {
    title: "Người dùng",
    description:
      "Theo dõi tài khoản, vai trò và tổ chức của người dùng trên toàn hệ thống.",
    icon: "team",
    columns: ["Người dùng", "Email", "Vai trò", "Tổ chức", "Trạng thái"],
    statusIndex: 4,
    rows: [
      [
        "Nguyễn Minh Khang",
        "khang@minhkhang.vn",
        "Owner",
        "Công ty Luật Minh Khang",
        "Hoạt động",
      ],
      [
        "Trần Ngọc Anh",
        "anh@novaretail.vn",
        "Owner",
        "Nova Retail",
        "Hoạt động",
      ],
      [
        "Phạm Thu Hà",
        "ha@novaretail.vn",
        "Expert",
        "Nova Retail",
        "Hoạt động",
      ],
      [
        "Vũ Thanh Hà",
        "ha@horizon.vn",
        "Owner",
        "Horizon Technology",
        "Tạm khóa",
      ],
    ],
  },
  "ai-jobs": {
    title: "Giám sát AI",
    description:
      "Theo dõi quá trình xử lý hợp đồng và các tác vụ cần kiểm tra.",
    icon: "sparkle",
    columns: [
      "Mã tác vụ",
      "Tổ chức",
      "Trạng thái",
      "Thời gian xử lý",
      "Bắt đầu",
    ],
    statusIndex: 2,
    rows: [
      [
        "AI-241009-128",
        "Nova Retail",
        "Đang xử lý",
        "01:42",
        "09/10/2026 10:24",
      ],
      [
        "AI-241009-127",
        "Minh Khang",
        "Hoàn thành",
        "02:18",
        "09/10/2026 10:18",
      ],
      [
        "AI-241009-126",
        "An Phát Logistics",
        "Thất bại",
        "00:37",
        "09/10/2026 09:56",
      ],
      [
        "AI-241009-125",
        "Nova Retail",
        "Hoàn thành",
        "01:54",
        "09/10/2026 09:41",
      ],
    ],
  },
  "audit-log": {
    title: "Nhật ký quản trị",
    description:
      "Tra cứu các thay đổi và thao tác quản trị trên toàn hệ thống.",
    icon: "shield",
    columns: [
      "Người thực hiện",
      "Thao tác",
      "Đối tượng",
      "Kết quả",
      "Thời điểm",
    ],
    statusIndex: 3,
    rows: [
      [
        "Admin LawScan",
        "Cập nhật nguồn",
        "Luật Thương mại 2005",
        "Thành công",
        "09/10/2026 10:32",
      ],
      [
        "Admin LawScan",
        "Khóa tài khoản",
        "ha@horizon.vn",
        "Thành công",
        "09/10/2026 09:48",
      ],
      [
        "Hệ thống",
        "Xử lý hợp đồng",
        "AI-241009-126",
        "Thất bại",
        "09/10/2026 09:57",
      ],
      [
        "Admin LawScan",
        "Xác minh tổ chức",
        "An Phát Logistics",
        "Đang chờ",
        "08/10/2026",
      ],
    ],
  },
} as const;

