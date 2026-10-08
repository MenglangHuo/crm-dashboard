"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { useCompanyContext } from "@/components/providers/company-context";
import { useResumableMigrationUpload } from "@/hooks/useResumableMigrationUpload";
import { api } from "@/lib/api/client";
import { useTranslation } from "@/lib/i18n/context";
import {
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  Download,
  Building2,
  Layers,
  RefreshCw,
  FileText,
  X,
  Play,
  ShieldCheck,
  Sparkles,
  Users,
  Package,
  Info,
  Copy,
  Check,
  Database,
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ModernButton } from "@/components/ui-custom/modern-button";
import { ModernSelect, type SelectOption } from "@/components/ui-custom/form-controls/modern-select";
import { ModernSwitch } from "@/components/ui-custom/form-controls/modern-switch";
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible";

interface JobStatus {
  jobId: string;
  domain: string;
  companyId: number;
  status: "PENDING" | "UPLOADING" | "PROCESSING" | "COMPLETED" | "FAILED";
  totalRows: number;
  processedRows: number;
  successCount: number;
  failedCount: number;
  errorMessages: string[];
  hasErrors: boolean;
  failureDownloadUrl?: string | null;
  dryRun: boolean;
}

export default function SuperAdminMigrationsPage() {
  const { t } = useTranslation();
  const { selectedCompanyId, setSelectedCompanyId, companies, isLoadingCompanies, isSystemAdmin } =
    useCompanyContext();

  const [domain, setDomain] = useState<string>("CATALOG");
  const [file, setFile] = useState<File | null>(null);
  const [dryRun, setDryRun] = useState<boolean>(false);
  const [autoCreateMasterData, setAutoCreateMasterData] = useState<boolean>(true);
  const [showSchemaGuide, setShowSchemaGuide] = useState<boolean>(false);
  const [copiedSchema, setCopiedSchema] = useState<boolean>(false);
  const [isDownloadingErrors, setIsDownloadingErrors] = useState<boolean>(false);

  // Dynamic Domain Options for i18n
  const domainOptions: SelectOption[] = useMemo(() => [
    {
      value: "CATALOG",
      label: t("migrations.domains.catalogLabel", "Product Catalog"),
      description: t("migrations.domains.catalogDesc", "Brands, categories, variants, pricing tiers & stock"),
      badge: t("common.active", "Active"),
      icon: <Layers className="w-4 h-4 text-primary" />,
    },
    {
      value: "CUSTOMERS",
      label: t("migrations.domains.customersLabel", "Customers & Contacts"),
      description: t("migrations.domains.customersDesc", "Customer directories, visit records & contacts"),
      badge: t("migrations.comingSoon", "Coming Soon"),
      disabled: true,
      icon: <Users className="w-4 h-4 text-muted-foreground" />,
    },
    {
      value: "INVENTORY",
      label: t("migrations.domains.inventoryLabel", "Warehouse Stock Only"),
      description: t("migrations.domains.inventoryDesc", "Initial stock adjustments and warehouse allocations"),
      badge: t("migrations.comingSoon", "Coming Soon"),
      disabled: true,
      icon: <Package className="w-4 h-4 text-muted-foreground" />,
    },
  ], [t]);

  // Dynamic CSV Schema Specification fields for i18n
  const csvSchemaFields = useMemo(() => [
    { field: "Product Name", required: true, example: "Organic Jasmine Rice 5kg", desc: t("migrations.fields.productNameDesc", "Full catalog product title.") },
    { field: "Brand", required: false, example: "Golden Harvest", desc: t("migrations.fields.brandDesc", "Brand identifier (auto-created if switch enabled).") },
    { field: "Category", required: false, example: "Grocery > Rice & Grains", desc: t("migrations.fields.categoryDesc", "Hierarchy path separated by '>' (auto-created if enabled).") },
    { field: "Base Unit", required: true, example: "Bag", desc: t("migrations.fields.baseUnitDesc", "Standard base measurement unit (e.g. Bag, Bottle, Kg, Pcs).") },
    { field: "Packaging Units", required: false, example: "Carton:4,Box:24", desc: t("migrations.fields.packagingUnitsDesc", "Optional packaging conversions with ratios.") },
    { field: "Variant Name", required: false, example: "5kg Standard Bag", desc: t("migrations.fields.variantNameDesc", "Pack / flavor / size variation label.") },
    { field: "SKU", required: false, example: "RICE-JAS-5KG", desc: t("migrations.fields.skuDesc", "Unique inventory SKU code.") },
    { field: "Barcode", required: false, example: "885400192831", desc: t("migrations.fields.barcodeDesc", "UPC / EAN / Custom barcode.") },
    { field: "Sell Price", required: false, example: "12.50", desc: t("migrations.fields.sellPriceDesc", "Retail or distribution selling price.") },
    { field: "Cost Price", required: false, example: "8.00", desc: t("migrations.fields.costPriceDesc", "Base purchase / wholesale cost.") },
    { field: "Stock Quantity", required: false, example: "200", desc: t("migrations.fields.stockQuantityDesc", "Initial stock quantity balance.") },
  ], [t]);

  // Resumable upload hook
  const {
    uploadFile,
    cancelUpload,
    isUploading,
    uploadPercent,
    currentChunk,
    totalChunks,
  } = useResumableMigrationUpload();

  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<JobStatus | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-select first company for System Admin if none is selected
  useEffect(() => {
    if (isSystemAdmin && !selectedCompanyId && companies.length > 0) {
      setSelectedCompanyId(String(companies[0].id));
    }
  }, [isSystemAdmin, selectedCompanyId, companies, setSelectedCompanyId]);

  // Company options for ModernSelect
  const companyOptions: SelectOption[] = useMemo(() => {
    return companies.map((c) => ({
      value: String(c.id),
      label: c.name || `Company #${c.id}`,
      description: `ID: #${c.id}${(c as any).businessId ? ` • ${(c as any).businessId}` : ""}`,
      icon: <Building2 className="w-4 h-4 text-primary" />,
    }));
  }, [companies]);

  // Active Company label for Tenant Admin
  const activeTenantName = useMemo(() => {
    const match = companies.find((c) => String(c.id) === String(selectedCompanyId));
    return match?.name || t("common.company", "Your Organization");
  }, [companies, selectedCompanyId, t]);

  // Poll job status during and after background processing
  useEffect(() => {
    if (!activeJobId) return;
    if (jobStatus?.status === "COMPLETED" || jobStatus?.status === "FAILED") return;

    const interval = setInterval(async () => {
      try {
        const res = await api.get<JobStatus>(`/migrations/jobs/${activeJobId}`);
        const status: JobStatus = (res.data as any)?.data ?? res.data ?? res;
        setJobStatus(status);

        if (status.status === "COMPLETED") {
          if (status.failedCount === 0) {
            toast.success(
              status.dryRun
                ? t("migrations.toast.dryRunSuccess", "Dry run verified: {{count}} items validated successfully!", { count: status.successCount })
                : t("migrations.toast.migrationSuccess", "Migration completed: {{count}} items imported!", { count: status.successCount })
            );
          } else {
            toast.warning(
              t("migrations.toast.completedWithIssues", "Migration completed with issues: {{successCount}} succeeded, {{failedCount}} failed.", {
                successCount: status.successCount,
                failedCount: status.failedCount,
              })
            );
          }
        } else if (status.status === "FAILED") {
          toast.error(t("migrations.toast.fatalError", "Migration job encountered a fatal error."));
        }
      } catch (err: any) {
        console.error("Failed to poll migration job status", err);
      }
    }, 1500);

    return () => clearInterval(interval);
  }, [activeJobId, jobStatus?.status, t]);

  const handleStartMigration = async () => {
    if (!file) {
      toast.error(t("migrations.toast.selectFile", "Please select or drop a CSV or JSON file."));
      return;
    }

    const companyIdToUse = selectedCompanyId ? Number(selectedCompanyId) : 1;
    if (!companyIdToUse) {
      toast.error(t("migrations.toast.selectCompany", "Please select a target company."));
      return;
    }

    setJobStatus(null);
    try {
      const jobId = await uploadFile(file, {
        companyId: companyIdToUse,
        domain,
        dryRun,
        autoCreateMasterData,
      });
      setActiveJobId(jobId);
      toast.info(t("migrations.toast.uploadSuccess", "File uploaded successfully. Processing ingestion in background..."));
    } catch (err: any) {
      toast.error(err?.message || t("migrations.toast.startFailed", "Failed to start migration."));
    }
  };

  const handleDownloadFailureCsv = async () => {
    if (!activeJobId) return;
    setIsDownloadingErrors(true);
    try {
      const res = await api.get(`/migrations/jobs/${activeJobId}/errors/csv`, {
        responseType: "blob",
      });
      const blob = new Blob([res.data], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `failed_rows_${activeJobId}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success(t("migrations.toast.downloadedReport", "Downloaded failure report."));
    } catch (err: any) {
      toast.error(err?.message || t("migrations.toast.downloadFailed", "Failed to download failure report."));
    } finally {
      setIsDownloadingErrors(false);
    }
  };

  const handleCopyHeaderRow = () => {
    const headers =
      "Product Name,Brand,Category,Base Unit,Packaging Units,Variant Name,SKU,Barcode,Sell Price,Cost Price,Stock Quantity";
    navigator.clipboard.writeText(headers);
    setCopiedSchema(true);
    toast.success(t("migrations.toast.headerCopied", "CSV header row copied to clipboard!"));
    setTimeout(() => setCopiedSchema(false), 2000);
  };

  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
  };

  const processingPercent =
    jobStatus?.totalRows && jobStatus.totalRows > 0
      ? Math.round((jobStatus.processedRows / jobStatus.totalRows) * 100)
      : 0;

  const isBusy = isUploading || jobStatus?.status === "PROCESSING";

  return (
    <div className="container mx-auto p-4 md:p-8 max-w-5xl space-y-6">
      {/* Top Header Card */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-2 border-b border-border/60">
        <div className="flex items-start gap-3.5">
          <div className="size-11 rounded-2xl bg-gradient-to-br from-primary/20 via-primary/10 to-transparent border border-primary/25 flex items-center justify-center text-primary shadow-xs shrink-0 mt-0.5">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
                {t("migrations.title", "Data Migration Center")}
              </h1>
              <Badge
                variant="outline"
                className="bg-primary/5 text-primary border-primary/25 text-[11px] font-semibold tracking-wide py-0.5 px-2.5 rounded-full flex items-center gap-1.5"
              >
                <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                {t("migrations.etlPipeline", "ETL PIPELINE")}
              </Badge>
            </div>
            <p className="text-xs md:text-sm text-muted-foreground mt-1 leading-relaxed">
              {t("migrations.subtitle", "Resilient, multi-tenant bulk ingestion for catalogs, products, units, packaging tiers, and stock balances.")}
            </p>
          </div>
        </div>

        {/* Top Header Actions */}
        <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
          <ModernButton
            variant="ghost"
            size="sm"
            rounded="xl"
            leftIcon={<Info className="w-3.5 h-3.5 text-muted-foreground" />}
            onClick={() => setShowSchemaGuide(!showSchemaGuide)}
            className="text-xs font-semibold"
          >
            {showSchemaGuide ? t("migrations.hideSchema", "Hide Schema") : t("migrations.schemaGuide", "Schema Guide")}
          </ModernButton>

          <a
            href="/sample-catalog-migration.csv"
            download="sample-catalog-migration.csv"
            className="inline-flex"
          >
            <ModernButton
              variant="outline"
              size="sm"
              rounded="xl"
              leftIcon={<Download className="w-3.5 h-3.5 text-primary" />}
              className="text-xs font-semibold"
            >
              {t("migrations.downloadSampleCsv", "Download Sample CSV")}
            </ModernButton>
          </a>
        </div>
      </div>

      {/* Collapsible Schema & Field Specifications Guide */}
      <Collapsible open={showSchemaGuide} onOpenChange={setShowSchemaGuide}>
        <CollapsibleContent className="space-y-3 pt-1">
          <Card className="border-primary/20 bg-primary/[0.02] shadow-xs">
            <CardHeader className="pb-3 border-b border-border/50">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
                    <FileText className="w-4 h-4 text-primary" />
                    <span>{t("migrations.schemaTitle", "Catalog CSV Schema Specifications")}</span>
                  </CardTitle>
                  <CardDescription className="text-xs mt-0.5">
                    {t("migrations.schemaSubtitle", "Columns required and optional for automatic catalog ingestion and hierarchy resolution.")}
                  </CardDescription>
                </div>
                <ModernButton
                  variant="outline"
                  size="xs"
                  rounded="lg"
                  leftIcon={copiedSchema ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                  onClick={handleCopyHeaderRow}
                  className="text-xs"
                >
                  {copiedSchema ? t("migrations.headersCopied", "Headers Copied") : t("migrations.copyHeaderRow", "Copy Header Row")}
                </ModernButton>
              </div>
            </CardHeader>
            <CardContent className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {csvSchemaFields.map((col) => (
                  <div
                    key={col.field}
                    className="p-2.5 rounded-xl border border-border/70 bg-card/60 space-y-1 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-foreground">{col.field}</span>
                      <Badge
                        variant={col.required ? "default" : "secondary"}
                        className="text-[9px] px-1.5 py-0 uppercase"
                      >
                        {col.required ? t("common.required", "Required") : t("common.optional", "Optional")}
                      </Badge>
                    </div>
                    <div className="text-[11px] text-muted-foreground font-mono truncate">
                      e.g. {col.example}
                    </div>
                    <p className="text-[11px] text-muted-foreground/80 leading-tight">
                      {col.desc}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>

      {/* Step 1 & Step 2 Configuration Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-30">
        {/* Step 1: Domain Selection */}
        <Card className="rounded-2xl border-border/70 shadow-2xs hover:shadow-xs transition-shadow overflow-visible relative focus-within:z-40">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <div className="size-6 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                  <Layers className="w-3.5 h-3.5" />
                </div>
                <span>{t("migrations.step1Title", "1. Select Migration Domain")}</span>
              </CardTitle>
              <Badge variant="outline" className="text-[10px] uppercase font-bold text-muted-foreground">
                {t("migrations.step1Badge", "Step 1")}
              </Badge>
            </div>
            <CardDescription className="text-xs">
              {t("migrations.step1Desc", "Select the data entity group to import into your workspace.")}
            </CardDescription>
          </CardHeader>
          <CardContent className="overflow-visible">
            <ModernSelect
              options={domainOptions}
              value={domain}
              onChange={(val) => setDomain(val)}
              disabled={isBusy}
              placeholder={t("migrations.domainPlaceholder", "Choose migration domain...")}
              variant="outline"
              selectSize="md"
              className="rounded-xl font-medium"
            />
          </CardContent>
        </Card>

        {/* Step 2: Tenant Organization */}
        <Card className="rounded-2xl border-border/70 shadow-2xs hover:shadow-xs transition-shadow overflow-visible relative focus-within:z-40">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <div className="size-6 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                  <Building2 className="w-3.5 h-3.5" />
                </div>
                <span>{t("migrations.step2Title", "2. Target Organization (Tenant)")}</span>
              </CardTitle>
              <Badge variant="outline" className="text-[10px] uppercase font-bold text-muted-foreground">
                {t("migrations.step2Badge", "Step 2")}
              </Badge>
            </div>
            <CardDescription className="text-xs">
              {isSystemAdmin
                ? t("migrations.step2DescAdmin", "Platform Admin: assign data migration to any registered tenant.")
                : t("migrations.step2DescTenant", "Tenant Admin: migrations are strictly scoped to your organization.")}
            </CardDescription>
          </CardHeader>
          <CardContent className="overflow-visible">
            {isSystemAdmin ? (
              <ModernSelect
                options={companyOptions}
                value={selectedCompanyId || ""}
                onChange={(val) => setSelectedCompanyId(val || null)}
                disabled={isBusy || isLoadingCompanies}
                isLoading={isLoadingCompanies}
                searchable
                placeholder={t("migrations.selectTargetOrg", "Select target organization...")}
                leftIcon={<Building2 className="w-4 h-4 text-primary" />}
                variant="outline"
                selectSize="md"
                className="rounded-xl font-medium"
              />
            ) : (
              <div className="flex items-center gap-3 p-3 rounded-xl border border-border/80 bg-muted/30">
                <div className="size-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-xs text-foreground truncate">
                    {activeTenantName}
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    {t("migrations.tenantScopedEnv", "Tenant Scoped Environment")}
                  </div>
                </div>
                <Badge variant="secondary" className="text-[10px] font-semibold shrink-0">
                  {t("migrations.verified", "Verified")}
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Step 3: File Dropzone */}
      <Card className="rounded-2xl border-border/70 shadow-2xs">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <div className="size-6 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                <FileSpreadsheet className="w-3.5 h-3.5" />
              </div>
              <span>{t("migrations.step3Title", "3. Upload Data File (.csv or .json)")}</span>
            </CardTitle>
            <Badge variant="outline" className="text-[10px] uppercase font-bold text-muted-foreground">
              {t("migrations.step3Badge", "Step 3")}
            </Badge>
          </div>
          <CardDescription className="text-xs">
            {t("migrations.step3Desc", "Files are sliced into 5MB chunks and streamed with automatic network backoff retry.")}
          </CardDescription>
        </CardHeader>

        <CardContent>
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleFileDrop}
            onClick={() => !isBusy && fileInputRef.current?.click()}
            className={`group relative rounded-2xl border-2 border-dashed p-8 md:p-10 text-center transition-all duration-200 cursor-pointer ${
              isBusy
                ? "opacity-60 cursor-not-allowed border-border bg-muted/20"
                : file
                ? "border-emerald-500/80 bg-emerald-500/[0.03] dark:bg-emerald-500/[0.05]"
                : "border-border/80 hover:border-primary/60 hover:bg-primary/[0.02]"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.json"
              disabled={isBusy}
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />

            {file ? (
              <div className="flex flex-col items-center justify-center gap-3">
                <div className="size-14 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center ring-4 ring-emerald-500/10 shadow-xs">
                  <FileSpreadsheet className="w-7 h-7" />
                </div>
                <div className="space-y-1 max-w-md">
                  <div className="font-bold text-sm text-foreground truncate">
                    {file.name}
                  </div>
                  <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                    <span>{formatFileSize(file.size)}</span>
                    <span>•</span>
                    <Badge
                      variant="outline"
                      className="text-[10px] uppercase font-semibold tracking-wider text-emerald-600 border-emerald-500/30 bg-emerald-500/5"
                    >
                      {t("migrations.readyForIngestion", "Ready for Ingestion")}
                    </Badge>
                  </div>
                </div>

                {!isBusy && (
                  <div className="flex items-center gap-2 mt-2" onClick={(e) => e.stopPropagation()}>
                    <ModernButton
                      type="button"
                      variant="outline"
                      size="xs"
                      rounded="lg"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      {t("migrations.changeFile", "Change File")}
                    </ModernButton>
                    <ModernButton
                      type="button"
                      variant="ghost"
                      size="xs"
                      rounded="lg"
                      className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                      onClick={() => setFile(null)}
                    >
                      <X className="w-3.5 h-3.5 mr-1" />
                      {t("migrations.removeFile", "Remove")}
                    </ModernButton>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center gap-3">
                <div className="size-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center ring-8 ring-primary/5 shadow-xs group-hover:scale-105 transition-transform duration-200">
                  <UploadCloud className="w-7 h-7" />
                </div>
                <div className="space-y-1">
                  <div className="font-semibold text-sm text-foreground">
                    {t("migrations.dropzoneHeading", "Drag & drop your CSV or JSON dataset here")}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {t("migrations.dropzoneSubheading", "or click anywhere to browse from your computer")}
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-1.5 pt-2">
                  <Badge variant="secondary" className="text-[10px] font-mono font-semibold px-2 py-0.5">
                    .CSV
                  </Badge>
                  <Badge variant="secondary" className="text-[10px] font-mono font-semibold px-2 py-0.5">
                    .JSON
                  </Badge>
                  <Badge variant="outline" className="text-[10px] text-muted-foreground px-2 py-0.5">
                    {t("migrations.resumableSlicing", "5MB Resumable Slicing")}
                  </Badge>
                  <Badge variant="outline" className="text-[10px] text-muted-foreground px-2 py-0.5">
                    {t("migrations.largeFilesSupported", "100MB+ Supported")}
                  </Badge>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Step 4: Ingestion Settings & Execution Bar */}
      <Card className="rounded-2xl border-border/70 shadow-2xs overflow-hidden">
        <CardHeader className="pb-3 border-b border-border/50 bg-muted/[0.15]">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <div className="size-6 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                <Sparkles className="w-3.5 h-3.5" />
              </div>
              <span>{t("migrations.step4Title", "4. Ingestion Controls & Settings")}</span>
            </CardTitle>
            <Badge variant="outline" className="text-[10px] uppercase font-bold text-muted-foreground">
              {t("migrations.step4Badge", "Step 4")}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="p-4 md:p-6 space-y-6">
          {/* Custom ModernSwitch Toggles in Card Variant */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ModernSwitch
              variant="card"
              label={t("migrations.dryRunLabel", "Dry Run Pre-flight")}
              description={t("migrations.dryRunDesc", "Simulate complete ingestion and validate schemas without writing rows to database.")}
              checked={dryRun}
              onCheckedChange={(val) => setDryRun(val)}
              disabled={isBusy}
              showStatusBadge
              activeText={t("migrations.simulation", "Simulation")}
              inactiveText={t("migrations.commitToDb", "Commit to DB")}
              className="h-full bg-card rounded-xl border-border/70"
            />

            <ModernSwitch
              variant="card"
              label={t("migrations.autoCreateLabel", "Auto-create Master Data")}
              description={t("migrations.autoCreateDesc", "Automatically register missing Brands, Categories, and Measurement Units on the fly.")}
              checked={autoCreateMasterData}
              onCheckedChange={(val) => setAutoCreateMasterData(val)}
              disabled={isBusy}
              showStatusBadge
              activeText={t("common.enabled", "Enabled")}
              inactiveText={t("migrations.strictMode", "Strict Mode")}
              className="h-full bg-card rounded-xl border-border/70"
            />
          </div>

          {/* Action Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-3 border-t border-border/60">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {dryRun ? (
                <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-medium">
                  <ShieldCheck className="w-4 h-4 shrink-0" />
                  {t("migrations.dryRunActiveNote", "Dry Run active: No database rows will be created or modified.")}
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-foreground/80 font-medium">
                  <Database className="w-4 h-4 text-primary shrink-0" />
                  {t("migrations.liveModeNote", "Live Mode: Ingestion will create new products, variants, and stock balances.")}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2.5 w-full sm:w-auto">
              {isUploading && (
                <ModernButton
                  type="button"
                  variant="outline"
                  size="md"
                  rounded="xl"
                  onClick={cancelUpload}
                >
                  {t("migrations.cancelUpload", "Cancel Upload")}
                </ModernButton>
              )}

              <ModernButton
                type="button"
                variant={dryRun ? "amber" : "primary"}
                size="md"
                rounded="xl"
                glow={Boolean(file && !isBusy)}
                disabled={!file || isBusy}
                isLoading={isBusy}
                loadingText={
                  isUploading
                    ? t("migrations.uploadingProgress", "Uploading ({{percent}}%)", { percent: uploadPercent })
                    : t("migrations.processingIngestion", "Processing Ingestion...")
                }
                leftIcon={dryRun ? <ShieldCheck className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
                onClick={handleStartMigration}
                className="w-full sm:w-auto font-bold px-6"
              >
                {dryRun ? t("migrations.runPreFlight", "Run Pre-flight Dry Run") : t("migrations.executeMigration", "Execute Migration")}
              </ModernButton>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Progress & Results Live Monitor */}
      {(isUploading || jobStatus) && (
        <Card className="rounded-2xl border border-primary/25 shadow-md overflow-hidden animate-in fade-in-50 duration-300">
          <CardHeader className="pb-3.5 border-b border-border/60 bg-muted/25">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm md:text-base font-bold flex items-center gap-2">
                <RefreshCw
                  className={`w-4 h-4 text-primary ${isBusy ? "animate-spin" : ""}`}
                />
                <span>{t("migrations.liveMonitorTitle", "Live Migration Monitor")}</span>
              </CardTitle>

              {jobStatus?.status && (
                <Badge
                  variant={
                    jobStatus.status === "COMPLETED"
                      ? jobStatus.failedCount > 0
                        ? "destructive"
                        : "default"
                      : jobStatus.status === "FAILED"
                      ? "destructive"
                      : "outline"
                  }
                  className="rounded-full text-xs font-bold px-3 py-0.5 uppercase tracking-wider"
                >
                  {jobStatus.status}
                </Badge>
              )}
            </div>
          </CardHeader>

          <CardContent className="p-4 md:p-6 space-y-6">
            {/* Phase 1: Chunk Upload Progress */}
            <div className="space-y-2 p-3.5 rounded-xl border border-border/60 bg-card/60">
              <div className="flex justify-between items-center text-xs font-semibold">
                <span className="flex items-center gap-2 text-foreground">
                  <UploadCloud className="w-4 h-4 text-blue-600" />
                  {t("migrations.phase1Title", "Phase 1: Resilient Multi-Chunk Stream")}
                </span>
                <span className="font-mono text-muted-foreground">
                  {uploadPercent}% {totalChunks > 0 && `(Chunk ${currentChunk}/${totalChunks})`}
                </span>
              </div>
              <Progress value={uploadPercent} className="h-2 rounded-full" />
            </div>

            {/* Phase 2: Database Ingestion Progress */}
            {jobStatus && (
              <div className="space-y-2 p-3.5 rounded-xl border border-border/60 bg-card/60">
                <div className="flex justify-between items-center text-xs font-semibold">
                  <span className="flex items-center gap-2 text-foreground">
                    <Layers className="w-4 h-4 text-emerald-600" />
                    {t("migrations.phase2Title", "Phase 2: Database Ingestion & Verification")}
                  </span>
                  <span className="font-mono text-muted-foreground">
                    {jobStatus.processedRows} / {jobStatus.totalRows || "?"} rows ({processingPercent}%)
                  </span>
                </div>
                <Progress value={processingPercent} className="h-2 rounded-full" />
              </div>
            )}

            {/* Statistics KPI Grid */}
            {jobStatus && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
                <div className="p-4 rounded-2xl border border-border/70 bg-card shadow-2xs space-y-1">
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span className="text-xs font-medium">{t("migrations.totalRows", "Total Rows")}</span>
                    <FileText className="w-4 h-4 text-muted-foreground/70" />
                  </div>
                  <div className="text-2xl font-extrabold text-foreground tracking-tight">
                    {jobStatus.totalRows}
                  </div>
                </div>

                <div className="p-4 rounded-2xl border border-border/70 bg-card shadow-2xs space-y-1">
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span className="text-xs font-medium">{t("migrations.processed", "Processed")}</span>
                    <RefreshCw className="w-4 h-4 text-muted-foreground/70" />
                  </div>
                  <div className="text-2xl font-extrabold text-foreground tracking-tight">
                    {jobStatus.processedRows}
                  </div>
                </div>

                <div className="p-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/[0.04] dark:bg-emerald-500/[0.08] shadow-2xs space-y-1">
                  <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400">
                    <span className="text-xs font-medium">{t("migrations.succeeded", "Succeeded")}</span>
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 tracking-tight">
                    {jobStatus.successCount}
                  </div>
                </div>

                <div
                  className={`p-4 rounded-2xl border shadow-2xs space-y-1 ${
                    jobStatus.failedCount > 0
                      ? "border-rose-500/30 bg-rose-500/[0.04] dark:bg-rose-500/[0.08]"
                      : "border-border/70 bg-card"
                  }`}
                >
                  <div
                    className={`flex items-center justify-between ${
                      jobStatus.failedCount > 0
                        ? "text-rose-600 dark:text-rose-400"
                        : "text-muted-foreground"
                    }`}
                  >
                    <span className="text-xs font-medium">{t("migrations.failedRecords", "Failed Records")}</span>
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <div
                    className={`text-2xl font-extrabold tracking-tight ${
                      jobStatus.failedCount > 0
                        ? "text-rose-600 dark:text-rose-400"
                        : "text-foreground"
                    }`}
                  >
                    {jobStatus.failedCount}
                  </div>
                </div>
              </div>
            )}

            {/* Quarantine & Error Remediation Download */}
            {jobStatus && jobStatus.failedCount > 0 && (
              <div className="p-4 rounded-2xl border border-rose-500/30 bg-rose-500/[0.03] dark:bg-rose-500/[0.08] space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-rose-700 dark:text-rose-300">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{t("migrations.rowsFailedValidation", "{{count}} rows failed schema or business validation", { count: jobStatus.failedCount })}</span>
                  </div>

                  {jobStatus.failureDownloadUrl && (
                    <ModernButton
                      type="button"
                      variant="destructive"
                      size="sm"
                      rounded="xl"
                      isLoading={isDownloadingErrors}
                      loadingText={t("migrations.downloading", "Downloading...")}
                      leftIcon={<Download className="w-3.5 h-3.5" />}
                      onClick={handleDownloadFailureCsv}
                      className="text-xs font-semibold shrink-0"
                    >
                      {t("migrations.downloadFailedRows", "Download Failed Rows (.csv)")}
                    </ModernButton>
                  )}
                </div>

                {jobStatus.errorMessages && jobStatus.errorMessages.length > 0 && (
                  <div className="text-xs space-y-1.5 max-h-40 overflow-y-auto p-3 rounded-xl bg-background border border-border/80 font-mono">
                    {jobStatus.errorMessages.map((msg, i) => (
                      <div key={i} className="text-rose-600 dark:text-rose-400">
                        • {msg}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
