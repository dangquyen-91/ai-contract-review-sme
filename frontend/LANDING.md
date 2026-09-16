# Landing page LawScan

## Chạy và kiểm tra

```powershell
cd frontend
npm ci
npm run dev
```

Mở http://localhost:3000/. Trang không cần kết nối backend.

```powershell
npm run lint
npx tsc --noEmit
npm run build
npm run start
```

Font Geist được tải bởi `next/font/google` khi build. Máy build cần kết nối được Google Fonts. Khi chạy production, font được phục vụ từ ứng dụng.

## Cấu trúc và trách nhiệm

```text
app/
  layout.tsx                 # Font, ngôn ngữ và metadata
  (marketing)/
    layout.tsx               # Header/Footer dành riêng cho marketing
    page.tsx                 # Ghép các section, route /
    marketing.css            # Style giới hạn trong .lawscan
components/
  layout/                    # Header, MobileMenu, Footer
  landing/                   # Các section và ContractDemo
  ui/                        # Brand và bộ icon SVG nhỏ
public/lawscan.svg            # Biểu tượng trình duyệt
```

- `HeroSection`: tiêu đề, CTA và `ContractDemo` với ba tình huống điều khoản.
- `HowItWorksSection`: ba bước tải hợp đồng, xem phân tích và kiểm tra báo cáo.
- `FeaturesSection`: khả năng đọc hiểu, nhận diện rủi ro và xem căn cứ.
- `AnalysisWalkthrough`: minh họa năm bước từ trích xuất nội dung đến gợi ý chỉnh sửa; màn hình bên trái đổi theo bước đang đọc hoặc được chọn.
- `CollaborationSection`: minh họa quá trình phối hợp rà soát.
- `UseCasesSection`: mô tả giá trị cho chủ doanh nghiệp, người quản lý và nhân sự pháp chế.
- `ReportPreviewSection`: bản báo cáo mẫu với bốn tab tổng quan, rủi ro, nguồn và đề xuất.
- `PricingSection` và `PricingPlans`: ba gói có giá minh họa, chuyển chu kỳ tháng/năm và hộp thông tin chi tiết.
- `FAQSection`: câu hỏi thường gặp bằng HTML `details`.
- `CTASection`: dẫn về bản minh họa.

Nội dung tĩnh là Server Components. `MobileMenu` và `ContractDemo` dùng state phía trình duyệt. `LandingMotion` là component client không render HTML, dùng IntersectionObserver và Web Animations API cho hiệu ứng xuất hiện một lần khi cuộn. Trang không gọi API, không thêm global store hoặc thay đổi cấu hình các dependency hiện có.

## Hiệu ứng và footer

- Hero chạy một lượt quét khi xuất hiện trong màn hình: quét giấy, đánh dấu điều khoản, vẽ đường nối rồi hiện các thẻ giải thích. Chuyển ví dụ sẽ chạy lại chuỗi này.
- Minh họa hero tự nảy nhẹ theo chu kỳ có khoảng nghỉ; tờ hợp đồng và các thẻ nhận định chuyển động lệch nhịp để tạo chiều sâu. Hiệu ứng tự chạy khi minh họa đi vào màn hình, không cần hover.
- Demo năm bước được trình bày như một màn hình rà soát thực tế, gồm văn bản gốc và kết quả đặt cạnh nhau. Người dùng chọn trực tiếp từng bước để xem điều khoản, lý do và nội dung cần xử lý.
- Hiệu ứng cuộn chỉ chạy một lần, không ẩn nội dung nếu JavaScript tắt hoặc chưa tải xong.
- Hover CTA dịch nhẹ mũi tên; card gói nổi nhẹ trên thiết bị có chuột. Focus bàn phím có viền rõ.
- `prefers-reduced-motion` tắt các animation; thay đổi tùy chọn trong lúc mở trang cũng hủy hiệu ứng cuộn đang chạy.
- Footer navy toàn chiều ngang, logo sáng, watermark lớn, thông tin mở rộng và nút về đầu trang.
- Hero dùng nền xanh lạnh toàn chiều ngang để tách khỏi body trắng. Pricing dùng card hiện đại, nhấn gói Cơ bản, hiển thị giá mẫu 0đ, 299.000đ và 799.000đ/tháng; trả năm hiển thị giá quy đổi và tổng tiền năm.
- Typography hero kết hợp Geist cho nội dung chính và Lora Italic cho cụm “bạn ký.”, kèm nét gạch mô phỏng chữ ký. Nhãn phía trên dùng Geist Mono.

