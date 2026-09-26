import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Background,
  BackgroundVariant,
  Controls,
  MarkerType,
  MiniMap,
  ReactFlow,
  useEdgesState,
  useNodesState,
  type Connection,
  type Edge,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Network } from "lucide-react";
import { useProjectStore } from "../../stores/projectStore";
import { useCharacterStore, type Character } from "../../stores/characterStore";
import {
  relationTypeColors,
  relationTypes,
  useRelationStore,
  type CharacterRelation,
} from "../../stores/relationStore";
import { EmptyState } from "../ui";
import { RelationDialog } from "./RelationDialog";

type CharacterNodeData = { character: Character };
type CharacterNodeType = Node<CharacterNodeData, "character">;

function CharacterNode({ data }: NodeProps<CharacterNodeType>) {
  const { character } = data;
  const initial = character.name?.trim()?.[0];
  return (
    <div className="cursor-pointer rounded-xl border border-line bg-surface px-3 py-2 shadow-xs transition-shadow hover:shadow-md">
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
  const { relations, positions, setPosition } = useRelationStore();

  const [nodes, setNodes, onNodesChange] = useNodesState<CharacterNodeType>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editRelation, setEditRelation] = useState<CharacterRelation | null>(null);
  const [preset, setPreset] = useState<{ sourceId?: string; targetId?: string } | undefined>(
    undefined,
  );

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
          return {
            id: r.id,
            source: r.sourceId,
            target: r.targetId,
            label: r.label || typeLabel,
            style: { stroke: color, strokeWidth: 2 },
            labelStyle: { fill: "var(--app-ink)", fontSize: 11, fontWeight: 500 },
            labelBgStyle: { fill: "var(--app-elevated)" },
            markerEnd: r.directed
              ? { type: MarkerType.ArrowClosed, color, width: 16, height: 16 }
              : undefined,
          };
        }),
    );
  }, [projectRelations, nameById, setEdges]);

  const onConnect = useCallback((conn: Connection) => {
    if (!conn.source || !conn.target || conn.source === conn.target) return;
    setEditRelation(null);
    setPreset({ sourceId: conn.source, targetId: conn.target });
    setDialogOpen(true);
  }, []);

  const onNodeClick = useCallback(
    (_: unknown, node: CharacterNodeType) => {
      const c = characters.find((x) => x.id === node.id);
      if (c) setCurrentCharacter(c);
    },
    [characters, setCurrentCharacter],
  );

  const onEdgeDoubleClick = useCallback(
    (_: unknown, edge: Edge) => {
      const r = projectRelations.find((x) => x.id === edge.id);
      if (r) {
        setEditRelation(r);
        setPreset(undefined);
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
    <div className="h-[min(72vh,760px)] overflow-hidden rounded-xl border border-line">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onEdgeDoubleClick={onEdgeDoubleClick}
        onNodeDragStop={onNodeDragStop}
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
