/**
 * ClassPulse Dashboard
 * Virtual attendance device management and simulation
 */

import { redirect } from "next/navigation";
import Link from "next/link";
import { getAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Button, LinkButton } from "@/components/ui/button";
import { Icon } from "@/components/ui/icons";
import { cn } from "@/lib/format";

export const metadata = {
  title: "ClassPulse | GuruLens",
  description: "Virtual attendance tracking and device simulation",
};

function StatCard({
  title,
  value,
  subtitle,
  icon,
}: {
  title: string;
  value: string | number;
  subtitle: string;
  icon: string;
}) {
  return (
    <div className="rounded-xl border bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-ink-500">{title}</span>
        <Icon name={icon} size={18} className="text-ink-400" />
      </div>
      <div className="mt-2 text-2xl font-bold text-ink-900">{value}</div>
      <p className="text-xs text-ink-400">{subtitle}</p>
    </div>
  );
}

function DeviceCard({ device }: { device: any }) {
  const isActive = device.status !== "inactive";
  const isSimulated = device.status === "simulated";

  return (
    <Link href={`/classpulse/devices/${device.id}`}>
      <div className="flex items-center justify-between rounded-lg border bg-white p-4 transition-colors hover:bg-ink-50">
        <div className="flex items-center gap-4">
          <div
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-lg",
              isActive
                ? isSimulated
                  ? "bg-blue-100"
                  : "bg-green-100"
                : "bg-gray-100"
            )}
          >
            <Icon
              name={isActive ? "wifi" : "wifi-off"}
              size={20}
              className={
                isActive
                  ? isSimulated
                    ? "text-blue-600"
                    : "text-green-600"
                  : "text-gray-500"
              }
            />
          </div>
          <div>
            <h3 className="font-medium text-ink-900">{device.name}</h3>
            <p className="text-sm text-ink-500">{device.deviceCode}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={cn(
              "rounded-full px-2 py-1 text-xs font-medium",
              isActive
                ? isSimulated
                  ? "bg-blue-100 text-blue-700"
                  : "bg-green-100 text-green-700"
                : "bg-gray-100 text-gray-600"
            )}
          >
            {isSimulated ? "Simulator" : device.status}
          </span>
          <Icon name="chevron-right" size={18} className="text-ink-400" />
        </div>
      </div>
    </Link>
  );
}

