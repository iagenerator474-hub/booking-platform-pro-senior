import * as dbRepository from "./booking.repository.db.js";
import * as jsonRepository from "./booking.repository.json.js";

const driver = process.env.STORAGE_DRIVER || "json";

if (!["json", "db"].includes(driver)) {
  throw new Error(
    `Invalid STORAGE_DRIVER "${driver}". Expected "json" or "db".`
  );
}

const repository = driver === "db" ? dbRepository : jsonRepository;

export const createBooking = repository.createBooking;
export const updateBookingStatusBySessionId =
  repository.updateBookingStatusBySessionId;
export const getAllBookings = repository.getAllBookings;

