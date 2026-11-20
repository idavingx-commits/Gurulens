/**
 * ClassPulse - Virtual device and attendance simulation system
 * Provides software simulation until physical hardware is available
 */

import { db } from "./db";
import { markAttendance } from "./classhub";
import type { AttendanceStatus } from "./classhub";

export type DeviceStatus = "active" | "inactive" | "simulated";
export type EventType = "check_in" | "check_out" | "heartbeat" | "error" | "simulation";

// Generate a unique device code
function generateDeviceCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "CP-"; // ClassPulse prefix
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Generate a student card number
function generateCardNumber(): string {
  const prefix = "GL"; // GuruLens prefix
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, "0");
  return `${prefix}${timestamp}${random}`;
}

// Create a virtual device
export async function createVirtualDevice(data: {
  organizationId?: string;
  classId?: string;
  name: string;
}) {
  const deviceCode = generateDeviceCode();

  return db.virtualDevice.create({
    data: {
      organizationId: data.organizationId,
      classId: data.classId,
      name: data.name,
      deviceCode,
      status: "simulated",
      firmwareVersion: "SIM-1.0.0",
      settings: JSON.stringify({
        simulationMode: true,
        checkInGracePeriod: 15, // minutes
        autoCheckout: false,
      }),
    },
  });
}

// Get device by code
export async function getDeviceByCode(deviceCode: string) {
  return db.virtualDevice.findUnique({
    where: { deviceCode },
  });
}

// Get device by ID
export async function getDeviceById(deviceId: string) {
  return db.virtualDevice.findUnique({
    where: { id: deviceId },
  });
}

// Get organization's devices
export async function getOrganizationDevices(organizationId: string) {
  return db.virtualDevice.findMany({
    where: { organizationId },
    orderBy: { createdAt: "desc" },
  });
}

// Update device status
export async function updateDeviceStatus(deviceId: string, status: DeviceStatus) {
  return db.virtualDevice.update({
    where: { id: deviceId },
    data: {
      status,
      lastSeenAt: new Date(),
    },
  });
}

// Update device settings
export async function updateDeviceSettings(
  deviceId: string,
  settings: Record<string, unknown>
) {
  const device = await db.virtualDevice.findUnique({ where: { id: deviceId } });
  if (!device) throw new Error("Device not found");

  const currentSettings = device.settings ? JSON.parse(device.settings) : {};
  const newSettings = { ...currentSettings, ...settings };

  return db.virtualDevice.update({
    where: { id: deviceId },
    data: { settings: JSON.stringify(newSettings) },
  });
}

// Delete device
export async function deleteDevice(deviceId: string) {
  return db.virtualDevice.delete({ where: { id: deviceId } });
}

// Issue student card
export async function issueStudentCard(studentId: string, expiresAt?: Date) {
  // Check if student already has an active card
  const existing = await db.studentCard.findUnique({
    where: { studentId },
  });

  if (existing) {
    if (existing.isActive) {
      throw new Error("Student already has an active card");
    }
    // Reactivate existing card
    return db.studentCard.update({
      where: { id: existing.id },
      data: {
        isActive: true,
        issuedAt: new Date(),
        expiresAt,
      },
    });
  }

  return db.studentCard.create({
    data: {
      studentId,
      cardNumber: generateCardNumber(),
      isActive: true,
      expiresAt,
    },
  });
}

// Get student card
export async function getStudentCard(studentId: string) {
  return db.studentCard.findUnique({
    where: { studentId },
  });
}

// Get card by number
export async function getCardByNumber(cardNumber: string) {
  return db.studentCard.findUnique({
    where: { cardNumber },
    include: {
      student: {
        select: { id: true, name: true, avatarKey: true, email: true },
      },
    },
  });
}

// Deactivate student card
export async function deactivateStudentCard(studentId: string) {
  return db.studentCard.update({
    where: { studentId },
    data: { isActive: false },
  });
}

// Record device event
export async function recordDeviceEvent(data: {
  deviceId: string;
  eventType: EventType;
  studentId?: string;
  cardNumber?: string;
  payload?: Record<string, unknown>;
  isSimulated?: boolean;
}) {
  const event = await db.deviceEvent.create({
    data: {
      deviceId: data.deviceId,
      eventType: data.eventType,
      studentId: data.studentId,
      cardNumber: data.cardNumber,
      payload: data.payload ? JSON.stringify(data.payload) : null,
      isSimulated: data.isSimulated ?? true,
    },
  });

  // Update device last seen
  await db.virtualDevice.update({
    where: { id: data.deviceId },
    data: { lastSeenAt: new Date() },
  });

  return event;
}

