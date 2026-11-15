import type { ContractTemplate } from './templates';
import { normalizeStudioDocument, type StudioDocument, type StudioNode } from './studioDocument';
import { studioParagraph as p, studioTextNode as text } from './studioNodes';

export function buildLaborStudioTemplate(
  template: ContractTemplate,
  input: Record<string, string>,
  companyName: string,
): StudioDocument {
  const field = (key: string, format?: string): StudioNode => ({
    type: 'templateField',
    attrs: {
      key,
      value: input[key] ?? (key === 'companyName' ? companyName : ''),
      ...(format ? { format } : {}),
    },
  });
  const bold = (value: string): StudioNode => ({ ...text(value), marks: [{ type: 'bold' }] });
  const heading = (value: string, level = 2, align: string | null = null): StudioNode => ({
    type: 'heading',
    attrs: { level, textAlign: align },
    content: [text(value)],
  });
  const line = (label: string, key: string) => p([text(`${label}: `), field(key)]);
  const inline = (value: string): StudioNode[] =>
    value
      .split(/(\{\{\w+(?::(?:day|month|year))?\}\})/g)
      .filter(Boolean)
      .map((part) => {
        const match = /^\{\{(\w+)(?::(day|month|year))?\}\}$/.exec(part);
        return match ? field(match[1], match[2]) : text(part);
      });
  const date = (key: string): StudioNode[] => [
    field(key, 'day'),
    text(' tháng '),
    field(key, 'month'),
    text(' năm '),
    field(key, 'year'),
  ];
  const legalList: StudioNode = {
    type: 'bulletList',
    content: [
      'Căn cứ Bộ Luật Lao động số 45/2019/QH14 được Quốc hội khóa XIV nước Cộng hòa xã hội chủ nghĩa Việt Nam thông qua ngày 20/11/2019 và văn bản hướng dẫn thi hành;',
      'Căn cứ Luật Việc làm số 38/2013/QH13 được Quốc hội khóa XIII nước Cộng hòa xã hội chủ nghĩa Việt Nam thông qua ngày 20/11/2019;',
      'Căn cứ nhu cầu thực tế của các bên',
    ].map((value) => ({
      type: 'listItem',
      content: [p([{ ...text(value), marks: [{ type: 'italic' }] }])],
    })),
  };
  const signatureRows: StudioNode[][] = [
    [bold('NGƯỜI LAO ĐỘNG'), bold('BÊN SỬ DỤNG LAO ĐỘNG')],
    [
      { ...text('(Ký, ghi rõ họ tên)'), marks: [{ type: 'italic' }] },
      { ...text('(Ký, ghi rõ họ tên, chức vụ; đóng dấu nếu có)'), marks: [{ type: 'italic' }] },
    ],
    [],
    [],
    [],
    [field('partnerName'), field('representative')],
  ];
  const document: StudioDocument = {
    type: 'doc',
    content: [
      p([bold('CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM')], 'center'),
      p([bold('Độc lập - Tự do - Hạnh phúc')], 'center'),
      heading('HỢP ĐỒNG LAO ĐỘNG', 1, 'center'),
      p([text('Số: '), field('reference'), text('/HĐLĐ-'), field('companyShortName')], 'center'),
      legalList,
      p([
        text('Hôm nay, ngày '),
        ...date('signingDate'),
        text(', tại địa chỉ '),
        field('signingPlace'),
        text(', chúng tôi gồm:'),
      ]),
      p([bold('BÊN SỬ DỤNG LAO ĐỘNG:')]),
      line('Tên công ty', 'companyName'),
      line('Người đại diện', 'representative'),
      line('Chức vụ', 'representativePosition'),
      line('Địa chỉ', 'companyAddress'),
      line('Điện thoại', 'companyPhone'),
      line('Fax', 'companyFax'),
      line('Website', 'companyWebsite'),
      p([
        bold('(Trường hợp ủy quyền thì ghi rõ thông tin ủy quyền: '),
        text('Theo giấy ủy quyền số '),
        field('authorization'),
        text(' ngày '),
        field('authorizationDate'),
        text(' của Công ty '),
        field('companyName'),
        text(')'),
      ]),
      p([bold('BÊN NGƯỜI LAO ĐỘNG:')]),
      line('Tên người lao động', 'partnerName'),
      line('Quốc tịch', 'partnerNationality'),
      line('Ngày Sinh', 'partnerBirthDate'),
      line('Nơi thường trú', 'partnerAddress'),
      line('Địa chỉ liên hệ', 'partnerContactAddress'),
      line('Số CCCD', 'partnerIdentifier'),
      line('Nơi cấp', 'partnerIdIssuedPlace'),
      line('Ngày cấp', 'partnerIdIssuedDate'),
      line('Số điện thoại', 'partnerPhone'),
      p([
        bold(
          'Hai bên tự nguyện ký kết hợp đồng lao động và cam kết thực hiện đúng các điều khoản sau:',
        ),
      ]),
      ...template.sections.flatMap((section, index) => [
        heading(`ĐIỀU ${index + 1}. ${section.title.toLocaleUpperCase('vi-VN')}`),
        ...section.body.split('\n').map((value) => p(inline(value))),
      ]),
      {
        type: 'table',
        attrs: { layout: 'signature' },
        content: signatureRows.map((row) => ({
          type: 'tableRow',
          content: [0, 1].map((index) => ({
            type: 'tableCell',
            content: [p(row[index] ? [row[index]] : [], 'center')],
          })),
        })),
      },
    ],
  };
  return normalizeStudioDocument(document, template);
}
