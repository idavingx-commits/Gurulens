"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icons";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { ConfirmDialog, Switch } from "@/components/ui/interactive";
import { InfoNote } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { apiFetch, ClientApiError } from "@/lib/client";
import { cn, timeAgo } from "@/lib/format";
import {
  formatPlanLimit,
  PLAN_AUDIENCES,
  PLAN_AUDIENCE_MAP,
  PLAN_FEATURE_GROUPS,
  PLAN_LIMITS,
  planFeatureLabel,
  type PlanAudience,
} from "@/lib/plan-catalog";

export type EditablePlan = {
  id?: string;
  name: string;
  slug: string;
  type: PlanAudience;
  description: string;
  priceLkr: number;
  billingCycle: "monthly" | "yearly" | "lifetime";
  limits: Record<string, number>;
  features: string[];
  sortOrder: number;
  isActive: boolean;
  subscriberCount?: number;
  updatedAt?: string;
};

const EMPTY_PLAN: EditablePlan = {
  name: "",
  slug: "",
  type: "teacher",
  description: "",
  priceLkr: 0,
  billingCycle: "monthly",
  limits: { channels: 3, classes: 5, storage_mb: 500 },
  features: ["public_profile", "basic_posts"],
  sortOrder: 10,
  isActive: true,
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 60);
}

