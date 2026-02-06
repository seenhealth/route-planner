"use client";

import { useRouter } from "next/navigation";
import { CsvDropzone } from "@/components/upload/csv-dropzone";

export default function UploadPage() {
  const router = useRouter();

  async function handleUpload(file: File) {
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error ?? "Upload failed");
    }

    router.push("/routes");
  }

  return (
    <div className="p-6 space-y-6 max-w-2xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Upload Manifest</h2>
        <p className="text-muted-foreground">
          Upload a transport manifest CSV to generate optimized routes.
        </p>
      </div>

      <CsvDropzone onUpload={handleUpload} />

      <div className="text-sm text-muted-foreground space-y-1">
        <p className="font-medium">Expected CSV columns:</p>
        <p>
          Job Date, ID Number, Cust Name, Phone, Booking Purpose, PU Addr, PU Unit,
          Pickup City, PU State, Pick Zip, DO Addr, DO Unit, Drop City, DO State,
          Drop Zip, Assistive Device, N Total WheelChairs, N Total Passengers,
          Sch PU, Apt Time, Notes, Job ID
        </p>
      </div>
    </div>
  );
}
