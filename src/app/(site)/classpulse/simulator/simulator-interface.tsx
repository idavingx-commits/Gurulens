"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icons";
import { cn } from "@/lib/format";

interface Device {
  id: string;
  name: string;
  deviceCode: string;
}

interface Class {
  id: string;
  name: string;
}

interface StudentCard {
  id: string;
  cardNumber: string;
  studentId: string;
  studentName: string;
}

interface SimulatorInterfaceProps {
  devices: Device[];
  classes: Class[];
  studentCards: StudentCard[];
}

interface SimulationResult {
  success: boolean;
  message: string;
  cardNumber?: string;
  studentName?: string;
  status?: string;
  timestamp: Date;
}

export function SimulatorInterface({
  devices,
  classes,
  studentCards,
}: SimulatorInterfaceProps) {
  const [selectedDevice, setSelectedDevice] = useState<string>("");
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [selectedCard, setSelectedCard] = useState<string>("");
  const [manualCardNumber, setManualCardNumber] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [scanResults, setScanResults] = useState<SimulationResult[]>([]);

  const handleScan = async () => {
    if (!selectedDevice || !selectedClass) {
      setScanResults((prev) => [
        {
          success: false,
          message: "Please select a device and class",
          timestamp: new Date(),
        },
        ...prev,
      ]);
      return;
    }

    const cardNumber = selectedCard
      ? studentCards.find((c) => c.id === selectedCard)?.cardNumber
      : manualCardNumber;

    if (!cardNumber) {
      setScanResults((prev) => [
        {
          success: false,
          message: "Please select a card or enter a card number",
          timestamp: new Date(),
        },
        ...prev,
      ]);
      return;
    }

    setIsScanning(true);

    try {
      const res = await fetch("/api/classpulse/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deviceId: selectedDevice,
          cardNumber,
          classId: selectedClass,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Simulation failed");
      }

      const card = studentCards.find((c) => c.cardNumber === cardNumber);

      setScanResults((prev) => [
        {
          success: true,
          message: data.message || "Card scanned successfully",
          cardNumber,
          studentName: card?.studentName || data.studentName,
          status: data.status,
          timestamp: new Date(),
        },
        ...prev,
      ]);
    } catch (error) {
      setScanResults((prev) => [
        {
          success: false,
          message: error instanceof Error ? error.message : "Simulation failed",
          cardNumber,
          timestamp: new Date(),
        },
        ...prev,
      ]);
    } finally {
      setIsScanning(false);
    }
  };

  const handleBulkSimulation = async () => {
    if (!selectedDevice || !selectedClass) {
      setScanResults((prev) => [
        {
          success: false,
          message: "Please select a device and class",
          timestamp: new Date(),
        },
        ...prev,
      ]);
      return;
    }

    setIsScanning(true);

    try {
      const res = await fetch("/api/classpulse/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deviceId: selectedDevice,
          classId: selectedClass,
          bulk: true,
          presentRate: 85, // 85% present by default
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Bulk simulation failed");
      }

      setScanResults((prev) => [
        {
          success: true,
          message: `Bulk simulation complete: ${data.present} present, ${data.absent} absent`,
          timestamp: new Date(),
        },
        ...prev,
      ]);
    } catch (error) {
      setScanResults((prev) => [
        {
          success: false,
          message: error instanceof Error ? error.message : "Bulk simulation failed",
          timestamp: new Date(),
        },
        ...prev,
      ]);
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Controls */}
      <div className="space-y-6">
        {/* Device Selection */}
        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <h2 className="mb-4 font-semibold text-ink-900">1. Select Device</h2>
          {devices.length === 0 ? (
            <p className="text-sm text-ink-500">
              No active devices. Create one first.
            </p>
          ) : (
            <div className="space-y-2">
              {devices.map((device) => (
                <button
                  key={device.id}
                  onClick={() => setSelectedDevice(device.id)}
                  className={cn(
                    "flex w-full items-center justify-between rounded-lg border p-3 text-left transition-colors",
                    selectedDevice === device.id
                      ? "border-brand-500 bg-brand-50"
                      : "hover:bg-ink-50"
                  )}
                >
                  <div>
                    <p className="font-medium text-ink-900">{device.name}</p>
                    <p className="text-sm text-ink-500">{device.deviceCode}</p>
                  </div>
                  {selectedDevice === device.id && (
                    <Icon name="check" size={20} className="text-brand-500" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Class Selection */}
        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <h2 className="mb-4 font-semibold text-ink-900">2. Select Class</h2>
          {classes.length === 0 ? (
            <p className="text-sm text-ink-500">
              No active classes. Create one in ClassHub.
            </p>
          ) : (
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full rounded-lg border border-ink-200 p-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            >
              <option value="">Select a class...</option>
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.name}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Card Selection */}
        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <h2 className="mb-4 font-semibold text-ink-900">3. Select Card</h2>

          <div className="mb-4">
            <label className="mb-1 block text-sm text-ink-500">
              Choose a registered card:
            </label>
            <select
              value={selectedCard}
              onChange={(e) => {
                setSelectedCard(e.target.value);
                setManualCardNumber("");
              }}
              className="w-full rounded-lg border border-ink-200 p-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            >
              <option value="">Select a card...</option>
              {studentCards.map((card) => (
                <option key={card.id} value={card.id}>
                  {card.studentName} - {card.cardNumber}
                </option>
              ))}
            </select>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-ink-200" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-white px-2 text-sm text-ink-500">or</span>
            </div>
          </div>

          <div className="mt-4">
            <label className="mb-1 block text-sm text-ink-500">
              Enter card number manually:
            </label>
            <input
              type="text"
              value={manualCardNumber}
              onChange={(e) => {
                setManualCardNumber(e.target.value);
                setSelectedCard("");
              }}
              placeholder="e.g., CARD-12345678"
              className="w-full rounded-lg border border-ink-200 p-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button
            onClick={handleScan}
            disabled={isScanning}
            className="flex-1"
          >
            {isScanning ? (
              <Icon name="loader" size={16} className="animate-spin" />
            ) : (
              <Icon name="scan" size={16} />
            )}
            Simulate Scan
          </Button>
          <Button
            onClick={handleBulkSimulation}
            disabled={isScanning}
            variant="outline"
          >
            <Icon name="users" size={16} />
            Bulk Simulate
          </Button>
        </div>
      </div>

      {/* Results */}
      <div className="rounded-xl border bg-white shadow-sm">
        <div className="border-b p-4">
          <h2 className="flex items-center gap-2 font-semibold text-ink-900">
            <Icon name="activity" size={20} />
            Scan Results
          </h2>
        </div>
        <div className="max-h-[600px] overflow-y-auto p-4">
          {scanResults.length === 0 ? (
            <div className="py-8 text-center">
              <Icon name="scan" size={48} className="mx-auto mb-4 text-ink-300" />
              <p className="text-ink-500">
                Scan results will appear here
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {scanResults.map((result, idx) => (
                <div
                  key={idx}
                  className={cn(
                    "rounded-lg border p-3",
                    result.success
                      ? "border-success-200 bg-success-50"
                      : "border-danger-200 bg-danger-50"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={cn(
                        "mt-0.5 rounded-full p-1",
                        result.success ? "bg-success-500" : "bg-danger-500"
                      )}
                    >
                      <Icon
                        name={result.success ? "check" : "x"}
                        size={12}
                        className="text-white"
                      />
                    </div>
                    <div className="flex-1">
                      <p
                        className={cn(
                          "font-medium",
                          result.success ? "text-success-800" : "text-danger-800"
                        )}
                      >
                        {result.message}
                      </p>
                      {result.studentName && (
                        <p className="text-sm text-ink-600">
                          Student: {result.studentName}
                        </p>
                      )}
                      {result.cardNumber && (
                        <p className="text-sm text-ink-500">
                          Card: {result.cardNumber}
                        </p>
                      )}
                      <p className="mt-1 text-xs text-ink-400">
                        {result.timestamp.toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