export function PlanEditor({ plan }: { plan?: EditablePlan }) {
  const router = useRouter();
  const toast = useToast();
  const editing = Boolean(plan?.id);
  const initial = plan ?? EMPTY_PLAN;

  const [name, setName] = useState(initial.name);
  const [slug, setSlug] = useState(initial.slug);
  const [slugTouched, setSlugTouched] = useState(editing);
  const [type, setType] = useState<PlanAudience>(initial.type);
  const [description, setDescription] = useState(initial.description);
  const [priceLkr, setPriceLkr] = useState(String(initial.priceLkr));
  const [billingCycle, setBillingCycle] = useState(initial.billingCycle);
  const [sortOrder, setSortOrder] = useState(String(initial.sortOrder));
  const [isActive, setIsActive] = useState(initial.isActive);
  const [limits, setLimits] = useState<Record<string, string>>(() => {
    const values: Record<string, string> = {};
    for (const limit of PLAN_LIMITS) {
      const value = initial.limits[limit.key];
      values[limit.key] = value === undefined ? "" : String(value);
    }
    return values;
  });
  const [features, setFeatures] = useState<string[]>(initial.features);
  const [customFeature, setCustomFeature] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const audienceMeta = PLAN_AUDIENCE_MAP[type];

  function onNameChange(value: string) {
    setName(value);
    if (!slugTouched) setSlug(slugify(value));
  }

  function toggleFeature(key: string) {
    setFeatures((prev) =>
      prev.includes(key) ? prev.filter((item) => item !== key) : [...prev, key],
    );
  }

  function addCustomFeature() {
    const key = customFeature
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_ -]+/g, "")
      .replace(/[\s-]+/g, "_");
    if (!key) return;
    if (!features.includes(key)) setFeatures((prev) => [...prev, key]);
    setCustomFeature("");
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    setError(null);

    if (name.trim().length < 2) {
      setError("Give the plan a name with at least 2 characters.");
      return;
    }
    if (!/^[a-z0-9][a-z0-9_-]*$/.test(slug)) {
      setError("The slug must use lowercase letters, numbers, dashes or underscores.");
      return;
    }

    const parsedLimits: Record<string, number> = {};
    for (const limit of PLAN_LIMITS) {
      const raw = (limits[limit.key] ?? "").trim();
      if (!raw) continue;
      const value = Number(raw);
      if (!Number.isInteger(value) || value < -1) {
        setError(`${limit.label} must be a whole number, or -1 for unlimited.`);
        return;
      }
      parsedLimits[limit.key] = value;
    }

    const price = Number(priceLkr);
    if (!Number.isInteger(price) || price < 0) {
      setError("Price must be 0 or a whole number of rupees.");
      return;
    }

    const order = Number(sortOrder);
    if (!Number.isInteger(order) || order < 0) {
      setError("Sort order must be 0 or a larger whole number.");
      return;
    }

    setBusy(true);
    try {
      const body = {
        name: name.trim(),
        slug,
        type,
        description: description.trim() || undefined,
        priceLkr: price,
        billingCycle,
        limits: parsedLimits,
        features,
        sortOrder: order,
        isActive,
      };
      if (editing) {
        await apiFetch(`/api/admin/plans/${plan?.id}`, { method: "PATCH", body });
        toast.success("Plan updated.");
      } else {
        await apiFetch("/api/admin/plans", { method: "POST", body });
        toast.success("Plan created.");
      }
      router.push("/admin/plans");
      router.refresh();
    } catch (err) {
      setError(err instanceof ClientApiError ? err.message : "Could not save the plan.");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!plan?.id) return;
    setBusy(true);
    try {
      await apiFetch(`/api/admin/plans/${plan.id}`, { method: "DELETE" });
      toast.success("Plan deleted.");
      router.push("/admin/plans");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof ClientApiError ? err.message : "Could not delete the plan.");
      setDeleteOpen(false);
    } finally {
      setBusy(false);
    }
  }

  const activeFeatures = features;
  const customFeatures = activeFeatures.filter(
    (key) => !PLAN_FEATURE_GROUPS.some((group) => group.features.some((f) => f.key === key)),
  );

  return (
    <form onSubmit={save} className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-5">
        {error ? (
          <InfoNote icon="alert" tone="danger">
            {error}
          </InfoNote>
        ) : null}

        <section className="card p-5">
          <h2 className="flex items-center gap-2 text-[14px] font-extrabold text-ink-900">
            <span className="flex size-7 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
              <Icon name="crown" size={14} />
            </span>
            Plan identity
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Plan name" htmlFor="plan-name">
              <Input
                id="plan-name"
                value={name}
                onChange={(e) => onNameChange(e.target.value)}
                placeholder="e.g. Teacher Pro"
                maxLength={80}
                required
              />
            </Field>
            <Field label="Slug" htmlFor="plan-slug" hint="Used in links and activation.">
              <Input
                id="plan-slug"
                value={slug}
                onChange={(e) => {
                  setSlugTouched(true);
                  setSlug(slugify(e.target.value));
                }}
                placeholder="teacher_pro"
                maxLength={80}
                required
              />
            </Field>
            <Field label="Audience" htmlFor="plan-type" hint="Which tab this plan appears under.">
              <Select
                id="plan-type"
                value={type}
                onChange={(e) => setType(e.target.value as PlanAudience)}
              >
                {PLAN_AUDIENCES.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Sort order" htmlFor="plan-order" hint="Lower numbers appear first.">
              <Input
                id="plan-order"
                inputMode="numeric"
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
              />
            </Field>
            <div className="sm:col-span-2">
              <Field
                label="Short description"
                htmlFor="plan-description"
                hint="One sentence under the plan name."
              >
                <Textarea
                  id="plan-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  maxLength={300}
                  placeholder="For professional teachers who run several classes and channels."
                />
              </Field>
            </div>
          </div>
        </section>

        <section className="card p-5">
          <h2 className="flex items-center gap-2 text-[14px] font-extrabold text-ink-900">
            <span className="flex size-7 items-center justify-center rounded-lg bg-success-100 text-success-600">
              <Icon name="credit-card" size={14} />
            </span>
            Price & availability
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field
              label="Price (LKR)"
              htmlFor="plan-price"
              hint="Use 0 to show “Free for now” during launch."
            >
              <Input
                id="plan-price"
                inputMode="numeric"
                value={priceLkr}
                onChange={(e) => setPriceLkr(e.target.value)}
              />
            </Field>
            <Field label="Billing cycle" htmlFor="plan-cycle">
              <Select
                id="plan-cycle"
                value={billingCycle}
                onChange={(e) =>
                  setBillingCycle(e.target.value as EditablePlan["billingCycle"])
                }
              >
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
                <option value="lifetime">Lifetime / free forever</option>
              </Select>
            </Field>
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-ink-100 bg-ink-50/60 px-4 py-3 sm:col-span-2">
              <div>
                <p className="text-[12.5px] font-bold text-ink-800">Plan is visible</p>
                <p className="text-[11.5px] text-ink-400">
                  Turn this off to hide it from pricing and block new activations.
                </p>
              </div>
              <Switch checked={isActive} onChange={setIsActive} />
            </div>
          </div>
        </section>

        <section className="card p-5">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h2 className="flex items-center gap-2 text-[14px] font-extrabold text-ink-900">
                <span className="flex size-7 items-center justify-center rounded-lg bg-accent-100 text-accent-700">
                  <Icon name="sliders" size={14} />
                </span>
                Limits
              </h2>
              <p className="mt-1 text-[11.5px] text-ink-400">
                Leave a field blank to hide it from the plan card. Use -1 for unlimited.
              </p>
            </div>
            <span className="rounded-chip bg-ink-100 px-2.5 py-1 text-[10.5px] font-bold text-ink-500">
              {audienceMeta.shortLabel}
            </span>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {PLAN_LIMITS.map((limit) => (
              <label key={limit.key} className="block">
                <span className="mb-1 flex items-center gap-1.5 text-[11.5px] font-bold text-ink-600">
                  <Icon name={limit.icon} size={12} className="text-ink-400" />
                  {limit.label}
                </span>
                <Input
                  value={limits[limit.key] ?? ""}
                  onChange={(e) =>
                    setLimits((prev) => ({ ...prev, [limit.key]: e.target.value }))
                  }
                  placeholder={limit.key === "storage_mb" ? "e.g. 5000" : "e.g. 10 or -1"}
                  inputMode="numeric"
                  aria-label={limit.label}
                />
                <span className="mt-1 block text-[10.5px] text-ink-300">{limit.hint}</span>
              </label>
            ))}
          </div>
        </section>

        <section className="card p-5">
          <h2 className="flex items-center gap-2 text-[14px] font-extrabold text-ink-900">
            <span className="flex size-7 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
              <Icon name="sparkles" size={14} />
            </span>
            Feature bundle
          </h2>
          <p className="mt-1 text-[11.5px] text-ink-400">
            Tick every feature this plan unlocks. You can combine existing features freely or add a
            new one below.
          </p>

          <div className="mt-4 space-y-4">
            {PLAN_FEATURE_GROUPS.map((group) => (
              <div key={group.id} className="rounded-2xl border border-ink-100 p-3.5">
                <div className="flex items-center gap-2">
                  <span className="flex size-7 items-center justify-center rounded-lg bg-ink-100 text-ink-500">
                    <Icon name={group.icon} size={13} />
                  </span>
                  <div>
                    <p className="text-[12px] font-extrabold text-ink-800">{group.title}</p>
                    <p className="text-[10.5px] text-ink-400">{group.description}</p>
                  </div>
                </div>
                <div className="mt-2.5 grid gap-1.5 sm:grid-cols-2">
                  {group.features.map((feature) => (
                    <label
                      key={feature.key}
                      className={cn(
                        "flex cursor-pointer items-start gap-2 rounded-xl border px-2.5 py-2 transition-colors",
                        features.includes(feature.key)
                          ? "border-brand-200 bg-brand-50/70"
                          : "border-transparent hover:bg-ink-50",
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={features.includes(feature.key)}
                        onChange={() => toggleFeature(feature.key)}
                        className="mt-0.5 size-3.5 flex-none accent-brand-600"
                      />
                      <span className="min-w-0">
                        <span className="block text-[11.5px] font-bold text-ink-700">
                          {feature.label}
                        </span>
                        <span className="block text-[10px] leading-snug text-ink-400">
                          {feature.description}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 rounded-2xl border border-dashed border-ink-200 p-3.5">
            <p className="text-[11.5px] font-bold text-ink-700">Add a new feature key</p>
            <p className="mt-0.5 text-[10.5px] text-ink-400">
              It is saved on this plan immediately. Give it a label later in code if you want a
              friendlier name; for now the key is prettified automatically.
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Input
                value={customFeature}
                onChange={(e) => setCustomFeature(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addCustomFeature();
                  }
                }}
                placeholder="e.g. parent_messaging"
                className="min-w-48 flex-1"
              />
              <Button type="button" variant="outline" size="sm" onClick={addCustomFeature}>
                <Icon name="plus" size={13} /> Add
              </Button>
            </div>
            {customFeatures.length > 0 ? (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {customFeatures.map((key) => (
                  <span
                    key={key}
                    className="inline-flex items-center gap-1 rounded-full bg-ink-100 px-2.5 py-1 text-[10.5px] font-bold text-ink-600"
                  >
                    {planFeatureLabel(key)}
                    <button
                      type="button"
                      onClick={() => setFeatures((prev) => prev.filter((item) => item !== key))}
                      aria-label={`Remove ${key}`}
                      className="rounded-full p-0.5 text-ink-400 hover:bg-white hover:text-danger-600"
                    >
                      <Icon name="x" size={10} strokeWidth={3} />
                    </button>
                  </span>
                ))}
              </div>
            ) : null}
          </div>

          <p className="mt-3 text-[11px] font-semibold text-ink-400">
            {features.length} feature{features.length === 1 ? "" : "s"} selected
          </p>
        </section>
      </div>

      {/* Sidebar */}
      <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
        <div className="card overflow-hidden">
          <div className={cn("h-1.5 w-full bg-gradient-to-r", audienceMeta.gradient)} />
          <div className="p-4">
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-chip px-2 py-0.5 text-[9.5px] font-black tracking-[0.1em] uppercase",
                audienceMeta.soft,
              )}
            >
              <Icon name={audienceMeta.icon} size={10} strokeWidth={2.8} />
              {audienceMeta.shortLabel}
            </span>
            <h3 className="mt-2 text-[15px] font-extrabold text-ink-900">
              {name.trim() || "Untitled plan"}
            </h3>
            <p className="mt-0.5 line-clamp-2 text-[11.5px] text-ink-500">
              {description.trim() || audienceMeta.blurb}
            </p>
            <div className="mt-3 flex items-end gap-1">
              <span className="text-xl font-extrabold text-ink-900">
                {Number(priceLkr) === 0 ? "Free" : `LKR ${Number(priceLkr || 0).toLocaleString()}`}
              </span>
              <span className="pb-0.5 text-[10.5px] font-bold text-ink-400">
                {Number(priceLkr) === 0
                  ? billingCycle === "lifetime"
                    ? "forever"
                    : "for now"
                  : billingCycle === "monthly"
                    ? "/month"
                    : billingCycle === "yearly"
                      ? "/year"
                      : ""}
              </span>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-1">
              {PLAN_LIMITS.filter((limit) => limits[limit.key]).map((limit) => (
                <span
                  key={limit.key}
                  className="rounded-lg bg-ink-50 px-2 py-1 text-[10px] font-bold text-ink-600"
                >
                  {formatPlanLimit(limit.key, Number(limits[limit.key]))}{" "}
                  <span className="font-medium text-ink-400">{limit.shortLabel}</span>
                </span>
              ))}
            </div>
            <ul className="mt-3 space-y-1">
              {features.slice(0, 5).map((key) => (
                <li key={key} className="flex items-start gap-1.5 text-[11px] text-ink-600">
                  <Icon
                    name="check"
                    size={11}
                    strokeWidth={3}
                    className="mt-0.5 flex-none text-success-600"
                  />
                  {planFeatureLabel(key)}
                </li>
              ))}
              {features.length > 5 ? (
                <li className="pl-4 text-[10.5px] font-semibold text-ink-400">
                  + {features.length - 5} more
                </li>
              ) : null}
            </ul>
          </div>
        </div>

        <div className="card p-4">
          <p className="text-[11px] font-black tracking-wide text-ink-400 uppercase">Status</p>
          <p className="mt-1 text-[12px] font-bold text-ink-800">
            {isActive ? "Visible on pricing" : "Hidden / disabled"}
          </p>
          {editing ? (
            <p className="mt-2 text-[11px] text-ink-400">
              {plan?.subscriberCount ?? 0} active subscriber
              {(plan?.subscriberCount ?? 0) === 1 ? "" : "s"}
              {plan?.updatedAt ? ` · updated ${timeAgo(plan.updatedAt)}` : ""}
            </p>
          ) : (
            <p className="mt-2 text-[11px] text-ink-400">New plan — no subscribers yet.</p>
          )}

          <div className="mt-4 space-y-2">
            <Button type="submit" disabled={busy} className="w-full justify-center">
              {busy ? (
                <>
                  <Icon name="loader" size={14} className="animate-spin" /> Saving…
                </>
              ) : (
                <>
                  <Icon name="check" size={14} strokeWidth={3} />
                  {editing ? "Save changes" : "Create plan"}
                </>
              )}
            </Button>
            <Link
              href="/admin/plans"
              className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-ink-200 bg-white px-4 py-2 text-[12.5px] font-bold text-ink-600 transition-colors hover:border-ink-300 hover:text-ink-900"
            >
              Cancel
            </Link>
          </div>

          {editing ? (
            <button
              type="button"
              onClick={() => setDeleteOpen(true)}
              disabled={busy || (plan?.subscriberCount ?? 0) > 0}
              className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-full border border-danger-300 px-4 py-2 text-[12px] font-bold text-danger-600 transition-colors hover:bg-danger-100 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Icon name="trash" size={13} /> Delete plan
            </button>
          ) : null}
          {editing && (plan?.subscriberCount ?? 0) > 0 ? (
            <p className="mt-1.5 text-center text-[10.5px] text-ink-400">
              Deactivate instead — this plan still has subscribers.
            </p>
          ) : null}
        </div>
      </aside>

      <ConfirmDialog
        open={deleteOpen}
        title={`Delete ${plan?.name ?? "this plan"}?`}
        description="This cannot be undone. Only plans without subscribers can be deleted."
        confirmLabel="Delete plan"
        pending={busy}
        onConfirm={() => void remove()}
        onCancel={() => setDeleteOpen(false)}
      />
    </form>
  );
}
