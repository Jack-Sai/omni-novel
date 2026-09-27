import { useState, useEffect, useCallback, useMemo } from "react";
import { AlertTriangle, FileSearch, Loader2, MapPin, ShieldCheck, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  checkConsistency,
  listReports,
  reportDetail,
  deleteReport,
} from "../services/consistencyService";
import type { ConsistencyIssue, ConsistencyReportRow } from "../services";
import { useProjectStore } from "../stores/projectStore";
import { useChapterStore } from "../stores/chapterStore";
import { useUIStore } from "../stores/uiStore";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Page,
  PageBody,
  PageHeader,
} from "../components/ui";
import type { BadgeVariant } from "../components/ui";
import { cn } from "../lib/cn";
import { currentLocale } from "../i18n/format";

const severityLabels = { high: "严重", medium: "中等", low: "轻微" } as const;
const severityVariants: Record<ConsistencyIssue["severity"], BadgeVariant> = {
  high: "danger",
  medium: "warning",
  low: "neutral",
};
const typeLabels: Record<ConsistencyIssue["type"], string> = {
  character: "人物",
  timeline: "时间线",
  worldview: "世界观",
  plot: "情节",
  foreshadow: "伏笔",
  other: "其他",
};

function formatTime(iso: string): string {
  const d = new Date(iso.includes("T") ? iso : iso.replace(" ", "T") + "Z");
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(currentLocale(), { hour12: false });
}