export default async function ClassPulsePage() {
  const auth = await getAuth();

  if (!auth) {
    redirect("/login?redirect=/classpulse");
  }

  if (auth.user.role !== "teacher" && auth.user.role !== "admin") {
    redirect("/?error=teacher_only");
  }

  // Get user's devices (from their organizations)
  const memberships = await db.organizationMember.findMany({
    where: { userId: auth.user.id, status: "active" },
    select: { organizationId: true },
  });

  const orgIds = memberships.map((m) => m.organizationId);

  const [devices, recentEvents, studentsWithCards] = await Promise.all([
    db.virtualDevice.findMany({
      where: { organizationId: { in: orgIds } },
      orderBy: { createdAt: "desc" },
    }),
    db.deviceEvent.findMany({
      where: { device: { organizationId: { in: orgIds } } },
      include: { device: { select: { name: true, deviceCode: true } } },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    db.studentCard.count({ where: { isActive: true } }),
  ]);

  const activeDevices = devices.filter((d) => d.status !== "inactive").length;
  const todayEvents = recentEvents.filter(
    (e) => new Date(e.createdAt).toDateString() === new Date().toDateString()
  ).length;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="flex items-center gap-3 text-3xl font-bold text-ink-900">
            <Icon name="smartphone" size={32} className="text-brand-500" />
            ClassPulse
          </h1>
          <p className="text-ink-500">Virtual attendance tracking and device simulation</p>
        </div>
        <div className="flex gap-2">
          <LinkButton href="/classpulse/simulator" variant="outline">
            <Icon name="scan" size={16} />
            Open Simulator
          </LinkButton>
          <LinkButton href="/classpulse/devices/create">
            <Icon name="plus" size={16} />
            Add Device
          </LinkButton>
        </div>
      </div>

      {/* Simulation Notice */}
      <div className="mb-8 rounded-lg border border-amber-200 bg-amber-50 p-4">
        <div className="flex items-start gap-3">
          <Icon name="alert-triangle" size={20} className="mt-0.5 text-amber-600" />
          <div>
            <h3 className="font-semibold text-amber-800">Simulation Mode</h3>
            <p className="text-sm text-amber-700">
              ClassPulse hardware is not yet available. All attendance events are simulated
              for testing and demonstration purposes. Simulated data is clearly marked
              and should not be treated as actual attendance records.
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="mb-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Devices"
          value={devices.length}
          subtitle={`${activeDevices} active, ${devices.length - activeDevices} inactive`}
          icon="smartphone"
        />
        <StatCard
          title="Today's Events"
          value={todayEvents}
          subtitle="Simulated scans today"
          icon="activity"
        />
        <StatCard
          title="Student Cards"
          value={studentsWithCards}
          subtitle="Active virtual cards"
          icon="credit-card"
        />
        <StatCard
          title="System Status"
          value="Online"
          subtitle="Simulation ready"
          icon="wifi"
        />
      </div>

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Devices List */}
        <div className="lg:col-span-2">
          <div className="rounded-xl border bg-white shadow-sm">
            <div className="border-b p-4">
              <h2 className="text-lg font-semibold text-ink-900">Virtual Devices</h2>
              <p className="text-sm text-ink-500">Manage your ClassPulse virtual devices</p>
            </div>
            <div className="p-4">
              {devices.length === 0 ? (
                <div className="py-8 text-center">
                  <Icon name="smartphone" size={48} className="mx-auto mb-4 text-ink-300" />
                  <p className="mb-4 text-ink-500">No virtual devices registered yet.</p>
                  <LinkButton href="/classpulse/devices/create">Add Your First Device</LinkButton>
                </div>
              ) : (
                <div className="space-y-3">
                  {devices.map((device) => (
                    <DeviceCard key={device.id} device={device} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Recent Events */}
        <div>
          <div className="rounded-xl border bg-white shadow-sm">
            <div className="border-b p-4">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-ink-900">
                <Icon name="clock" size={20} />
                Recent Events
              </h2>
            </div>
            <div className="p-4">
              {recentEvents.length === 0 ? (
                <p className="py-4 text-center text-sm text-ink-500">No events recorded yet.</p>
              ) : (
                <div className="space-y-4">
                  {recentEvents.slice(0, 8).map((event) => (
                    <div key={event.id} className="flex items-start gap-3">
                      <div
                        className={cn(
                          "mt-0.5 flex h-6 w-6 items-center justify-center rounded-full",
                          event.eventType === "check_in"
                            ? "bg-green-100"
                            : event.eventType === "check_out"
                            ? "bg-orange-100"
                            : "bg-gray-100"
                        )}
                      >
                        <Icon
                          name="activity"
                          size={12}
                          className={
                            event.eventType === "check_in"
                              ? "text-green-600"
                              : event.eventType === "check_out"
                              ? "text-orange-600"
                              : "text-gray-600"
                          }
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium capitalize text-ink-900">
                          {event.eventType.replace("_", " ")}
                        </p>
                        <p className="text-xs text-ink-500">{event.device.name}</p>
                        <p className="text-xs text-ink-400">
                          {new Date(event.createdAt).toLocaleString()}
                        </p>
                      </div>
                      {event.isSimulated && (
                        <span className="rounded bg-ink-100 px-1.5 py-0.5 text-xs text-ink-500">
                          SIM
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="mt-6 rounded-xl border bg-white p-4 shadow-sm">
            <h2 className="mb-4 font-semibold text-ink-900">Quick Actions</h2>
            <div className="space-y-2">
              <LinkButton href="/classpulse/simulator" variant="outline" className="w-full justify-start">
                <Icon name="scan" size={16} />
                Open Card Simulator
              </LinkButton>
              <LinkButton href="/classpulse/cards" variant="outline" className="w-full justify-start">
                <Icon name="credit-card" size={16} />
                Manage Student Cards
              </LinkButton>
              <LinkButton href="/classpulse/bulk" variant="outline" className="w-full justify-start">
                <Icon name="users" size={16} />
                Bulk Attendance Simulation
              </LinkButton>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
