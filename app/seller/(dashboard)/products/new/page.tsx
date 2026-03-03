"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileUploadDropzone } from "@/components/seller/file-upload-dropzone";
import type { UploadedFile } from "@/lib/hooks/use-supabase-upload";

export default function AddNewProductPage() {
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState("");
  const [dbCategories, setDbCategories] = useState<{id:string;name:string}[]>([]);
  const [dbBrands, setDbBrands] = useState<{id:string;name:string}[]>([]);
  const [formData, setFormData] = useState({
    productName: "",
    category: "",
    brand: "",
    unit: "",
    minPurchaseQty: "1",
    tags: "",
    barcode: "",
    refundable: true,
    // Shipping
    freeShipping: true,
    flatRate: false,
    // Low stock
    lowStockQty: "1",
    // Stock visibility
    showStockQty: true,
    showStockText: false,
    hideStock: false,
    // Cash on delivery
    cashOnDelivery: true,
    // Shipping time
    shippingDays: "",
    // Tax
    tax: "0",
    taxType: "Flat",
    // Price
    unitPrice: "0",
    discountDateRange: "",
    discount: "0",
    discountType: "Flat",
    quantity: "0",
    sku: "",
    externalLink: "",
    externalLinkText: "",
    // Videos
    videoProvider: "Youtube",
    videoLink: "",
    // Description
    description: "",
    // SEO
    metaTitle: "",
    metaDescription: "",
  });

  const [galleryImages, setGalleryImages] = useState<UploadedFile[]>([]);
  const [thumbnailImage, setThumbnailImage] = useState<UploadedFile[]>([]);
  const [pdfSpec, setPdfSpec] = useState<UploadedFile[]>([]);
  const [metaImage, setMetaImage] = useState<UploadedFile[]>([]);

  useEffect(() => {
    fetch("/api/admin/categories").then(r => r.json()).then(d => setDbCategories(d.items || [])).catch(() => {});
    fetch("/api/admin/brands").then(r => r.json()).then(d => setDbBrands(d.items || [])).catch(() => {});
  }, []);

  const handleChange = (field: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const submitProduct = async () => {
    setSubmitError("");
    setSubmitSuccess("");

    if (!formData.productName.trim()) {
      setSubmitError("Product name is required.");
      return;
    }

    if (!formData.category.trim()) {
      setSubmitError("Category is required.");
      return;
    }

    setSubmitting(true);

    const response = await fetch("/api/seller/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: formData.productName,
        category: formData.category,
        brand: formData.brand,
        sku: formData.sku,
        description: formData.description,
        price: Number(formData.unitPrice || 0),
        stockCount: Number(formData.quantity || 0),
        imageUrl: thumbnailImage[0]?.url || galleryImages[0]?.url || "",
        galleryUrls: galleryImages.map((f) => f.url),
        pdfUrl: pdfSpec[0]?.url || "",
        metaImageUrl: metaImage[0]?.url || "",
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      setSubmitError(data.error || "Failed to create product.");
      setSubmitting(false);
      return;
    }

    setSubmitSuccess("Product created successfully.");
    setSubmitting(false);
  };

  const handleSubmitWithApi = async (e: React.FormEvent) => {
    e.preventDefault();
    await submitProduct();
  };

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-gray-800">Add Your Product</h1>

      <form onSubmit={handleSubmitWithApi}>
        {submitError ? (
          <div className="mb-4 rounded-md bg-red-50 px-4 py-2 text-sm text-red-600">
            {submitError}
          </div>
        ) : null}
        {submitSuccess ? (
          <div className="mb-4 rounded-md bg-green-50 px-4 py-2 text-sm text-green-700">
            {submitSuccess}
          </div>
        ) : null}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ── LEFT COLUMN (2/3) ── */}
          <div className="lg:col-span-2 space-y-6">
            {/* Product Information */}
            <Section title="Product Information">
              <Field label="Product Name">
                <Input
                  placeholder="Product Name"
                  value={formData.productName}
                  onChange={(e) => handleChange("productName", e.target.value)}
                />
              </Field>
              <Field label="Category">
                <select
                  className="w-full h-9 px-3 border border-gray-200 rounded-md text-sm bg-white"
                  value={formData.category}
                  onChange={(e) => handleChange("category", e.target.value)}
                >
                  <option value="">Select Category</option>
                  {dbCategories.map((c) => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </Field>
              <Field label="Brand">
                <select
                  className="w-full h-9 px-3 border border-gray-200 rounded-md text-sm bg-white"
                  value={formData.brand}
                  onChange={(e) => handleChange("brand", e.target.value)}
                >
                  <option value="">Select Brand</option>
                  {dbBrands.map((b) => (
                    <option key={b.id} value={b.name}>{b.name}</option>
                  ))}
                </select>
              </Field>
              <Field label="Unit">
                <Input
                  placeholder="Unit (e.g. Kg, Pc etc.)"
                  value={formData.unit}
                  onChange={(e) => handleChange("unit", e.target.value)}
                />
              </Field>
              <Field label="Minimum Purchase Qty">
                <Input
                  type="number"
                  value={formData.minPurchaseQty}
                  onChange={(e) =>
                    handleChange("minPurchaseQty", e.target.value)
                  }
                />
              </Field>
              <Field label="Tags">
                <Input
                  placeholder="Type and hit enter to add a tag"
                  value={formData.tags}
                  onChange={(e) => handleChange("tags", e.target.value)}
                />
              </Field>
              <Field label="Barcode">
                <Input
                  placeholder="Barcode"
                  value={formData.barcode}
                  onChange={(e) => handleChange("barcode", e.target.value)}
                />
              </Field>
              <Field label="Refundable">
                <ToggleSwitch
                  active={formData.refundable}
                  onChange={(v) => handleChange("refundable", v)}
                />
              </Field>
            </Section>

            {/* Product Images */}
            <Section title="Product Images">
              <Field label="Gallery Images">
                <FileUploadDropzone
                  bucket="product-images"
                  folder="gallery"
                  multiple
                  accept={{ "image/*": [".jpg", ".jpeg", ".png", ".webp"] }}
                  acceptedTypes={["image/"]}
                  maxSizeMB={5}
                  value={galleryImages}
                  onChange={setGalleryImages}
                  hint="Upload up to 10 gallery images (max 5MB each)"
                />
              </Field>
              <Field label="Thumbnail Image (300x300)">
                <FileUploadDropzone
                  bucket="product-images"
                  folder="thumbnails"
                  accept={{ "image/*": [".jpg", ".jpeg", ".png", ".webp"] }}
                  acceptedTypes={["image/"]}
                  maxSizeMB={5}
                  variant="compact"
                  value={thumbnailImage}
                  onChange={setThumbnailImage}
                  hint="Recommended: 300×300px"
                />
              </Field>
            </Section>

            {/* Product Videos */}
            <Section title="Product Videos">
              <Field label="Video Provider">
                <select
                  className="w-full h-9 px-3 border border-gray-200 rounded-md text-sm bg-white"
                  value={formData.videoProvider}
                  onChange={(e) =>
                    handleChange("videoProvider", e.target.value)
                  }
                >
                  <option>Youtube</option>
                  <option>Vimeo</option>
                  <option>Dailymotion</option>
                </select>
              </Field>
              <Field label="Video Link">
                <Input
                  placeholder="Video Link"
                  value={formData.videoLink}
                  onChange={(e) => handleChange("videoLink", e.target.value)}
                />
              </Field>
            </Section>

            {/* Product Variation */}
            <Section title="Product Variation">
              <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mb-3">
                <p className="text-xs text-amber-700 font-medium">Coming Soon — Product variations (color, size, attributes) will be available in a future update.</p>
              </div>
              <div className="flex items-center gap-3 opacity-50 pointer-events-none">
                <span className="px-4 py-1.5 bg-sky-100 text-sky-700 text-xs font-medium rounded-md">
                  Colors
                </span>
                <select className="flex-1 h-9 px-3 border border-gray-200 rounded-md text-sm bg-white">
                  <option>Nothing selected</option>
                </select>
              </div>
              <div className="flex items-center gap-3 mt-3 opacity-50 pointer-events-none">
                <span className="px-4 py-1.5 bg-amber-100 text-amber-700 text-xs font-medium rounded-md">
                  Attributes
                </span>
                <select className="flex-1 h-9 px-3 border border-gray-200 rounded-md text-sm bg-white">
                  <option>Nothing selected</option>
                </select>
              </div>
            </Section>

            {/* Product price + stock */}
            <Section title="Product price + stock">
              <Field label="Unit price">
                <Input
                  type="number"
                  value={formData.unitPrice}
                  onChange={(e) => handleChange("unitPrice", e.target.value)}
                />
              </Field>
              <Field label="Discount Date Range">
                <Input
                  type="text"
                  placeholder="Select Date"
                  value={formData.discountDateRange}
                  onChange={(e) =>
                    handleChange("discountDateRange", e.target.value)
                  }
                />
              </Field>
              <Field label="Discount">
                <div className="flex gap-2">
                  <Input
                    type="number"
                    value={formData.discount}
                    onChange={(e) => handleChange("discount", e.target.value)}
                    className="flex-1"
                  />
                  <select
                    className="w-24 h-9 px-2 border border-gray-200 rounded-md text-sm bg-white"
                    value={formData.discountType}
                    onChange={(e) =>
                      handleChange("discountType", e.target.value)
                    }
                  >
                    <option>Flat</option>
                    <option>Percent</option>
                  </select>
                </div>
              </Field>
              <Field label="Quantity">
                <Input
                  type="number"
                  value={formData.quantity}
                  onChange={(e) => handleChange("quantity", e.target.value)}
                />
              </Field>
              <Field label="SKU">
                <Input
                  placeholder="SKU"
                  value={formData.sku}
                  onChange={(e) => handleChange("sku", e.target.value)}
                />
              </Field>
              <Field label="External link">
                <Input
                  placeholder="External Link"
                  value={formData.externalLink}
                  onChange={(e) => handleChange("externalLink", e.target.value)}
                />
                <p className="text-[11px] text-gray-400 mt-1">
                  Leave it blank if you do not use external site link
                </p>
              </Field>
              <Field label="External link button text">
                <Input
                  placeholder="External link button text"
                  value={formData.externalLinkText}
                  onChange={(e) =>
                    handleChange("externalLinkText", e.target.value)
                  }
                />
                <p className="text-[11px] text-gray-400 mt-1">
                  Leave it blank if you do not use external site link
                </p>
              </Field>
            </Section>

            {/* Product Description */}
            <Section title="Product Description">
              <Field label="Description">
                <div className="border border-gray-200 rounded-md overflow-hidden">
                  {/* Toolbar */}
                  <div className="flex flex-wrap gap-1 p-2 border-b border-gray-100 bg-gray-50">
                    {["B", "U", "I", "🔗", "≡", "≡", "≡", "⋮", "A▾", "⊞▾"].map(
                      (btn, i) => (
                        <button
                          key={i}
                          type="button"
                          className="size-7 flex items-center justify-center text-xs text-gray-600 hover:bg-gray-200 rounded"
                        >
                          {btn}
                        </button>
                      )
                    )}
                  </div>
                  <textarea
                    rows={6}
                    className="w-full p-3 text-sm resize-none outline-none"
                    placeholder="Write product description..."
                    value={formData.description}
                    onChange={(e) =>
                      handleChange("description", e.target.value)
                    }
                  />
                </div>
              </Field>
            </Section>

            {/* PDF Specification */}
            <Section title="PDF Specification">
              <Field label="PDF Specification">
                <FileUploadDropzone
                  bucket="seller-files"
                  folder="pdf-specs"
                  accept={{ "application/pdf": [".pdf"] }}
                  acceptedTypes={["application/pdf"]}
                  maxSizeMB={10}
                  variant="compact"
                  value={pdfSpec}
                  onChange={setPdfSpec}
                  hint="Upload product specification PDF (max 10MB)"
                />
              </Field>
            </Section>

            {/* SEO Meta Tags */}
            <Section title="SEO Meta Tags">
              <Field label="Meta Title">
                <Input
                  placeholder="Meta Title"
                  value={formData.metaTitle}
                  onChange={(e) => handleChange("metaTitle", e.target.value)}
                />
              </Field>
              <Field label="Description">
                <textarea
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm resize-none outline-none focus:ring-1 focus:ring-sky-500"
                  placeholder="Meta description"
                  value={formData.metaDescription}
                  onChange={(e) =>
                    handleChange("metaDescription", e.target.value)
                  }
                />
              </Field>
              <Field label="Meta Image">
                <FileUploadDropzone
                  bucket="product-images"
                  folder="meta"
                  accept={{ "image/*": [".jpg", ".jpeg", ".png", ".webp"] }}
                  acceptedTypes={["image/"]}
                  maxSizeMB={2}
                  variant="compact"
                  value={metaImage}
                  onChange={setMetaImage}
                  hint="SEO meta image (recommended: 1200×630px)"
                />
              </Field>
            </Section>
          </div>

          {/* ── RIGHT COLUMN (1/3) ── */}
          <div className="space-y-6">
            {/* Shipping Configuration */}
            <Section title="Shipping Configuration">
              <div className="flex items-center justify-between">
                <Label className="text-sm">Free Shipping</Label>
                <ToggleSwitch
                  active={formData.freeShipping}
                  onChange={(v) => handleChange("freeShipping", v)}
                />
              </div>
              <div className="flex items-center justify-between mt-3">
                <Label className="text-sm">Flat Rate</Label>
                <ToggleSwitch
                  active={formData.flatRate}
                  onChange={(v) => handleChange("flatRate", v)}
                />
              </div>
            </Section>

            {/* Low Stock Quantity Warning */}
            <Section title="Low Stock Quantity Warning">
              <Field label="Quantity">
                <Input
                  type="number"
                  value={formData.lowStockQty}
                  onChange={(e) => handleChange("lowStockQty", e.target.value)}
                />
              </Field>
            </Section>

            {/* Stock Visibility State */}
            <Section title="Stock Visibility State">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Show Stock Quantity</Label>
                  <ToggleSwitch
                    active={formData.showStockQty}
                    onChange={(v) => handleChange("showStockQty", v)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Show Stock With Text Only</Label>
                  <ToggleSwitch
                    active={formData.showStockText}
                    onChange={(v) => handleChange("showStockText", v)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Hide Stock</Label>
                  <ToggleSwitch
                    active={formData.hideStock}
                    onChange={(v) => handleChange("hideStock", v)}
                  />
                </div>
              </div>
            </Section>

            {/* Cash on Delivery */}
            <Section title="Cash on Delivery">
              <div className="flex items-center justify-between">
                <Label className="text-sm">Status</Label>
                <ToggleSwitch
                  active={formData.cashOnDelivery}
                  onChange={(v) => handleChange("cashOnDelivery", v)}
                />
              </div>
            </Section>

            {/* Estimate Shipping Time */}
            <Section title="Estimate Shipping Time">
              <Field label="Shipping Days">
                <div className="flex gap-2">
                  <Input
                    placeholder="Shipping Days"
                    value={formData.shippingDays}
                    onChange={(e) =>
                      handleChange("shippingDays", e.target.value)
                    }
                    className="flex-1"
                  />
                  <span className="flex items-center px-3 border border-gray-200 rounded-md text-sm text-gray-500 bg-gray-50">
                    Days
                  </span>
                </div>
              </Field>
            </Section>

            {/* Vat & TAX */}
            <Section title="Vat & TAX">
              <Field label="Tax">
                <div className="flex gap-2">
                  <Input
                    type="number"
                    value={formData.tax}
                    onChange={(e) => handleChange("tax", e.target.value)}
                    className="flex-1"
                  />
                  <select
                    className="w-20 h-9 px-2 border border-gray-200 rounded-md text-sm bg-white"
                    value={formData.taxType}
                    onChange={(e) => handleChange("taxType", e.target.value)}
                  >
                    <option>Flat</option>
                    <option>Percent</option>
                  </select>
                </div>
              </Field>
            </Section>
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end mt-6">
          <Button
            type="submit"
            disabled={submitting}
            className="bg-red-500 hover:bg-red-600 text-white px-8"
          >
            {submitting ? "Uploading..." : "Upload Product"}
          </Button>
        </div>
      </form>
    </div>
  );
}

// ── Helper Components ──

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h3 className="text-base font-bold text-gray-800 mb-4">{title}</h3>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-[160px_1fr] gap-2 items-start">
      <Label className="text-sm text-gray-700 pt-2">{label}</Label>
      <div>{children}</div>
    </div>
  );
}



function ToggleSwitch({
  active,
  onChange,
}: {
  active: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!active)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
        active ? "bg-green-500" : "bg-gray-300"
      }`}
    >
      <span
        className={`inline-block size-4 rounded-full bg-white transition-transform ${
          active ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );
}