## Thiết kế và phạm vi

- Giao diện dựng bằng HTML, Tailwind, CSS và SVG theo hai ảnh tham chiếu; không dùng ảnh chụp làm giao diện.
- Logo, giấy hợp đồng, đường chú thích và thẻ rà soát được dựng lại bằng CSS/SVG. Hiệu ứng giấy, cây trang trí và chữ viết tay là mô phỏng, không phải asset gốc.
- Các CTA marketing dẫn đến section thật; header có lối vào hai route `/dang-nhap` và `/dang-ky`.
- Giá, hạn mức, hồ sơ và kết quả phân tích đều là minh họa; chưa có thanh toán gói dịch vụ.
- Footer dùng thông tin phạm vi và dữ liệu mẫu thay cho liên kết chính sách chưa được triển khai.
- Header/Footer nằm trong route group marketing; không tự áp dụng lên dashboard sau này.
- Header có CTA tới `/dang-nhap` và `/dang-ky`. Hai form gửi tới Next route handler `/api/auth/[action]`, handler gọi backend từ `API_BASE_URL` và đặt access/refresh token trong cookie HttpOnly. Mặc định backend là `http://localhost:4000`.
- Hai trang tài khoản dùng chung panel thương hiệu riêng, gồm hợp đồng nhiều lớp, hai chú thích rà soát, nguồn tham chiếu và quy trình ba bước. Panel là HTML/CSS tĩnh và được ẩn trên mobile để ưu tiên form.
- Homepage có section `/\#pham-vi` công khai trạng thái bản mẫu, phạm vi hợp đồng và những phần backend chưa hoàn thiện. Nội dung không đưa ra cam kết lưu trữ hoặc bảo mật chưa được triển khai.
- Route `/bao-cao-mau` là báo cáo tĩnh bằng HTML/CSS, gồm tổng quan, ba điểm cần xem, nguồn và phạm vi. Nút “In hoặc lưu PDF” dùng hộp thoại in của trình duyệt; không cần API và không tải tài liệu người dùng.

## Kiểm tra giao diện

Đã kiểm tra Chromium ở các độ rộng 320, 375, 390, 600, 768, 1024, 1280 và 1536 px: không tràn ngang, kiểm tra đích của anchor, menu mobile, Escape và focus, CTA, ba ví dụ điều khoản, FAQ, quyền lợi gói và console. Đã kiểm tra nền tối ở lần triển khai đầu.

Sau khi bổ sung hiệu ứng: đã kiểm tra quét lại khi đổi ví dụ, hiệu ứng cuộn chỉ chạy một lần, đổi tùy chọn giảm chuyển động ngay khi animation đang chạy, tải trang với giảm chuyển động, nội dung vẫn đọc được khi tắt JavaScript, footer navy toàn chiều ngang, nút về đầu trang và thông tin mở rộng trong footer.

Ảnh kiểm tra cục bộ: `.next/lawscan-polished-hero.png`, `.next/lawscan-scanning.png`, `.next/lawscan-polished-footer.png`, `.next/lawscan-polished-footer-mobile.png` và `.next/lawscan-polished-mobile.png`. Đây là artifact tạm, không commit và có thể bị xóa ở lần build tiếp theo. Chưa kiểm tra Safari/Firefox hoặc tích hợp backend.
