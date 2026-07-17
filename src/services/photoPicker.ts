import { Alert, Linking } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { persistAttachment } from './attachments';
import { captureError } from './monitoring';

export type PhotoSource = 'camera' | 'gallery';

/**
 * Request the permission for the given source. When the user has permanently
 * denied it (canAskAgain === false) the OS dialog will not reappear, so offer
 * a direct path to the system settings instead of a dead-end alert.
 */
async function ensurePermission(source: PhotoSource): Promise<boolean> {
  const response =
    source === 'camera'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();

  if (response.granted) return true;

  const what = source === 'camera' ? 'Camera' : 'Photo library';
  if (response.canAskAgain) {
    Alert.alert(
      `${what} Access Needed`,
      `${what} permission is required to attach photos to your expenses.`
    );
  } else {
    Alert.alert(
      `${what} Access Denied`,
      `${what} access was turned off for QuickExpenses. You can enable it in Settings.`,
      [
        { text: 'Open Settings', onPress: () => Linking.openSettings() },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  }
  return false;
}

/**
 * Full pick flow: permission → camera/gallery → copy into persistent app
 * storage. Returns the persistent file URI, or null if the user cancelled
 * or permission was denied. Never throws; failures surface as alerts.
 */
export async function pickPhoto(source: PhotoSource): Promise<string | null> {
  try {
    if (!(await ensurePermission(source))) return null;

    const options: ImagePicker.ImagePickerOptions = {
      mediaTypes: ['images'],
      quality: 0.7,
      allowsEditing: false,
    };
    const result =
      source === 'camera'
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync(options);

    const asset = result.assets?.[0];
    if (result.canceled || !asset) return null;

    return await persistAttachment(asset.uri);
  } catch (e) {
    captureError(e, { op: 'pickPhoto', source });
    Alert.alert('Failed', 'Could not attach the photo. Please try again.');
    return null;
  }
}
