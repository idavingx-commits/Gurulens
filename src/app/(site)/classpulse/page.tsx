import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { LinkButton } from "@/components/ui/button";
import { Icon } from "@/components/ui/icons";
import { EmptyState, InfoNote, SectionHeader, Stat } from "@/components/ui/primitives";
import { getAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { timeAgo } from "@/lib/format";

export const metadata: Metadata = { title: "ClassPulse" };

export default async function ClassPulsePage() {
  const auth = await getAuth();

  if (!auth) redirect("/login?redirect=/classpulse");
  if (auth.user.role !== "teacher" && auth.user.role !== "admin") redirect("/");

  const memberships = await db.organizationMember.findMany({
    where: { userId: auth.user.id, status: "active" },
    select: { organizationId: true },
  });
  const orgIds = memberships.map((m) => m.organizationId);

  const [devices, recentEvents, cardCount] = await Promise.all([
    db.virtualDevice.findMany({
      where: { organizationId: { in: orgIds } },
      orderBy: { createdAt: "desc" },
    }),
    db.deviceEvent.findMany({
      where: { device: { organizationId: { in: orgIds } } },
      include: { device: { select: { name: true } } },
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
    <div className="mx-auto w-full max-w-4xl px-4 pt-8 pb-12 sm:px-6">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-ink-900">ClassPulse</h1>
          <p className="mt-1 text-[13px] text-ink-500">
            Virtual attendance tracking and device simulation.
          </p>
        </div>
        <div className="flex gap-2">
          <LinkButton href="/classpulse/simulator" variant="outline">
            <Icon name="zap" size={18} /> Simulator
          </LinkButton>
          <LinkButton href="/classpulse/devices/create">
            <Icon name="plus" size={18} /> Add Device
          </LinkButton>
        </div>
      </div>

      {/* Simulation Notice */}
      <InfoNote icon="info" className="mb-6">
        <strong>Simulation Mode:</strong> ClassPulse hardware is not yet available. All attendance 
        events are simulated for testing purposes and should not be treated as actual records.
      </InfoNote>

      {/* Stats */}
      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Devices" value={devices.length} icon="smartphone" hint={`${activeDevices} active`} />
        <Stat label="Today" value={todayEvents} icon="zap" hint="simulated scans" />
        <Stat label="Cards" value={cardCount} icon="credit-card" hint="active cards" />
        <Stat label="Status" value="Online" icon="wifi" />
      </div>

      {/* Devices */}
      <section className="mb-8">
        <SectionHeader title="Virtual Devices" subtitle="Manage your ClassPulse devices" />
        {devices.length === 0 ? (
          <EmptyState
            icon="smartphone"
            title="No devices yet"
            description="Register a virtual device to get started"
            action={<LinkButton href="/classpulse/devices/create">Add Device</LinkButton>}
          />
        ) : (
          <div className="space-y-3">
            {devices.map((device) => (
              <Link
                key={device.id}
                href={`/classpulse/devices/${device.id}`}
                className="card flex items-center justify-between p-4 transition-shadow hover:shadow-md"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`flex size-10 items-center justify-center rounded-xl ${
                      device.status === "active"
                        ? "bg-success-50 text-success-600"
                        : device.status === "simulated"
                        ? "bg-brand-50 text-brand-600"
                        : "bg-ink-100 text-ink-500"
                    }`}
                  >
                    <Icon name={device.status === "inactive" ? "wifi-off" : "wifi"} size={20} />
                  </span>
                  <div>
                    <p className="font-bold text-ink-900">{device.name}</p>
                    <p className="text-sm text-ink-500">{device.deviceCode}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                      device.status === "active"
                        ? "bg-success-100 text-success-700"
                        : device.status === "simulated"
                        ? "bg-brand-100 text-brand-700"
                        : "bg-ink-100 text-ink-600"
                    }`}
                  >
                    {device.status === "simulated" ? "Simulator" : device.status}
                  </span>
                  <Icon name="chevron-right" size={18} className="text-ink-400" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Recent Events */}
      <section>
        <SectionHeader title="Recent Events" />
        {recentEvents.length === 0 ? (
          <div className="card p-6 text-center text-sm text-ink-500">
            No events recorded yet.
          </div>
        ) : (
          <div className="space-y-2">
            {recentEvents.slice(0, 8).map((event) => (
              <div key={event.id} className="card flex items-center gap-3 p-3">
                <span
                  className={`flex size-8 items-center justify-center rounded-full ${
                    event.eventType === "check_in"
                      ? "bg-success-100 text-success-600"
                      : event.eventType === "check_out"
                      ? "bg-warn-100 text-warn-600"
                      : "bg-ink-100 text-ink-500"
                  }`}
                >
                  <Icon name="zap" size={14} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium capitalize text-ink-900">
                    {event.eventType.replace("_", " ")}
                  </p>
                  <p className="text-xs text-ink-500">
                    {event.device.name} · {timeAgo(event.createdAt)}
                  </p>
                </div>
                {event.isSimulated && (
                  <span className="rounded bg-ink-100 px-1.5 py-0.5 text-[10px] font-bold text-ink-500">
                    SIM
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
