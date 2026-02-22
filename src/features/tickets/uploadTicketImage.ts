import type { Id } from "../../../convex/_generated/dataModel";
import {
  TICKET_IMAGE_MAX_BYTES,
  TICKET_IMAGE_MAX_MEGABYTES,
  type TicketImageAsset,
} from "./ticketImageSelection";

export async function uploadTicketImage(args: {
  image: TicketImageAsset;
  generateUploadUrl: (args: Record<string, never>) => Promise<string>;
}): Promise<Id<"_storage">> {
  const uploadUrl = await args.generateUploadUrl({});
  const imageResponse = await fetch(args.image.uri);
  const imageBlob = await imageResponse.blob();

  if (imageBlob.size > TICKET_IMAGE_MAX_BYTES) {
    throw new Error(`Image must be ${TICKET_IMAGE_MAX_MEGABYTES}MB or smaller.`);
  }

  const uploadResponse = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      "Content-Type": args.image.mimeType ?? "image/jpeg",
    },
    body: imageBlob,
  });

  if (!uploadResponse.ok) {
    throw new Error("Image upload failed. Please try again.");
  }

  const uploadBody = (await uploadResponse.json()) as { storageId: string };
  return uploadBody.storageId as Id<"_storage">;
}
