"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icons";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { InfoNote } from "@/components/ui/primitives";
import { apiFetch, ClientApiError } from "@/lib/client";

export function CreateOrganizationForm({ allowSchool }: { allowSchool: boolean }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [type, setType] = useState(allowSchool ? "school" : "institute");
  const [nameSi, setNameSi] = useState("");
  const [description, setDescription] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [website, setWebsite] = useState("");
  const [address, setAddress] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function handleNameChange(value: string) {
    setName(value);
    const autoSlug = value
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .slice(0, 50);
    setSlug(autoSlug);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (pending) return;
    setError(null);

    if (!name.trim()) return setError("Please enter the organization name.");
    if (!slug.trim() || slug.length < 3) return setError("URL slug must be at least 3 characters.");
    if (!/^[a-z0-9-]+$/.test(slug)) {
      return setError("URL slug can only contain lowercase letters, numbers, and hyphens.");
    }
    if (website.trim() && !/^https?:\/\/.+/.test(website.trim())) {
      return setError("Website must start with http:// or https://");
    }

    setPending(true);
    try {
      const result = await apiFetch<{ organization: { slug: string } }>("/api/organizations", {
        method: "POST",
        body: {
          type,
          name: name.trim(),
          slug,
          nameSi: nameSi.trim() || undefined,
          description: description.trim() || undefined,
          email: email.trim() || undefined,
          phone: phone.trim() || undefined,
          website: website.trim() || undefined,
          address: address.trim() || undefined,
        },
      });
      router.push(`/campus/${result.organization.slug}`);
    } catch (err) {
      setError(err instanceof ClientApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      {error ? (
        <InfoNote icon="alert" tone="danger">
          {error}
        </InfoNote>
      ) : null}

      <Field label="Organization type" htmlFor="type">
        <Select id="type" value={type} onChange={(e) => setType(e.target.value)}>
          {allowSchool ? <option value="school">School</option> : null}
          <option value="institute">Tuition institute</option>
        </Select>
      </Field>

      <Field label="Organization name" htmlFor="name" hint="Shown on your public campus page">
        <Input
          id="name"
          value={name}
          onChange={(e) => handleNameChange(e.target.value)}
          placeholder="e.g., Royal College Colombo"
          required
        />
      </Field>

      <Field label="Sinhala name (optional)" htmlFor="nameSi">
        <Input
          id="nameSi"
          value={nameSi}
          onChange={(e) => setNameSi(e.target.value)}
          placeholder="e.g., රාජකීය විද්‍යාලය"
        />
      </Field>

      <Field label="Campus URL" htmlFor="slug" hint="Lowercase letters, numbers, and hyphens only">
        <div className="flex items-center gap-2">
          <span className="flex-none rounded-lg bg-ink-100 px-3 py-2.5 text-sm text-ink-500">
            gurulens.us/campus/
          </span>
          <Input
            id="slug"
            value={slug}
            onChange={(e) => setSlug(e.target.value.toLowerCase())}
            placeholder="royal-college"
            pattern="^[a-z0-9-]+$"
            required
            className="flex-1"
          />
        </div>
      </Field>

      <Field label="About" htmlFor="description" hint="A short introduction for students and parents">
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          placeholder="What makes your organization special?"
        />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Contact email" htmlFor="email">
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="office@school.lk"
          />
        </Field>
        <Field label="Phone" htmlFor="phone">
          <Input
            id="phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+94 11 234 5678"
          />
        </Field>
      </div>

      <Field label="Website" htmlFor="website" hint="Include https://">
        <Input
          id="website"
          type="url"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
          placeholder="https://school.lk"
        />
      </Field>

      <Field label="Address" htmlFor="address">
        <Input
          id="address"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="e.g., 35 Reid Avenue, Colombo 07"
        />
      </Field>

      <div className="flex gap-3 pt-3">
        <Button type="submit" disabled={pending} className="flex-1">
          {pending ? (
            <>
              <Icon name="loader" size={18} className="animate-spin" />
              Creating…
            </>
          ) : (
            "Register organization"
          )}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()} disabled={pending}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
