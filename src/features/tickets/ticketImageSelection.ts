import * as ImagePicker from "expo-image-picker";

export const TICKET_IMAGE_MAX_BYTES = 8 * 1024 * 1024;
export const TICKET_IMAGE_MAX_MEGABYTES = 8;

export type TicketImageAsset = ImagePicker.ImagePickerAsset;
export type TicketImageSource = "camera" | "library";

type TicketImageSelectionResult =
  | {
      kind: "success";
      asset: TicketImageAsset;
    }
  | {
      kind: "cancelled";
    }
  | {
      kind: "error";
      message: string;
    };

function getPermissionDeniedMessage(source: TicketImageSource): string {
  if (source === "camera") {
    return "Camera permission is required to take a photo.";
  }
  return "Photo permission is required to choose an image.";
}

function getSourceUnavailableMessage(source: TicketImageSource): string {
  if (source === "camera") {
    return "Camera is unavailable on this device. Choose from Library instead.";
  }
  return "Unable to open your photo library. Please try again.";
}

async function requestPermission(
  source: TicketImageSource,
): Promise<ImagePicker.PermissionResponse> {
  if (source === "camera") {
    return ImagePicker.requestCameraPermissionsAsync();
  }
  return ImagePicker.requestMediaLibraryPermissionsAsync();
}

async function launchPicker(source: TicketImageSource): Promise<ImagePicker.ImagePickerResult> {
  const options: ImagePicker.ImagePickerOptions = {
    mediaTypes: ["images"],
    // Keep system-native capture/picker flow and avoid platform crop UI.
    allowsEditing: false,
    quality: 0.8,
  };

  if (source === "camera") {
    return ImagePicker.launchCameraAsync(options);
  }
  return ImagePicker.launchImageLibraryAsync(options);
}

function validateImageSize(asset: TicketImageAsset): string | null {
  if (typeof asset.fileSize !== "number") {
    return null;
  }

  if (asset.fileSize > TICKET_IMAGE_MAX_BYTES) {
    return `Selected image must be ${TICKET_IMAGE_MAX_MEGABYTES}MB or smaller.`;
  }

  return null;
}

export async function selectTicketImage(
  source: TicketImageSource,
): Promise<TicketImageSelectionResult> {
  const permission = await requestPermission(source);
  if (!permission.granted) {
    return {
      kind: "error",
      message: getPermissionDeniedMessage(source),
    };
  }

  try {
    const result = await launchPicker(source);
    if (result.canceled) {
      return { kind: "cancelled" };
    }

    const asset = result.assets[0] ?? null;
    if (!asset) {
      return { kind: "cancelled" };
    }

    const sizeError = validateImageSize(asset);
    if (sizeError) {
      return {
        kind: "error",
        message: sizeError,
      };
    }

    return {
      kind: "success",
      asset,
    };
  } catch {
    return {
      kind: "error",
      message: getSourceUnavailableMessage(source),
    };
  }
}
