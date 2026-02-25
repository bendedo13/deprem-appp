import * as SecureStore from 'expo-secure-store';
import * as AuthService from '../authService';
import { api } from '../api';

jest.mock('expo-secure-store');
jest.mock('../api');

describe('AuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('hasToken', () => {
    it('should return true when token exists', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue('valid-token');

      const result = await AuthService.hasToken();

      expect(result).toBe(true);
    });

    it('should return false when token does not exist', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);

      const result = await AuthService.hasToken();

      expect(result).toBe(false);
    });
  });

  describe('register', () => {
    it('should register new user and store token', async () => {
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        fcm_token: null,
        latitude: null,
        longitude: null,
        created_at: '2026-02-25T00:00:00Z',
      };

      const mockResponse = {
        data: {
          access_token: 'test-token',
          token_type: 'bearer',
          user: mockUser,
        },
      };

      (api.post as jest.Mock).mockResolvedValue(mockResponse);
      (SecureStore.setItemAsync as jest.Mock).mockResolvedValue(undefined);

      const result = await AuthService.register('test@example.com', 'password123');

      expect(result).toEqual(mockUser);
      expect(SecureStore.setItemAsync).toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('should login user and store token', async () => {
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        fcm_token: null,
        latitude: null,
        longitude: null,
        created_at: '2026-02-25T00:00:00Z',
      };

      const mockResponse = {
        data: {
          access_token: 'test-token',
          token_type: 'bearer',
          user: mockUser,
        },
      };

      (api.post as jest.Mock).mockResolvedValue(mockResponse);
      (SecureStore.setItemAsync as jest.Mock).mockResolvedValue(undefined);

      const result = await AuthService.login('test@example.com', 'password123');

      expect(result).toEqual(mockUser);
    });
  });

  describe('logout', () => {
    it('should delete token from storage', async () => {
      (SecureStore.deleteItemAsync as jest.Mock).mockResolvedValue(undefined);

      await AuthService.logout();

      expect(SecureStore.deleteItemAsync).toHaveBeenCalled();
    });
  });

  describe('getMe', () => {
    it('should fetch current user profile', async () => {
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        fcm_token: 'fcm-token-123',
        latitude: 40.7128,
        longitude: -74.006,
        created_at: '2026-02-25T00:00:00Z',
      };

      (api.get as jest.Mock).mockResolvedValue({ data: mockUser });

      const result = await AuthService.getMe();

      expect(result).toEqual(mockUser);
    });
  });

  describe('iAmSafe', () => {
    it('should send safe status to emergency contacts', async () => {
      const mockResponse = {
        data: {
          status: 'success',
          notified_contacts: 3,
        },
      };

      (api.post as jest.Mock).mockResolvedValue(mockResponse);

      const result = await AuthService.iAmSafe();

      expect(result).toEqual(mockResponse.data);
    });
  });
});
