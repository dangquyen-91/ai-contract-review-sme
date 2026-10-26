import type { ContractTemplate, TemplateField } from './templates';
import { LABOR_REFERENCE_SECTIONS } from './labor-reference-content';

const tokens: Record<string, string> = {
  companyName: 'TenCongTy',
  companyShortName: 'TenVietTatCongTy',
  companyTaxCode: 'MaSoThueCongTy',
  companyAddress: 'DiaChiCongTy',
  companyPhone: 'DienThoaiCongTy',
  companyFax: 'SoFaxCongTy',
  companyWebsite: 'Website',
  reference: 'SoHopDong',
  signingDate: 'NgayKy',
  signingPlace: 'Diachikyhopdong',
  representative: 'NguoiDaiDien',
  representativePosition: 'ChucVuNguoiDaiDien',
  authorization: 'Sogiayuyquyen',
  authorizationDate: 'Ngaykygiayuyquyen',
  partnerName: 'TenNguoiLaoDong',
  partnerNationality: 'QuocTichNguoiLaoDong',
  partnerBirthDate: 'NgaySinh',
  partnerGender: 'GioiTinh',
  partnerAddress: 'NoiThuongTru',
  partnerContactAddress: 'DiaChiLienHe',
  partnerIdentifier: 'SoCCCD',
  partnerIdIssuedDate: 'NgayCap',
  partnerIdIssuedPlace: 'NoiCap',
  partnerPhone: 'SoDienThoai',
  termType: 'LoaiHinhLaoDong',
  startDate: 'NgayBatDau',
  endDate: 'NgayKetThuc',
  jobTitle: 'ChucDanh',
  job: 'Motachitietcongviec',
  workplace: 'DiaDiemLamViec',
  workingTime: 'GioLamViec2_6',
  saturdayHours: 'GioLamViec7',
  sundayHours: 'GioLamViecCN',
  weeklyRest: 'NgayNghiHangTuan',
  salary: 'SoTienLuong',
  salaryInWords: 'SoTienBangChu',
  allowances: 'PhuCapVaKhoanBoSung',
  payment: 'HinhThucTraLuong',
  salaryPaymentDay: 'NgayChuyenLuong',
  salaryReview: 'CheDoNangLuong',
  insurance: 'BaoHiemBatBuoc',
  protection: 'TrangBiBaoHo',
  training: 'CheDoDaoTao',
  generalDirector: 'TongGiamDoc',
  effectiveDate: 'NgayHieuLuc',
};
const extra = (
  key: string,
  label: string,
  group: TemplateField['group'],
  kind: TemplateField['kind'] = 'text',
  required = false,
): TemplateField => ({ key, label, group, kind, required, token: tokens[key] });
export function buildLaborTemplate(base: ContractTemplate): ContractTemplate {
  const unusedFields = new Set([
    'companyTaxCode',
    'partnerGender',
    'workplace',
    'allowances',
    'salaryReview',
    'insurance',
    'protection',
    'training',
  ]);
  const fields: TemplateField[] = base.fields
    .filter((field) => !unusedFields.has(field.key))
    .map((field) => ({ ...field, token: tokens[field.key] }));
  Object.assign(
    fields.find((field) => field.key === 'reference')!,
    {
      placeholder: 'Ví dụ: 01/2026',
      help: 'Nhập phần số hợp đồng. Mẫu đã có phần /HĐLĐ- và tên viết tắt công ty.',
    },
  );
  Object.assign(
    fields.find((field) => field.key === 'authorization')!,
    { label: 'Số giấy ủy quyền (nếu có)', placeholder: 'Ví dụ: 05/2026/UQ' },
  );
  Object.assign(
    fields.find((field) => field.key === 'job')!,
    { label: 'Mô tả chi tiết công việc' },
  );
  fields.push(
    extra('companyName', 'Tên công ty', 'parties', 'text', true),
    extra('companyShortName', 'Tên viết tắt công ty', 'parties', 'text', true),
    extra('companyPhone', 'Điện thoại công ty', 'parties'),
    extra('companyFax', 'Fax công ty', 'parties'),
    extra('companyWebsite', 'Website công ty', 'parties'),
    extra('authorizationDate', 'Ngày giấy ủy quyền', 'parties', 'date'),
    extra('partnerNationality', 'Quốc tịch người lao động', 'parties'),
    extra('partnerContactAddress', 'Địa chỉ liên hệ', 'parties'),
    extra('partnerPhone', 'Điện thoại người lao động', 'parties'),
    extra('jobTitle', 'Vị trí / chức danh công việc', 'terms', 'text', true),
    extra('salaryInWords', 'Tiền lương bằng chữ', 'terms', 'text', true),
    extra('saturdayHours', 'Giờ làm việc thứ Bảy', 'terms'),
    extra('sundayHours', 'Giờ làm việc Chủ nhật', 'terms'),
    extra('weeklyRest', 'Ngày nghỉ hằng tuần', 'terms'),
    extra('generalDirector', 'Tổng giám đốc / người có quyền cho phép tiết lộ thông tin', 'terms'),
    extra('effectiveDate', 'Ngày hợp đồng có hiệu lực', 'terms', 'date', true),
  );
  const groups = base.formGroups!.map((group) => ({
    ...group,
    fields: group.fields.filter((key) => !unusedFields.has(key)),
  }));
  groups
    .find((group) => group.key === 'company')!
    .fields.push(
      'companyName',
      'companyShortName',
      'companyPhone',
      'companyFax',
      'companyWebsite',
      'authorizationDate',
    );
  groups
    .find((group) => group.key === 'employee')!
    .fields.push('partnerNationality', 'partnerContactAddress', 'partnerPhone');
  groups.find((group) => group.key === 'employment')!.fields.push('jobTitle');
  groups.find((group) => group.key === 'employment')!.fields.push('effectiveDate');
  groups.find((group) => group.key === 'salary')!.fields.push('salaryInWords');
  groups
    .find((group) => group.key === 'conditions')!
    .fields.push('saturdayHours', 'sundayHours', 'weeklyRest');
  groups.find((group) => group.key === 'conditions')!.fields.push('generalDirector');
  return {
    ...base,
    version: 4,
    fields,
    formGroups: groups,
    legalBasis:
      'Nội dung chép theo mẫu tham khảo: Bộ luật Lao động số 45/2019/QH14 và Luật Việc làm số 38/2013/QH13.',
    reviewNotes: [
      'Mẫu được chép theo ảnh bạn cung cấp, chưa xác nhận tính phù hợp pháp luật. Căn cứ Luật Việc làm 2013 và ngày thông qua trong mẫu cần được rà soát theo thời điểm ký.',
      'Cần rà soát riêng các điều khoản về điều chuyển, chấm dứt, nghỉ phép, hoàn trả chi phí đào tạo, cấm cạnh tranh 02 năm và bồi thường 06 tháng lương trước khi sử dụng.',
    ],
    sections: LABOR_REFERENCE_SECTIONS,
  };
}
