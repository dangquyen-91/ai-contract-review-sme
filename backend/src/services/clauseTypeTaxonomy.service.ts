import { ClauseCategory, ClauseTypeTaxonomyModel } from '../models/clauseTypeTaxonomy.model';

interface DefaultTaxonomyEntry {
  code: ClauseCategory;
  name: string;
  description: string;
}

const DEFAULT_TAXONOMY: DefaultTaxonomyEntry[] = [
  {
    code: 'subject_scope',
    name: 'Đối tượng và phạm vi',
    description: 'Hàng hoá, dịch vụ, công việc, tài sản hoặc người được bảo hiểm mà hợp đồng hướng tới; số lượng, quy cách, địa điểm',
  },
  {
    code: 'payment',
    name: 'Giá và thanh toán',
    description: 'Giá trị hợp đồng, giá thuê, phí bảo hiểm, phương thức, tiến độ và thời hạn thanh toán',
  },
  {
    code: 'deposit',
    name: 'Đặt cọc',
    description: 'Số tiền đặt cọc, ký quỹ, điều kiện hoàn trả hoặc mất cọc',
  },
  {
    code: 'term',
    name: 'Thời hạn hợp đồng',
    description: 'Thời điểm có hiệu lực, thời hạn thực hiện hoặc thời hạn thuê, thời hạn bảo hiểm',
  },
  {
    code: 'delivery_handover',
    name: 'Giao nhận và bàn giao',
    description: 'Thời gian, địa điểm, điều kiện giao hàng, nghiệm thu hoặc bàn giao tài sản, nhà ở',
  },
  {
    code: 'service_level',
    name: 'Chất lượng dịch vụ',
    description: 'Tiêu chuẩn chất lượng, cam kết mức dịch vụ (SLA), thời gian phản hồi và khắc phục sự cố',
  },
  {
    code: 'warranty',
    name: 'Bảo hành',
    description: 'Cam kết bảo hành hàng hoá, dịch vụ, nhà ở; thời hạn và phạm vi bảo hành',
  },
  {
    code: 'property_legal_status',
    name: 'Tình trạng pháp lý tài sản',
    description: 'Giấy tờ sở hữu, quyền cho thuê hoặc bán, tình trạng thế chấp, tranh chấp của tài sản, nhà ở',
  },
  {
    code: 'ownership_transfer',
    name: 'Chuyển quyền sở hữu',
    description: 'Thời điểm chuyển quyền sở hữu, trách nhiệm và thời hạn làm thủ tục cấp Giấy chứng nhận',
  },
  {
    code: 'maintenance_repair',
    name: 'Sửa chữa và bảo trì',
    description: 'Trách nhiệm sửa chữa, bảo trì, cải tạo tài sản thuê và chi phí phát sinh',
  },
  {
    code: 'sublease_transfer',
    name: 'Cho thuê lại và chuyển nhượng',
    description: 'Quyền cho thuê lại, chuyển nhượng hợp đồng hoặc chuyển giao quyền, nghĩa vụ cho bên thứ ba',
  },
  {
    code: 'probation',
    name: 'Thử việc',
    description: 'Thời gian thử việc, tiền lương thử việc và việc kết thúc thử việc',
  },
  {
    code: 'wages',
    name: 'Tiền lương và phúc lợi',
    description: 'Mức lương, phụ cấp, thưởng, hình thức và kỳ hạn trả lương, chế độ nâng lương',
  },
  {
    code: 'working_time',
    name: 'Thời giờ làm việc và nghỉ ngơi',
    description: 'Giờ làm việc, ca làm, làm thêm giờ, ngày nghỉ, nghỉ phép năm',
  },
  {
    code: 'social_insurance',
    name: 'Bảo hiểm xã hội',
    description: 'Bảo hiểm xã hội, bảo hiểm y tế, bảo hiểm thất nghiệp cho người lao động',
  },
  {
    code: 'insurance_benefits',
    name: 'Quyền lợi bảo hiểm',
    description: 'Sự kiện bảo hiểm, số tiền bảo hiểm, các quyền lợi được chi trả',
  },
  {
    code: 'insurance_exclusions',
    name: 'Điều khoản loại trừ',
    description: 'Các trường hợp doanh nghiệp bảo hiểm không chi trả quyền lợi',
  },
  {
    code: 'claims',
    name: 'Yêu cầu và giải quyết quyền lợi',
    description: 'Thủ tục, hồ sơ, thời hạn yêu cầu và chi trả quyền lợi bảo hiểm',
  },
  {
    code: 'surrender_value',
    name: 'Giá trị hoàn lại',
    description: 'Số tiền nhận lại khi huỷ hợp đồng bảo hiểm trước hạn, thời gian cân nhắc',
  },
  {
    code: 'confidentiality',
    name: 'Bảo mật thông tin',
    description: 'Nghĩa vụ bảo mật thông tin giữa các bên',
  },
  {
    code: 'data_protection',
    name: 'Bảo vệ dữ liệu cá nhân',
    description: 'Thu thập, xử lý, lưu trữ và bảo vệ dữ liệu cá nhân, dữ liệu khách hàng',
  },
  {
    code: 'intellectual_property',
    name: 'Sở hữu trí tuệ',
    description: 'Quyền sở hữu trí tuệ đối với sản phẩm, phần mềm, kết quả công việc',
  },
  {
    code: 'penalty',
    name: 'Phạt vi phạm',
    description: 'Mức phạt khi một bên vi phạm nghĩa vụ hợp đồng',
  },
  {
    code: 'indemnity',
    name: 'Bồi thường thiệt hại',
    description: 'Trách nhiệm bồi thường thiệt hại khi vi phạm hợp đồng',
  },
  {
    code: 'liability',
    name: 'Giới hạn trách nhiệm',
    description: 'Giới hạn hoặc loại trừ trách nhiệm pháp lý của các bên',
  },
  {
    code: 'renewal',
    name: 'Gia hạn hợp đồng',
    description: 'Điều kiện gia hạn hoặc tự động gia hạn hợp đồng',
  },
  {
    code: 'termination',
    name: 'Chấm dứt hợp đồng',
    description: 'Điều kiện, thủ tục đơn phương chấm dứt hoặc huỷ bỏ hợp đồng và hậu quả',
  },
  {
    code: 'force_majeure',
    name: 'Bất khả kháng',
    description: 'Sự kiện bất khả kháng và hướng xử lý',
  },
  {
    code: 'dispute_resolution',
    name: 'Giải quyết tranh chấp',
    description: 'Phương thức giải quyết tranh chấp (thương lượng, hoà giải, trọng tài, toà án)',
  },
  {
    code: 'other',
    name: 'Khác',
    description: 'Tên hợp đồng, phần mở đầu, thông tin các bên và các nội dung không thuộc nhóm nào ở trên',
  },
];

export async function seedDefaultClauseTaxonomy(): Promise<void> {
  await Promise.all(
    DEFAULT_TAXONOMY.map((entry) =>
      ClauseTypeTaxonomyModel.findOneAndUpdate({ code: entry.code }, { $set: entry }, { upsert: true }),
    ),
  );
}

export async function getTaxonomyIdByCode(): Promise<Map<string, string>> {
  const all = await ClauseTypeTaxonomyModel.find();
  return new Map(all.map((t) => [t.code, t._id.toString()]));
}

export async function getTaxonomyByCodes(codes: readonly string[]) {
  const entries = await ClauseTypeTaxonomyModel.find({ code: { $in: codes } });
  const byCode = new Map(entries.map((entry) => [entry.code as string, entry]));
  return codes.flatMap((code) => byCode.get(code) ?? []);
}
