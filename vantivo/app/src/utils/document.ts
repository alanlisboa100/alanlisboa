import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";

export interface PickedPdf {
  uri: string;
  name: string;
  /** Raw base64 (no data URI prefix). */
  base64: string;
}

async function readBase64(uri: string): Promise<string> {
  return FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
}

/** Pick a single PDF and return its base64 content. */
export async function pickPdf(): Promise<PickedPdf | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: "application/pdf",
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (result.canceled) return null;
  const assets = result.assets ?? [];
  if (assets.length === 0) return null;
  const asset = assets[0];
  const base64 = await readBase64(asset.uri);
  return { uri: asset.uri, name: asset.name ?? "document.pdf", base64 };
}

/** Pick multiple PDFs (for merging). */
export async function pickPdfs(): Promise<PickedPdf[]> {
  const result = await DocumentPicker.getDocumentAsync({
    type: "application/pdf",
    copyToCacheDirectory: true,
    multiple: true,
  });
  if (result.canceled) return [];
  const assets = result.assets ?? [];
  const out: PickedPdf[] = [];
  for (const asset of assets) {
    const base64 = await readBase64(asset.uri);
    out.push({ uri: asset.uri, name: asset.name ?? "document.pdf", base64 });
  }
  return out;
}

/** Write a base64 PDF to a temp file and open the share sheet. */
export async function saveAndShareBase64Pdf(
  base64: string,
  fileName = "vantivo-merged.pdf",
): Promise<void> {
  const dir = FileSystem.cacheDirectory ?? FileSystem.documentDirectory ?? "";
  const fileUri = `${dir}${fileName}`;
  await FileSystem.writeAsStringAsync(fileUri, base64, {
    encoding: FileSystem.EncodingType.Base64,
  });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(fileUri, {
      mimeType: "application/pdf",
      dialogTitle: "Share PDF",
      UTI: "com.adobe.pdf",
    });
  }
}
