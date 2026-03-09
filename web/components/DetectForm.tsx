"use client";

import { useState } from "react";
import type { DetectionResponse } from "@/app/types";

export function DetectorForm() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [result, setResult] = useState<DetectionResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleFileChange = (nextFile: File | null) => {
    setFile(nextFile);
    setResult(null);
    setError("");

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    if (nextFile) {
      setPreviewUrl(URL.createObjectURL(nextFile));
    } else {
      setPreviewUrl("");
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!file) {
      setError("Please select an image");
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("image", file);

      const response = await fetch("/api/detect", {
        method: "POST",
        body: formData,
      });

      const data: DetectionResponse = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Request failed");
      }

      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto max-w-2xl p-8">
      <h1 className="mb-6 text-2xl font-semibold">AI Image Detector</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
        />

        {previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={previewUrl}
            alt="Preview"
            className="max-h-[420px] rounded-xl border object-contain"
          />
        ) : null}

        <button
          type="submit"
          disabled={!file || loading}
          className="rounded-lg border px-4 py-2 disabled:opacity-50"
        >
          {loading ? "Checking..." : "Check image"}
        </button>
      </form>

      {error ? <p className="mt-4 text-red-600">{error}</p> : null}

      {result?.results?.length ? (
        <section className="mt-8 rounded-xl border p-4">
          <p className="text-sm text-gray-500">Top result</p>
          <p className="mb-4 text-lg font-semibold">
            {result.topLabel} — {((result.topScore ?? 0) * 100).toFixed(2)}%
          </p>

          <div className="space-y-2">
            {result.results.map((item) => (
              <div key={item.label} className="flex justify-between">
                <span>{item.label}</span>
                <span>{(item.score * 100).toFixed(2)}%</span>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}
