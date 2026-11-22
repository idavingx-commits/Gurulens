"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icons";
import { Field, Input, Textarea } from "@/components/ui/input";
import { InfoNote } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { apiFetch, ClientApiError, uploadMedia } from "@/lib/client";

const IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"];

export type OrgProfileValues = {
  name: string;
  nameSi: string;
  description: string;
  website: string;
  phone: string;
  email: string;
  address: string;
};

export function OrgProfileForm({
  organizationId,
  slug,
  initial,
  logoUrl: initialLogoUrl,
  coverUrl: initialCoverUrl,
  canEdit,
}: {
  organizationId: string;
  slug: string;
  initial: OrgProfileValues;
  logoUrl: string | null;
  coverUrl: string | null;
  canEdit: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const logoRef = useRef<HTMLInputElement>(null);
  const coverRef = useRef<HTMLInputElement>(null);

  const [values, setValues] = useState(initial);
  const [logoUrl, setLogoUrl] = useState(initialLogoUrl);
  const [coverUrl, setCoverUrl] = useState(initialCoverUrl);
  const [saving, setSaving] = useState(false);
  const [logoBusy, setLogoBusy] = useState(false);
  const [coverBusy, setCoverBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mediaError, setMediaError] = useState<string | null>(null);

  const apiPath = `/api/organizations/${organizationId}`;

  function update<K extends keyof OrgProfileValues>(key: K, value: OrgProfileValues[K]) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  async function uploadImage(
    file: File,
    kind: "org_logo" | "org_cover",
    limitMb: number,
    field: "logoKey" | "coverKey",
    onDone: (url: string | null) => void,
    setBusy: (busy: boolean) => void,
    successMessage: string,
  ) {
    if (!IMAGE_TYPES.includes(file.type)) {
      setMediaError("Choose a JPG, PNG or WebP image.");
      return;
    }
    if (file.size > limitMb * 1024 * 1024) {
      setMediaError(`Images must be ${limitMb} MB or smaller.`);
      return;
    }

    setBusy(true);
    setMediaError(null);
    try {
      const media = await uploadMedia(file, kind);
      await apiFetch(apiPath, { method: "PATCH", body: { [field]: media.id } });
      onDone(media.url);
      toast.success(successMessage);
      router.refresh();
    } catch (err) {
      setMediaError(err instanceof ClientApiError ? err.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  }

  async function pickLogo(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    await uploadImage(
      file,
      "org_logo",
      5,
      "logoKey",
      setLogoUrl,
      setLogoBusy,
      "Campus logo updated.",
    );
    if (logoRef.current) logoRef.current.value = "";
  }

  async function pickCover(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    await uploadImage(
      file,
      "org_cover",
      8,
      "coverKey",
      setCoverUrl,
      setCoverBusy,
      "Campus banner updated.",
    );
    if (coverRef.current) coverRef.current.value = "";
  }

  async function removeImage(field: "logoKey" | "coverKey") {
    const setBusy = field === "logoKey" ? setLogoBusy : setCoverBusy;
    setBusy(true);
    setMediaError(null);
    try {
      await apiFetch(apiPath, { method: "PATCH", body: { [field]: null } });
      if (field === "logoKey") setLogoUrl(null);
      else setCoverUrl(null);
      toast.success(field === "logoKey" ? "Campus logo removed." : "Campus banner removed.");
      router.refresh();
    } catch (err) {
      setMediaError(err instanceof ClientApiError ? err.message : "Could not remove the image.");
    } finally {
      setBusy(false);
    }
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (saving || !canEdit) return;
    setError(null);

    if (values.name.trim().length < 2) {
      setError("Please enter the campus name.");
      return;
    }
    if (values.website.trim() && !/^https?:\/\/.+/.test(values.website.trim())) {
      setError("Website must start with http:// or https://");
      return;
    }

    setSaving(true);
    try {
      await apiFetch(apiPath, {
        method: "PATCH",
        body: {
          name: values.name.trim(),
          nameSi: values.nameSi.trim(),
          description: values.description.trim(),
          website: values.website.trim(),
          phone: values.phone.trim(),
          email: values.email.trim(),
          address: values.address.trim(),
        },
      });
      toast.success("Campus profile saved.");
      router.refresh();
    } catch (err) {
      setError(err instanceof ClientApiError ? err.message : "Could not save the campus profile.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      {error ? (
        <InfoNote icon="alert" tone="danger">
          {error}
        </InfoNote>
      ) : null}
      {mediaError ? (
        <InfoNote icon="alert" tone="danger">
          {mediaError}
        </InfoNote>
      ) : null}

      <section className="card overflow-hidden">
        <div className="relative h-40 bg-gradient-to-br from-ink-900 via-brand-800 to-accent-700 sm:h-48">
          {coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={coverUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
          ) : (
            <>
              <div
                aria-hidden="true"
                className="absolute -top-12 -right-10 size-40 rounded-full bg-white/10 blur-2xl"
              />
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 text-white/80">
                <Icon name="image" size={24} />
                <span className="text-[12px] font-bold">Add a campus banner</span>
              </div>
            </>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-ink-900/55 via-transparent to-transparent" />

          {canEdit ? (
            <div className="absolute right-3 bottom-3 flex items-center gap-2">
              {coverUrl ? (
                <button
                  type="button"
                  onClick={() => void removeImage("coverKey")}
                  disabled={coverBusy}
                  aria-label="Remove campus banner"
                  className="inline-flex size-8 items-center justify-center rounded-full bg-ink-900/55 text-white backdrop-blur-sm transition-colors hover:bg-ink-900/75 disabled:opacity-60"
                >
                  {coverBusy ? (
                    <Icon name="loader" size={13} className="animate-spin" />
                  ) : (
                    <Icon name="x" size={14} strokeWidth={2.6} />
                  )}
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => coverRef.current?.click()}
                disabled={coverBusy}
                className="inline-flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1.5 text-[11.5px] font-bold text-ink-900 shadow-sm transition-colors hover:bg-white disabled:opacity-70"
              >
                {coverBusy ? (
                  <Icon name="loader" size={13} className="animate-spin" />
                ) : (
                  <Icon name="camera" size={13} />
                )}
                {coverBusy ? "Uploading…" : coverUrl ? "Change banner" : "Add banner"}
              </button>
            </div>
          ) : null}
        </div>

        <div className="px-5 pb-5">
          <div className="-mt-9 flex flex-wrap items-end gap-4">
            <div className="relative flex-none">
              <Avatar
                name={values.name || "Campus"}
                src={logoUrl}
                size="xl"
                ring
                className="!rounded-2xl"
              />
              {canEdit ? (
                <button
                  type="button"
                  onClick={() => logoRef.current?.click()}
                  disabled={logoBusy}
                  aria-label="Change campus logo"
                  className="absolute -right-1 -bottom-1 flex size-7 items-center justify-center rounded-full bg-brand-600 text-white shadow-md transition-colors hover:bg-brand-700 disabled:opacity-70"
                >
                  {logoBusy ? (
                    <Icon name="loader" size={13} className="animate-spin" />
                  ) : (
                    <Icon name="camera" size={13} />
                  )}
                </button>
              ) : null}
            </div>
            <div className="min-w-0 flex-1 pb-1">
              <p className="text-[13px] font-bold text-ink-800">Campus logo</p>
              <p className="text-[11.5px] text-ink-400">
                JPG, PNG or WebP up to 5 MB. Square logos work best.
              </p>
              {canEdit && logoUrl ? (
                <button
                  type="button"
                  onClick={() => void removeImage("logoKey")}
                  disabled={logoBusy}
                  className="mt-1 text-[11.5px] font-bold text-danger-600 hover:underline disabled:opacity-60"
                >
                  Remove logo
                </button>
              ) : null}
            </div>
          </div>

          <p className="mt-3 text-[11.5px] text-ink-400">
            Wide banner images (16:6) look best on the campus page and in link previews.
          </p>

          <input
            ref={logoRef}
            type="file"
            accept={IMAGE_TYPES.join(",")}
            className="hidden"
            onChange={pickLogo}
          />
          <input
            ref={coverRef}
            type="file"
            accept={IMAGE_TYPES.join(",")}
            className="hidden"
            onChange={pickCover}
          />
        </div>
      </section>

      <form onSubmit={save} className="card space-y-4 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-[15px] font-extrabold text-ink-900">Campus profile</h2>
            <p className="text-[12px] text-ink-400">
              This information appears on your campus page and in search results.
            </p>
          </div>
          <span className="rounded-chip bg-ink-100 px-2.5 py-1 text-[11px] font-bold text-ink-500">
            /campus/{slug}
          </span>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Campus name" htmlFor="org-name">
            <Input
              id="org-name"
              value={values.name}
              onChange={(event) => update("name", event.target.value)}
              maxLength={200}
              disabled={!canEdit}
              required
            />
          </Field>
          <Field label="Sinhala name" htmlFor="org-name-si" hint="Optional">
            <Input
              id="org-name-si"
              lang="si"
              className="font-si"
              value={values.nameSi}
              onChange={(event) => update("nameSi", event.target.value)}
              maxLength={120}
              disabled={!canEdit}
            />
          </Field>
        </div>

        <Field
          label="About"
          htmlFor="org-description"
          hint={`${values.description.length}/1000 characters`}
        >
          <Textarea
            id="org-description"
            value={values.description}
            onChange={(event) => update("description", event.target.value)}
            rows={4}
            maxLength={1000}
            disabled={!canEdit}
            placeholder="Tell students and parents what makes this campus special."
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Contact email" htmlFor="org-email">
            <Input
              id="org-email"
              type="email"
              value={values.email}
              onChange={(event) => update("email", event.target.value)}
              maxLength={200}
              disabled={!canEdit}
            />
          </Field>
          <Field label="Phone" htmlFor="org-phone">
            <Input
              id="org-phone"
              value={values.phone}
              onChange={(event) => update("phone", event.target.value)}
              maxLength={60}
              disabled={!canEdit}
            />
          </Field>
        </div>

        <Field label="Website" htmlFor="org-website" hint="Include https://">
          <Input
            id="org-website"
            type="url"
            value={values.website}
            onChange={(event) => update("website", event.target.value)}
            maxLength={300}
            disabled={!canEdit}
          />
        </Field>

        <Field label="Address" htmlFor="org-address">
          <Input
            id="org-address"
            value={values.address}
            onChange={(event) => update("address", event.target.value)}
            maxLength={300}
            disabled={!canEdit}
          />
        </Field>

        {canEdit ? (
          <div className="flex items-center justify-end border-t border-ink-100 pt-4">
            <Button type="submit" disabled={saving || logoBusy || coverBusy}>
              {saving ? (
                <>
                  <Icon name="loader" size={15} className="animate-spin" /> Saving…
                </>
              ) : (
                "Save profile"
              )}
            </Button>
          </div>
        ) : (
          <InfoNote icon="info">
            Only campus owners and admins can edit the profile, branches and team.
          </InfoNote>
        )}
      </form>
    </div>
  );
}
