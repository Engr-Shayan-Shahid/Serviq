import { InMemory, Printer, Align, Style, Cut } from "escpos-buffer";

export type PrintOrderItem = {
  name: string;
  quantity: number;
  specialNote?: string | null;
};

export type PrintOrderPayload = {
  restaurantName: string;
  tableNumber: string;
  orderId: string;
  createdAt: string;
  items: PrintOrderItem[];
};

/**
 * Formats a kitchen ticket with ESC/POS commands into a raw Buffer.
 *
 * Frontend note: the returned buffer should be sent to the thermal printer
 * via WebUSB (navigator.usb) or a local print agent/server on the kitchen PC.
 * This API only builds the bytes — it does not talk to hardware.
 */
export async function buildEscPosReceipt(
  payload: PrintOrderPayload
): Promise<Buffer> {
  const connection = new InMemory();
  const printer = await Printer.CONNECT("TM-T20", connection);

  const shortId = payload.orderId.slice(0, 8).toUpperCase();
  const when = new Date(payload.createdAt);
  const timestamp = Number.isNaN(when.getTime())
    ? payload.createdAt
    : when.toLocaleString();

  await printer.writeln(payload.restaurantName, Style.Bold | Style.DoubleHeight, Align.Center);
  await printer.writeln("KITCHEN TICKET", Style.Bold, Align.Center);
  await printer.writeln("--------------------------------");
  await printer.writeln(`TABLE: ${payload.tableNumber}`, Style.Bold | Style.DoubleWidth);
  await printer.writeln(`ORDER: ${shortId}`, Style.Bold);
  await printer.writeln(`TIME:  ${timestamp}`);
  await printer.writeln("--------------------------------");

  for (const item of payload.items) {
    await printer.writeln(`${item.quantity}x ${item.name}`, Style.Bold);
    if (item.specialNote?.trim()) {
      await printer.writeln(`   NOTE: ${item.specialNote.trim()}`);
    }
  }

  await printer.writeln("--------------------------------");
  await printer.writeln("*** NEW ORDER ***", Style.Bold, Align.Center);
  await printer.feed(2);
  await printer.cutter(Cut.Partial);
  await printer.close();

  return connection.buffer();
}
