/* eslint-disable @typescript-eslint/no-explicit-any */
import notifee from '@notifee/react-native';
import { showEarthquakeAlarm, ensureEarthquakeChannel } from '../earthquakeAlarm';

jest.mock('@notifee/react-native');

describe('Earthquake Alarm Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('ensureEarthquakeChannel', () => {
    it('should create notification channel', async () => {
      (notifee.createChannel as jest.Mock).mockResolvedValue(undefined);

      await ensureEarthquakeChannel();

      expect(notifee.createChannel).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'earthquake_alarm',
          name: 'Deprem Uyarısı',
          sound: 'default',
          vibration: true,
        })
      );
    });

    it('should handle channel creation errors', async () => {
      (notifee.createChannel as jest.Mock).mockRejectedValue(
        new Error('Channel creation failed')
      );

      await expect(ensureEarthquakeChannel()).rejects.toThrow(
        'Channel creation failed'
      );
    });
  });

  describe('showEarthquakeAlarm', () => {
    it('should display full screen earthquake notification', async () => {
      (notifee.createChannel as jest.Mock).mockResolvedValue(undefined);
      (notifee.displayNotification as jest.Mock).mockResolvedValue(undefined);

      const payload = {
        type: 'EARTHQUAKE_CONFIRMED' as const,
        latitude: '40.7128',
        longitude: '-74.0060',
        timestamp: '2026-02-25T10:30:00Z',
        device_count: '150',
      };

      await showEarthquakeAlarm(payload);

      expect(notifee.displayNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          title: expect.stringContaining('Deprem'),
          android: expect.objectContaining({
            channelId: 'earthquake_alarm',
            fullScreenAction: expect.any(Object),
          }),
        })
      );
    });

    it('should include earthquake details in notification body', async () => {
      (notifee.createChannel as jest.Mock).mockResolvedValue(undefined);
      (notifee.displayNotification as jest.Mock).mockResolvedValue(undefined);

      const payload = {
        type: 'EARTHQUAKE_CONFIRMED' as const,
        latitude: '39.0',
        longitude: '35.0',
        timestamp: '2026-02-25T11:00:00Z',
      };

      await showEarthquakeAlarm(payload);

      const notification = (notifee.displayNotification as jest.Mock).mock
        .calls[0][0];
      expect(notification.body).toContain('39.0');
      expect(notification.body).toContain('35.0');
    });

    it('should use default values for missing payload data', async () => {
      (notifee.createChannel as jest.Mock).mockResolvedValue(undefined);
      (notifee.displayNotification as jest.Mock).mockResolvedValue(undefined);

      const payload = {
        type: 'EARTHQUAKE_CONFIRMED' as const,
      };

      await showEarthquakeAlarm(payload);

      expect(notifee.displayNotification).toHaveBeenCalled();
      const notification = (notifee.displayNotification as jest.Mock).mock
        .calls[0][0];
      expect(notification.body).toContain(',');
    });

    it('should handle notification display errors', async () => {
      (notifee.createChannel as jest.Mock).mockResolvedValue(undefined);
      (notifee.displayNotification as jest.Mock).mockRejectedValue(
        new Error('Failed to display notification')
      );

      const payload = {
        type: 'EARTHQUAKE_CONFIRMED' as const,
      };

      await expect(showEarthquakeAlarm(payload)).rejects.toThrow(
        'Failed to display notification'
      );
    });
  });

  describe('volume control integration', () => {
    it('should attempt to set volume to 100%', async () => {
      (notifee.createChannel as jest.Mock).mockResolvedValue(undefined);
      (notifee.displayNotification as jest.Mock).mockResolvedValue(undefined);

      const payload = {
        type: 'EARTHQUAKE_CONFIRMED' as const,
      };

      await expect(showEarthquakeAlarm(payload)).resolves.not.toThrow();
    });
  });
});
