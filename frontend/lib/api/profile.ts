import { apiRequest } from './client';
import type { Profile, ProfileUpdate } from '@/types/profile';

export const profileApi = {
  get: () => apiRequest<Profile>({ url: '/profile' }),
  update: (input: ProfileUpdate) => apiRequest<Profile>({ url: '/profile', method: 'PATCH', data: input }),
  avatar: (file: File) => {
    const data = new FormData(); data.set('avatar', file);
    return apiRequest<Profile>({ url: '/profile/avatar', method: 'POST', data, timeout: 30_000 });
  },
  removeAvatar: () => apiRequest<Profile>({ url: '/profile/avatar', method: 'DELETE' }),
  changePassword: (input: { currentPassword: string; newPassword: string }) => apiRequest<{ changed: boolean }>({ url: '/profile/password', method: 'POST', data: input, timeout: 30_000 }),
};