// Get device events
export async function getDeviceEvents(
  deviceId: string,
  options: { limit?: number; from?: Date; to?: Date; eventType?: EventType } = {}
) {
  const { limit = 50, from, to, eventType } = options;

  return db.deviceEvent.findMany({
    where: {
      deviceId,
      ...(from && { createdAt: { gte: from } }),
      ...(to && { createdAt: { lte: to } }),
      ...(eventType && { eventType }),
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

// Simulate card scan (check-in or check-out)
export async function simulateCardScan(data: {
  deviceId: string;
  cardNumber: string;
  sessionId?: string;
  eventType?: "check_in" | "check_out";
}) {
  // Get device
  const device = await db.virtualDevice.findUnique({ where: { id: data.deviceId } });
  if (!device) throw new Error("Device not found");

  // Get card
  const card = await db.studentCard.findUnique({
    where: { cardNumber: data.cardNumber },
    include: { student: true },
  });

  if (!card) throw new Error("Card not found");
  if (!card.isActive) throw new Error("Card is not active");
  if (card.expiresAt && card.expiresAt < new Date()) throw new Error("Card has expired");

  const eventType = data.eventType ?? "check_in";

  // Record the device event
  const event = await recordDeviceEvent({
    deviceId: data.deviceId,
    eventType,
    studentId: card.studentId,
    cardNumber: data.cardNumber,
    payload: {
      studentName: card.student.name,
      timestamp: new Date().toISOString(),
      simulatedScan: true,
    },
    isSimulated: true,
  });

  // If session provided, mark attendance
  if (data.sessionId) {
    const attendanceStatus: AttendanceStatus = eventType === "check_in" ? "present" : "present";
    await markAttendance({
      sessionId: data.sessionId,
      studentId: card.studentId,
      status: attendanceStatus,
      method: "device",
      deviceId: data.deviceId,
      notes: `Simulated ${eventType} via ClassPulse device ${device.deviceCode}`,
    });
  }

  return {
    event,
    student: {
      id: card.student.id,
      name: card.student.name,
    },
    message: `${eventType === "check_in" ? "Check-in" : "Check-out"} recorded for ${card.student.name}`,
  };
}

// Bulk simulate attendance for a session
export async function simulateBulkAttendance(data: {
  deviceId: string;
  sessionId: string;
  studentIds: string[];
  presentRate?: number; // 0-100, default 85
}) {
  const { deviceId, sessionId, studentIds, presentRate = 85 } = data;

  const device = await db.virtualDevice.findUnique({ where: { id: deviceId } });
  if (!device) throw new Error("Device not found");

  const results: Array<{
    studentId: string;
    status: AttendanceStatus;
    success: boolean;
    error?: string;
  }> = [];

  for (const studentId of studentIds) {
    try {
      // Randomly determine attendance based on presentRate
      const random = Math.random() * 100;
      let status: AttendanceStatus;
      if (random < presentRate * 0.9) {
        status = "present";
      } else if (random < presentRate) {
        status = "late";
      } else {
        status = "absent";
      }

      // Get student's card if they have one
      const card = await db.studentCard.findUnique({ where: { studentId } });

      // Record device event for present/late students
      if (status !== "absent" && card) {
        await recordDeviceEvent({
          deviceId,
          eventType: "check_in",
          studentId,
          cardNumber: card.cardNumber,
          payload: {
            simulatedBulk: true,
            status,
            timestamp: new Date().toISOString(),
          },
          isSimulated: true,
        });
      }

      // Mark attendance
      await markAttendance({
        sessionId,
        studentId,
        status,
        method: status === "absent" ? "manual" : "device",
        deviceId: status !== "absent" ? deviceId : undefined,
        notes: `Simulated via ClassPulse bulk attendance (${presentRate}% target rate)`,
      });

      results.push({ studentId, status, success: true });
    } catch (error) {
      results.push({
        studentId,
        status: "absent",
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return {
    total: studentIds.length,
    successful: results.filter((r) => r.success).length,
    present: results.filter((r) => r.status === "present").length,
    late: results.filter((r) => r.status === "late").length,
    absent: results.filter((r) => r.status === "absent").length,
    results,
  };
}

// Get device dashboard stats
export async function getDeviceDashboard(deviceId: string) {
  const device = await db.virtualDevice.findUnique({ where: { id: deviceId } });
  if (!device) throw new Error("Device not found");

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [totalEvents, todayEvents, checkIns, checkOuts] = await Promise.all([
    db.deviceEvent.count({ where: { deviceId } }),
    db.deviceEvent.count({
      where: { deviceId, createdAt: { gte: today, lt: tomorrow } },
    }),
    db.deviceEvent.count({
      where: { deviceId, eventType: "check_in", createdAt: { gte: today, lt: tomorrow } },
    }),
    db.deviceEvent.count({
      where: { deviceId, eventType: "check_out", createdAt: { gte: today, lt: tomorrow } },
    }),
  ]);

  return {
    device: {
      id: device.id,
      name: device.name,
      code: device.deviceCode,
      status: device.status,
      lastSeen: device.lastSeenAt,
      isSimulated: device.status === "simulated",
    },
    stats: {
      totalEvents,
      todayEvents,
      todayCheckIns: checkIns,
      todayCheckOuts: checkOuts,
    },
  };
}

// Get ClassPulse overview for organization
export async function getClassPulseOverview(organizationId: string) {
  const [devices, activeDevices, totalEvents, studentsWithCards] = await Promise.all([
    db.virtualDevice.count({ where: { organizationId } }),
    db.virtualDevice.count({ where: { organizationId, status: { not: "inactive" } } }),
    db.deviceEvent.count({
      where: { device: { organizationId } },
    }),
    db.studentCard.count({ where: { isActive: true } }),
  ]);

  // Recent events
  const recentEvents = await db.deviceEvent.findMany({
    where: { device: { organizationId } },
    include: {
      device: { select: { name: true, deviceCode: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  return {
    devices: {
      total: devices,
      active: activeDevices,
      inactive: devices - activeDevices,
    },
    totalEvents,
    studentsWithCards,
    recentEvents,
  };
}
