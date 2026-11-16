import directory from '../../data/vietnam-addresses.json';

export const vietnamAddressDirectory = directory;

export type VietnamAddressInput = { provinceCode: string; wardCode: string; addressLine: string };

export function findVietnamAddress(provinceCode: string, wardCode: string) {
  const province = directory.provinces.find(item => item.code === provinceCode);
  const ward = province?.wards.find(item => item.code === wardCode);
  return province && ward ? { province, ward } : null;
}

export function normalizeVietnamAddress(input: VietnamAddressInput) {
  const selected = findVietnamAddress(input.provinceCode, input.wardCode);
  if (!selected) throw new Error('Invalid province/ward combination');
  const { province, ward } = selected;
  const addressLine = input.addressLine.trim();
  return {
    address: `${addressLine}, ${ward.name}, ${province.name}`,
    addressDetails: { provinceCode: province.code, provinceName: province.name, wardCode: ward.code, wardName: ward.name, addressLine },
  };
}
