import * as ImagePicker from "expo-image-picker";

export interface PickedImage {
  uri: string;
  dataUri: string;
}

function toDataUri(base64: string, mimeType?: string): string {
  const mime = mimeType || "image/jpeg";
  return `data:${mime};base64,${base64}`;
}

async function fromResult(
  result: ImagePicker.ImagePickerResult,
): Promise<PickedImage | null> {
  if (result.canceled || !result.assets?.length) return null;
  const asset = result.assets[0];
  if (!asset.base64) return null;
  return {
    uri: asset.uri,
    dataUri: toDataUri(asset.base64, asset.mimeType),
  };
}

/** Pick an image from the library, returning a display uri + base64 data uri. */
export async function pickFromLibrary(): Promise<PickedImage | null> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) {
    throw new Error("Photo library permission is required.");
  }
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    quality: 0.85,
    base64: true,
  });
  return fromResult(result);
}

/** Capture a photo with the camera. */
export async function captureFromCamera(): Promise<PickedImage | null> {
  const perm = await ImagePicker.requestCameraPermissionsAsync();
  if (!perm.granted) {
    throw new Error("Camera permission is required.");
  }
  const result = await ImagePicker.launchCameraAsync({
    quality: 0.85,
    base64: true,
  });
  return fromResult(result);
}
