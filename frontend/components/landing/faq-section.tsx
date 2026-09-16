const questions = [
  { question: "Hỗ trợ loại hợp đồng nào?", answer: "Mua bán hàng hóa và cung cấp dịch vụ thông thường bằng tiếng Việt." },
  { question: "Có đọc được PDF scan không?", answer: "PDF scan cần được nhận dạng ký tự (OCR) để trích xuất văn bản. Khả năng đọc phụ thuộc chất lượng bản quét; bạn cần kiểm tra lại nội dung được trích xuất." },
  { question: "Kết quả AI có cần kiểm tra lại?", answer: "Có. AI hỗ trợ rà soát sơ bộ, giải thích và gợi ý chỉnh sửa. Bạn cần kiểm tra điều khoản, nguồn tham chiếu và tham khảo chuyên gia pháp lý khi cần trước khi quyết định." },
  { question: "Hạn mức được chia sẻ thế nào?", answer: "Hạn mức dự kiến được dùng chung cho các thành viên trong doanh nghiệp theo gói dịch vụ. Chi tiết hạn mức sẽ được công bố khi mở đăng ký." },
];

export function FAQSection() {
  return <section id="cau-hoi" className="faq-section ls-container grid gap-10" aria-labelledby="faq-heading"><div><p className="section-eyebrow">08 / Câu hỏi thường gặp</p><h2 id="faq-heading">Một vài điều<br />bạn muốn biết.</h2><p className="section-description">Những câu hỏi thường gặp về<br />cách LawScan hoạt động.</p></div><div className="faq-list">{questions.map((item, index) => <details key={item.question} name="lawscan-faq" open={index === 0}><summary>{item.question}<span aria-hidden="true" /></summary><p>{item.answer}</p></details>)}</div></section>;
}
