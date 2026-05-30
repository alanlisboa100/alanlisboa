import * as FileSystem from "expo-file-system";
import * as ImagePicker from "expo-image-picker";
import * as MediaLibrary from "expo-media-library";

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


/** Download a remote image and save it to the device gallery. */
export async function saveImageToGallery(url: string): Promise<void> {
  const perm = await MediaLibrary.requestPermissionsAsync();
  if (!perm.granted) {
    throw new Error("Permission to save to the gallery is required.");
  }

  // If it's already a data URI, write it directly; otherwise download it.
  const dir = FileSystem.cacheDirectory ?? FileSystem.documentDirectory ?? "";
  const target = `${dir}vantivo-${Date.now()}.png`;

  let localUri = url;
  if (url.startsWith("data:")) {
    const base64 = url.split(",").pop() ?? "";
    await FileSystem.writeAsStringAsync(target, base64, {
      encoding: FileSystem.EncodingType.Base64,
    });
    localUri = target;
  } else {
    const res = await FileSystem.downloadAsync(url, target);
    localUri = res.uri;
  }

  await MediaLibrary.saveToLibraryAsync(localUri);
}
