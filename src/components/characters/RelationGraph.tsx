import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  MarkerType,
  MiniMap,
  Position,
  ReactFlow,
  useEdgesState,
  useNodesState,
  type Connection,
  type Edge,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Network, Pencil, Trash2 } from "lucide-react";
import { useProjectStore } from "../../stores/projectStore";
import { useCharacterStore, type Character } from "../../stores/characterStore";
import {
  relationTypeColors,
  relationTypes,
  useRelationStore,
  type CharacterRelation,
} from "../../stores/relationStore";
import { Button, EmptyState } from "../ui";
import { RelationDialog } from "./RelationDialog";

type CharacterNodeData = { character: Character };
type CharacterNodeType = Node<CharacterNodeData, "character">;

function CharacterNode({ data }: NodeProps<CharacterNodeType>) {
  const { character } = data;
  const initial = character.name?.trim()?.[0];
  return (
    <div className="relative cursor-pointer rounded-xl border border-line bg-surface px-3 py-2 shadow-xs transition-shadow hover:shadow-md">
      {/* 连接点：左侧接入、右侧引出（悬停才明显） */}
      <Handle
        type="target"
        position={Position.Left}
        className="!h-3 !w-3 !border-2 !border-primary !bg-surface hover:!scale-125"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="!h-3 !w-3 !border-2 !border-primary !bg-surface hover:!scale-125"
      />
      <div className="flex items-center gap-2">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-soft text-[12px] font-semibold text-primary">
          {initial ?? "?"}
        </div>
        <div className="min-w-0">
          <div className="max-w-36 truncate text-[13px] font-medium text-ink">
            {character.name || "未命名人物"}
          </div>
          <div className="max-w-36 truncate text-[11px] text-ink-3">
            {[character.age, character.aliases[0] ? `又名 ${character.aliases[0]}` : null]
              .filter(Boolean)
              .join(" · ") || "\u00a0"}
          </div>
        </div>
      </div>
      {character.tags.length > 0 && (
        <div className="mt-1.5 flex max-w-40 flex-wrap gap-1">
          {character.tags.slice(0, 2).map((tag) => (
            <span
              key={tag}
              className="truncate rounded bg-subtle px-1.5 py-0.5 text-[10px] text-ink-3"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

const nodeTypes = { character: CharacterNode };

/** 环形初始布局：已有存档坐标的不动，缺失的补到圆周上 */
function ringPosition(index: number, total: number): { x: number; y: number } {
  const r = Math.max(200, total * 34);
  const angle = (index / Math.max(total, 1)) * Math.PI * 2 - Math.PI / 2;
  return { x: Math.cos(angle) * r, y: Math.sin(angle) * r };
}

export function RelationGraph() {
  const { currentProject } = useProjectStore();
  const { characters, setCurrentCharacter } = useCharacterStore();
  const { relations, positions, setPosition, deleteRelation } = useRelationStore();

  const [nodes, setNodes, onNodesChange] = useNodesState<CharacterNodeType>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editRelation, setEditRelation] = useState<CharacterRelation | null>(null);
  const [preset, setPreset] = useState<{ sourceId?: string; targetId?: string } | undefined>(
    undefined,
  );
  /** 单击选中的关系边（浮层提供编辑/删除） */
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);

  const projectCharacters = useMemo(
    () =>
      currentProject ? characters.filter((c) => c.projectId === currentProject.id) : [],
    [characters, currentProject],
  );
  const projectRelations = useMemo(
    () => (currentProject ? relations.filter((r) => r.projectId === currentProject.id) : []),
    [relations, currentProject],
  );
  const nameById = useMemo(
    () => new Map(projectCharacters.map((c) => [c.id, c.name || "未命名人物"])),
    [projectCharacters],
  );

  // 节点：人物派生；位置优先用存档，缺失补环形位
  useEffect(() => {
    const total = projectCharacters.length;
    setNodes(
      projectCharacters.map((c, i) => ({
        id: c.id,
        type: "character" as const,
        position: positions[c.id] ?? ringPosition(i, total),
        data: { character: c },
      })),
    );
  }, [projectCharacters, positions, setNodes]);

  // 边：关系派生（两端人物都存在才画）
  useEffect(() => {
    setEdges(
      projectRelations
        .filter((r) => nameById.has(r.sourceId) && nameById.has(r.targetId))
        .map((r) => {
          const color = relationTypeColors[r.type] ?? "#94a3b8";
          const typeLabel = relationTypes.find((t) => t.value === r.type)?.label ?? "关系";
          const selected = r.id === selectedEdgeId;
          return {
            id: r.id,
            source: r.sourceId,
            target: r.targetId,
            label: r.label || typeLabel,
            selected,
            style: { stroke: color, strokeWidth: selected ? 3.5 : 2 },
            labelStyle: { fill: "var(--app-ink)", fontSize: 11, fontWeight: 500 },
            labelBgStyle: { fill: "var(--app-elevated)" },
            markerEnd: r.directed
              ? {
                  type: MarkerType.ArrowClosed,
                  color,
                  width: selected ? 18 : 16,
                  height: selected ? 18 : 16,
                }
              : undefined,
          };
        }),
    );
  }, [projectRelations, nameById, selectedEdgeId, setEdges]);

  const onConnect = useCallback((conn: Connection) => {
    if (!conn.source || !conn.target || conn.source === conn.target) return;
    setEditRelation(null);
    setPreset({ sourceId: conn.source, targetId: conn.target });
    setSelectedEdgeId(null);
    setDialogOpen(true);
  }, []);

  const onNodeDoubleClick = useCallback(
    (_: unknown, node: CharacterNodeType) => {
      setSelectedEdgeId(null);
      const c = characters.find((x) => x.id === node.id);
      if (c) setCurrentCharacter(c);
    },
    [characters, setCurrentCharacter],
  );

  const onEdgeClick = useCallback((_: unknown, edge: Edge) => {
    setSelectedEdgeId((prev) => (prev === edge.id ? null : edge.id));
  }, []);

  const onPaneClick = useCallback(() => setSelectedEdgeId(null), []);

  const onEdgeDoubleClick = useCallback(
    (_: unknown, edge: Edge) => {
      const r = projectRelations.find((x) => x.id === edge.id);
      if (r) {
        setEditRelation(r);
        setPreset(undefined);
        setSelectedEdgeId(null);
        setDialogOpen(true);
      }
    },
    [projectRelations],
  );

  const onNodeDragStop = useCallback(
    (_: unknown, node: CharacterNodeType) => {
      setPosition(node.id, node.position);
    },
    [setPosition],
  );

  const selectedRelation = useMemo(
    () => projectRelations.find((r) => r.id === selectedEdgeId) ?? null,
    [projectRelations, selectedEdgeId],
  );

  const handleEditSelected = useCallback(() => {
    if (!selectedRelation) return;
    setEditRelation(selectedRelation);
    setPreset(undefined);
    setSelectedEdgeId(null);
    setDialogOpen(true);
  }, [selectedRelation]);

  const handleDeleteSelected = useCallback(() => {
    if (!selectedRelation) return;
    const s = nameById.get(selectedRelation.sourceId) ?? "?";
    const t = nameById.get(selectedRelation.targetId) ?? "?";
    if (!window.confirm(`删除「${s}」与「${t}」之间的关系？`)) return;
    deleteRelation(selectedRelation.id);
    setSelectedEdgeId(null);
  }, [selectedRelation, nameById, deleteRelation]);

  // 选中边时支持 Delete/Backspace 删除、Escape 取消选中
  useEffect(() => {
    if (!selectedEdgeId) return;
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (
        el &&
        (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable)
      ) {
        return;
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        handleDeleteSelected();
      } else if (e.key === "Escape") {
        setSelectedEdgeId(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedEdgeId, handleDeleteSelected]);

  if (projectCharacters.length < 2) {
    return (
      <EmptyState
        icon={Network}
        title={projectCharacters.length === 0 ? "还没有人物" : "至少需要两位人物"}
        description="创建两位以上人物后，即可在这里查看关系网、拖线建立关系。"
        className="py-16"
      />
    );
  }

  return (
    <div className="relative h-[min(72vh,760px)] overflow-hidden rounded-xl border border-line">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeDoubleClick={onNodeDoubleClick}
        onEdgeClick={onEdgeClick}
        onEdgeDoubleClick={onEdgeDoubleClick}
        onNodeDragStop={onNodeDragStop}
        onPaneClick={onPaneClick}
        fitView
        minZoom={0.2}
        maxZoom={2}
        nodesDraggable
        nodesConnectable
        deleteKeyCode={null}
        proOptions={{ hideAttribution: false }}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="var(--app-line)" />
        <Controls showInteractive={false} />
        <MiniMap
          pannable
          zoomable
          bgColor="var(--app-surface)"
          maskColor="rgba(0,0,0,0.08)"
          nodeColor={() => "var(--app-primary-soft)"}
        />
      </ReactFlow>

      {selectedRelation && (
        <div className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2 rounded-xl border border-line bg-elevated/95 px-3 py-2 shadow-lg backdrop-blur">
          <span className="max-w-52 truncate text-[12px] text-ink-2">
            {nameById.get(selectedRelation.sourceId)} → {nameById.get(selectedRelation.targetId)}
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1 px-2 text-xs"
            onClick={handleEditSelected}
          >
            <Pencil size={12} />
            编辑
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1 px-2 text-xs text-red-500 hover:text-red-600"
            onClick={handleDeleteSelected}
          >
            <Trash2 size={12} />
            删除
          </Button>
          <span className="text-[11px] text-ink-3">Del 删除 · Esc 取消</span>
        </div>
      )}

      {!selectedRelation && (
        <div className="pointer-events-none absolute bottom-3 left-1/2 z-10 -translate-x-1/2 rounded-full bg-elevated/80 px-3 py-1 text-[11px] text-ink-3 backdrop-blur">
          拖线建关系 · 单击选中 · 双击编辑 · 双击节点看人物
        </div>
      )}

      <RelationDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        projectId={currentProject?.id ?? ""}
        characters={projectCharacters}
        relation={editRelation}
        preset={preset}
      />
    </div>
  );
}