export function ConsistencyPage() {
  const navigate = useNavigate();
  const { currentProject } = useProjectStore();
  const chapters = useChapterStore((s) => s.chapters);
  const projectChapters = useMemo(
    () =>
      chapters
        .filter((c) => c.projectId === currentProject?.id)
        .sort((a, b) => a.order - b.order),
    [chapters, currentProject?.id],
  );

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [reports, setReports] = useState<ConsistencyReportRow[]>([]);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");
  const [loadingReports, setLoadingReports] = useState(false);

  const refreshReports = useCallback(async () => {
    if (!currentProject) return;
    setLoadingReports(true);
    try {
      const rows = await listReports(currentProject.id);
      setReports(rows);
      setSelectedReportId((prev) => prev ?? rows[0]?.id ?? null);
    } catch (e) {
      console.warn("加载一致性报告失败:", e);
    } finally {
      setLoadingReports(false);
    }
  }, [currentProject]);

  useEffect(() => {
    void refreshReports();
  }, [refreshReports]);

  const toggleChapter = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectRecent = (n: number) => {
    setSelectedIds(new Set(projectChapters.slice(-n).map((c) => c.id)));
  };

  const selectedReport = reports.find((r) => r.id === selectedReportId) || null;
  const selectedDetail = selectedReport ? reportDetail(selectedReport) : null;

  const handleRun = async () => {
    if (!currentProject || selectedIds.size === 0 || running) return;
    setRunning(true);
    setError("");
    try {
      await checkConsistency(currentProject.id, [...selectedIds]);
      setSelectedIds(new Set());
      await refreshReports();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setRunning(false);
    }
  };

  const handleDeleteReport = async (id: string) => {
    try {
      await deleteReport(id);
      setReports((prev) => prev.filter((r) => r.id !== id));
      if (selectedReportId === id) setSelectedReportId(null);
    } catch (e) {
      console.warn("删除报告失败:", e);
    }
  };

  /** issue.chapters 是标题：优先在本次报告快照中匹配，其次全书章节标题 */
  const locateChapter = (title: string) => {
    let id: string | undefined;
    if (selectedDetail) {
      const idx = selectedDetail.chapterTitles.indexOf(title);
      if (idx >= 0) id = selectedDetail.chapterIds[idx];
    }
    if (!id) id = projectChapters.find((c) => c.title === title)?.id;
    if (!id) return;
    useUIStore.getState().setPendingOpenChapterId(id);
    void navigate("/editor");
  };

  if (!currentProject) {
    return (
      <Page>
        <PageBody>
          <EmptyState
            icon={ShieldCheck}
            title="请先选择一个项目"
            description="在书架中打开一个项目后，即可运行一致性检查。"
          />
        </PageBody>
      </Page>
    );
  }

  const counts = selectedDetail
    ? {
        high: selectedDetail.issues.filter((i) => i.severity === "high").length,
        medium: selectedDetail.issues.filter((i) => i.severity === "medium").length,
        low: selectedDetail.issues.filter((i) => i.severity === "low").length,
      }
    : null;

  return (
    <Page>
      <PageHeader
        title="一致性检查"
        description={
          selectedIds.size > 0
            ? `已选 ${selectedIds.size} 章 · 共 ${reports.length} 份历史报告`
            : `共 ${reports.length} 份报告 · 勾选章节后运行`
        }
        actions={
          <Button
            variant="primary"
            disabled={selectedIds.size === 0 || running}
            onClick={() => void handleRun()}
          >
            {running ? (
              <>
                <Loader2 size={15} className="animate-spin" />
                检查中
              </>
            ) : (
              <>
                <ShieldCheck size={15} />
                运行检查{selectedIds.size > 0 ? `（${selectedIds.size} 章）` : ""}
              </>
            )}
          </Button>
        }
      />
      <PageBody>
        {error && (
          <div className="mb-4 flex items-start gap-2 rounded-lg border border-danger-line bg-danger-soft px-3.5 py-2.5 text-[13px] text-danger">
            <AlertTriangle size={15} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        <div className="grid min-h-0 flex-1 gap-5 lg:grid-cols-[300px_minmax(0,1fr)]">
          {/* 左栏：章节选择 */}
          <Card className="h-fit max-h-[calc(100vh-220px)] overflow-hidden p-0">
            <div className="border-b border-line px-4 py-3">
              <p className="text-sm font-medium text-ink">选择章节</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {[3, 5, 10].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => selectRecent(n)}
                    className="rounded-md border border-line px-2 py-0.5 text-[12px] text-ink-2 hover:bg-hover"
                  >
                    最近 {n} 章
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setSelectedIds(new Set(projectChapters.map((c) => c.id)))}
                  className="rounded-md border border-line px-2 py-0.5 text-[12px] text-ink-2 hover:bg-hover"
                >
                  全选
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedIds(new Set())}
                  className="rounded-md border border-line px-2 py-0.5 text-[12px] text-ink-2 hover:bg-hover"
                >
                  清空
                </button>
              </div>
            </div>
            <div className="max-h-[50vh] overflow-y-auto p-2">
              {projectChapters.length === 0 ? (
                <p className="px-2 py-6 text-center text-[13px] text-ink-3">暂无章节</p>
              ) : (
                projectChapters.map((c) => {
                  const checked = selectedIds.has(c.id);
                  return (
                    <label
                      key={c.id}
                      className={cn(
                        "flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px]",
                        checked ? "bg-primary-soft text-primary" : "text-ink-2 hover:bg-hover",
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleChapter(c.id)}
                        className="shrink-0"
                      />
                      <span className="min-w-0 flex-1 truncate">
                        {c.order}. {c.title || "未命名"}
                      </span>
                      {c.summary && (
                        <span className="shrink-0 text-[11px] text-ink-3">摘要✓</span>
                      )}
                    </label>
                  );
                })
              )}
            </div>
          </Card>

          {/* 右栏：报告 + 问题列表 */}
          <div className="flex min-w-0 flex-col gap-4">
            {loadingReports && reports.length === 0 ? (
              <div className="flex items-center justify-center gap-2 py-16 text-[13px] text-ink-3">
                <Loader2 size={16} className="animate-spin" /> 加载报告中…
              </div>
            ) : reports.length === 0 ? (
              <EmptyState
                icon={FileSearch}
                title="还没有检查报告"
                description="在左侧勾选需要审校的章节（建议连续章节，便于跨章比对），点击「运行检查」生成结构化矛盾报告。"
              />
            ) : (
              <>
                {/* 报告历史 */}
                <div className="flex flex-wrap gap-2">
                  {reports.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setSelectedReportId(r.id)}
                      className={cn(
                        "group flex items-center gap-2 rounded-lg border px-3 py-1.5 text-[12px] transition-colors",
                        r.id === selectedReportId
                          ? "border-primary-line bg-primary-soft text-primary"
                          : "border-line bg-surface text-ink-2 hover:bg-hover",
                      )}
                    >
                      <span>{formatTime(r.created_at)}</span>
                      <span
                        className={cn(
                          "font-medium",
                          r.issue_count === 0 ? "text-success" : "text-danger",
                        )}
                      >
                        {r.issue_count} 个问题
                      </span>
                      <span
                        role="button"
                        tabIndex={0}
                        aria-label="删除报告"
                        onClick={(e) => {
                          e.stopPropagation();
                          void handleDeleteReport(r.id);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.stopPropagation();
                            void handleDeleteReport(r.id);
                          }
                        }}
                        className="opacity-0 transition-opacity group-hover:opacity-60 hover:!opacity-100"
                      >
                        <Trash2 size={12} />
                      </span>
                    </button>
                  ))}
                </div>

                {/* 选中报告详情 */}
                {selectedDetail && counts && (
                  <Card className="p-4">
                    <div className="mb-3 flex flex-wrap items-center gap-2 border-b border-line pb-3">
                      <p className="text-sm font-medium text-ink">
                        报告 · {formatTime(selectedReport!.created_at)}
                      </p>
                      <Badge variant="danger">{counts.high} 严重</Badge>
                      <Badge variant="warning">{counts.medium} 中等</Badge>
                      <Badge variant="neutral">{counts.low} 轻微</Badge>
                      <span className="ml-auto text-[12px] text-ink-3">
                        检测章节：{selectedDetail.chapterTitles.join("、")}
                      </span>
                    </div>
                    {selectedDetail.issues.length === 0 ? (
                      <div className="py-8 text-center">
                        <p className="text-sm font-medium text-success">未发现一致性问题</p>
                        <p className="mt-1 text-[13px] text-ink-3">
                          权威设定与所选章节之间未检出矛盾
                        </p>
                      </div>
                    ) : (
                      <ul className="space-y-3">
                        {selectedDetail.issues.map((issue, i) => (
                          <li
                            key={i}
                            className="rounded-lg border border-line bg-subtle p-3.5"
                          >
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge variant={severityVariants[issue.severity]}>
                                {severityLabels[issue.severity]}
                              </Badge>
                              <Badge variant="outline">{typeLabels[issue.type]}</Badge>
                              <p className="min-w-0 flex-1 text-[14px] font-medium text-ink">
                                {issue.title}
                              </p>
                            </div>
                            {issue.description && (
                              <p className="mt-2 text-[13px] leading-relaxed text-ink-2">
                                {issue.description}
                              </p>
                            )}
                            {issue.evidence && (
                              <blockquote className="mt-2 border-l-2 border-warning-line bg-warning-soft/50 px-3 py-2 text-[12.5px] leading-relaxed text-ink-2">
                                {issue.evidence}
                              </blockquote>
                            )}
                            {issue.suggestion && (
                              <p className="mt-2 text-[12.5px] text-ink-3">
                                建议：{issue.suggestion}
                              </p>
                            )}
                            <div className="mt-2.5 flex flex-wrap items-center gap-2">
                              {issue.chapters.map((title) => (
                                <button
                                  key={title}
                                  type="button"
                                  onClick={() => locateChapter(title)}
                                  className="inline-flex items-center gap-1 rounded-md border border-line px-2 py-0.5 text-[12px] text-ink-2 hover:bg-hover"
                                >
                                  <MapPin size={11} />
                                  {title}
                                </button>
                              ))}
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </Card>
                )}
              </>
            )}
          </div>
        </div>
      </PageBody>
    </Page>
  );
}
