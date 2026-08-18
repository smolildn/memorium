import exifr from "exifr";

export interface PhotoExifFields {
  lat?: number;
  lng?: number;
  camera?: string;
  orientation?: number;
  exif?: {
    takenAt?: string;
    make?: string;
    model?: string;
    orientation?: number;
  };
}

/** Parse EXIF from an image buffer; falls back to `fallbackOccurredAt` when no capture date is found. */
export async function extractPhotoExif(
  buffer: Buffer,
  fallbackOccurredAt: string,
): Promise<{ occurredAt: string; fields: PhotoExifFields }> {
  const fields: PhotoExifFields = {};
  let occurredAt = fallbackOccurredAt;

  const exif = await exifr
    .parse(buffer, {
      gps: true,
      pick: [
        "DateTimeOriginal",
        "CreateDate",
        "ModifyDate",
        "latitude",
        "longitude",
        "Make",
        "Model",
        "Orientation",
      ],
    })
    .catch(() => null);

  if (!exif) {
    return { occurredAt, fields };
  }

  const taken = exif.DateTimeOriginal ?? exif.CreateDate ?? exif.ModifyDate;
  if (taken) {
    occurredAt =
      taken instanceof Date ? taken.toISOString() : new Date(String(taken)).toISOString();
  }

  if (typeof exif.latitude === "number" && typeof exif.longitude === "number") {
    fields.lat = exif.latitude;
    fields.lng = exif.longitude;
  }

  const camera = [exif.Make, exif.Model].filter(Boolean).join(" ").trim();
  if (camera) fields.camera = camera;

  if (typeof exif.Orientation === "number") {
    fields.orientation = exif.Orientation;
  }

  fields.exif = {
    takenAt: taken ? occurredAt : undefined,
    make: exif.Make,
    model: exif.Model,
    orientation: typeof exif.Orientation === "number" ? exif.Orientation : undefined,
  };

  return { occurredAt, fields };
}
