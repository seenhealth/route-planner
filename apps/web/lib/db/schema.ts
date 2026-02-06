import { pgTable, text, integer, index } from "drizzle-orm/pg-core";

export const manifests = pgTable("manifests", {
  id: text("id").primaryKey(),
  fileName: text("file_name").notNull(),
  jobDate: text("job_date").notNull(),
  uploadedAt: text("uploaded_at").notNull(),
  totalRows: integer("total_rows").notNull(),
  totalPassengers: integer("total_passengers").notNull(),
  status: text("status", { enum: ["processing", "ready", "error"] }).notNull(),
});

export const manifestRows = pgTable(
  "manifest_rows",
  {
    id: text("id").primaryKey(),
    manifestId: text("manifest_id")
      .notNull()
      .references(() => manifests.id, { onDelete: "cascade" }),
    jobDate: text("job_date").notNull(),
    idNumber: text("id_number").notNull(),
    custName: text("cust_name").notNull(),
    phone: text("phone"),
    bookingPurpose: text("booking_purpose"),
    puAddr: text("pu_addr"),
    puUnit: text("pu_unit"),
    pickupCity: text("pickup_city"),
    puState: text("pu_state"),
    pickZip: text("pick_zip"),
    doAddr: text("do_addr"),
    doUnit: text("do_unit"),
    dropCity: text("drop_city"),
    doState: text("do_state"),
    dropZip: text("drop_zip"),
    assistiveDevice: text("assistive_device"),
    nTotalWheelChairs: integer("n_total_wheelchairs"),
    nTotalPassengers: integer("n_total_passengers"),
    schPU: text("sch_pu"),
    aptTime: text("apt_time"),
    notes: text("notes"),
    jobID: text("job_id").notNull(),
    legType: text("leg_type", { enum: ["pickup", "dropoff"] }).notNull(),
  },
  (table) => [
    index("idx_manifest_rows_manifest_id").on(table.manifestId),
    index("idx_manifest_rows_leg_type").on(table.legType),
    index("idx_manifest_rows_id_number").on(table.idNumber),
  ]
);
