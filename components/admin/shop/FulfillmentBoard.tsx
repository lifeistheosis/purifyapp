"use client";

// The Fulfillment tab's board view: paid orders as cards in four lanes, moved
// by dragging them from stage to stage. The lanes, and what a drop is allowed
// to do, are lib/shop/board.ts; this file only draws them and hands each drop
// back to the tab, which saves it through the same PATCH its buttons use.

import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { useState } from "react";

import { Mark } from "../Mark";

import { dropAction, LANES } from "@/lib/shop/board";
import { ageText, hoursBetween, isLate, STAGE, type FunnelOrder } from "@/lib/shop/funnel";
import { formatPrice } from "@/lib/shop/format";
import { orderConfirmationNumber } from "@/lib/shop/orderNumber";
import type { ShopFulfillmentStatus } from "@/lib/shop/types";

export type BoardOrder = FunnelOrder & {
  items: { title: string; quantity: number }[];
};

const ink = { color: "var(--adm-ink)" } as const;
const ink3 = { color: "var(--adm-ink-3)" } as const;

export function FulfillmentBoard<T extends BoardOrder>({
  orders,
  now,
  onMove,
  onOpen,
}: {
  orders: T[];
  now: Date;
  /** Save the move; resolves false when it did not save. */
  onMove: (order: T, to: ShopFulfillmentStatus) => Promise<boolean>;
  /** Open the order, for what a drag cannot carry (a tracking number). */
  onOpen: (order: T) => void;
}) {
  const [dragging, setDragging] = useState<T | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

  // A press has to travel before it is a drag, so a tap still opens the order.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor),
  );

  const byStage = new Map<ShopFulfillmentStatus, T[]>();
  for (const o of orders) {
    const list = byStage.get(o.fulfillment_status) ?? [];
    list.push(o);
    byStage.set(o.fulfillment_status, list);
  }

  function onDragStart(e: DragStartEvent) {
    setNotice(null);
    setDragging(orders.find((o) => o.id === e.active.id) ?? null);
  }

  async function onDragEnd(e: DragEndEvent) {
    const order = orders.find((o) => o.id === e.active.id);
    setDragging(null);
    const to = e.over?.id as ShopFulfillmentStatus | undefined;
    if (!order || !to) return;
    const action = dropAction(order.fulfillment_status, to);
    if (action.kind === "none") return;
    if (action.kind === "refuse") {
      setNotice(action.reason);
      return;
    }
    if (action.kind === "tracking") {
      setNotice(`Order ${orderConfirmationNumber(order.id)} is open: paste its tracking number to ship it.`);
      onOpen(order);
      return;
    }
    setSaving(order.id);
    const ok = await onMove(order, action.to);
    setSaving(null);
    if (ok) setNotice(`Order ${orderConfirmationNumber(order.id)} moved to ${STAGE[action.to].label}.`);
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={onDragStart}
      onDragEnd={(e) => void onDragEnd(e)}
      onDragCancel={() => setDragging(null)}
      accessibility={{
        announcements: {
          onDragStart: ({ active }) => `Picked up order ${orderConfirmationNumber(String(active.id))}.`,
          onDragOver: ({ over }) => (over ? `Over ${STAGE[over.id as ShopFulfillmentStatus].label}.` : "Not over a stage."),
          onDragEnd: ({ over }) => (over ? `Dropped on ${STAGE[over.id as ShopFulfillmentStatus].label}.` : "Put back."),
          onDragCancel: () => "Put back.",
        },
      }}
    >
      <p aria-live="polite" className="mb-2 min-h-[18px] font-sans text-[12px]" style={ink3}>
        {notice ?? "Drag a card to another stage. Tap it to open the order."}
      </p>
      <div className="-mx-1 overflow-x-auto px-1 pb-2">
        <div className="grid min-w-[880px] grid-cols-4 gap-3">
          {LANES.map((lane) => {
            const count = lane.stages.reduce((n, s) => n + (byStage.get(s)?.length ?? 0), 0);
            return (
              <section
                key={lane.id}
                aria-label={lane.label}
                className="flex flex-col rounded-[var(--adm-radius)] border p-2"
                style={{ borderColor: "var(--adm-line)", background: "var(--adm-panel-2)" }}
              >
                <h3 className="flex items-baseline justify-between px-1 pb-2 font-sans text-[12.5px] font-semibold" style={ink}>
                  <span>
                    <Mark className="mr-0.5 text-[15px]">{lane.emoji}</Mark> {lane.label}
                  </span>
                  <span className="tabular-nums" style={ink3}>
                    {count}
                  </span>
                </h3>
                <div className="flex flex-1 flex-col gap-2">
                  {lane.stages.map((stage) => (
                    <StageZone key={stage} stage={stage} showLabel={lane.stages.length > 1} dragging={dragging !== null}>
                      {(byStage.get(stage) ?? []).map((o) => (
                        <OrderCard key={o.id} order={o} now={now} saving={saving === o.id} onOpen={() => onOpen(o)} />
                      ))}
                    </StageZone>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </div>
      <DragOverlay dropAnimation={{ duration: 180, easing: "cubic-bezier(0.22, 1, 0.36, 1)" }}>
        {dragging ? <CardFace order={dragging} now={now} lifted /> : null}
      </DragOverlay>
    </DndContext>
  );
}

function StageZone({
  stage,
  showLabel,
  dragging,
  children,
}: {
  stage: ShopFulfillmentStatus;
  showLabel: boolean;
  dragging: boolean;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });
  return (
    <div
      ref={setNodeRef}
      className="rounded-[var(--adm-radius-sm)] border border-dashed p-1.5 transition-colors duration-150"
      style={{
        borderColor: isOver ? "var(--adm-accent)" : dragging ? "var(--adm-line-strong)" : "transparent",
        background: isOver ? "color-mix(in oklab, var(--adm-accent), transparent 90%)" : "transparent",
      }}
    >
      {showLabel && (
        <p className="px-1 pb-1 font-sans text-[11.5px] font-medium" style={ink3}>
          <Mark className="mr-0.5 text-[14px]">{STAGE[stage].emoji}</Mark> {STAGE[stage].label}
        </p>
      )}
      <div className="flex min-h-[38px] flex-col gap-1.5">{children}</div>
    </div>
  );
}

function OrderCard<T extends BoardOrder>({
  order,
  now,
  saving,
  onOpen,
}: {
  order: T;
  now: Date;
  saving: boolean;
  onOpen: () => void;
}) {
  const { setNodeRef, attributes, listeners, isDragging } = useDraggable({ id: order.id });
  return (
    <button
      ref={setNodeRef}
      type="button"
      onClick={onOpen}
      {...attributes}
      {...listeners}
      aria-label={`Order ${orderConfirmationNumber(order.id)}, ${STAGE[order.fulfillment_status].label}. Drag to move, or open.`}
      className="block w-full touch-none text-left"
      style={{ opacity: isDragging ? 0.35 : saving ? 0.6 : 1 }}
    >
      <CardFace order={order} now={now} />
    </button>
  );
}

function CardFace({ order, now, lifted }: { order: BoardOrder; now: Date; lifted?: boolean }) {
  const first = order.items[0];
  const more = order.items.length - 1;
  const late = isLate(order, now);
  return (
    <div
      className="rounded-[var(--adm-radius-sm)] border px-2.5 py-2"
      style={{
        borderColor: late ? "color-mix(in oklab, var(--adm-warn), transparent 45%)" : "var(--adm-line)",
        background: "var(--adm-panel)",
        boxShadow: lifted ? "0 14px 30px -12px rgba(0,0,0,0.55)" : "var(--adm-shadow-card)",
        cursor: lifted ? "grabbing" : "grab",
      }}
    >
      <p className="flex items-baseline justify-between gap-2 font-sans text-[12.5px] font-semibold" style={ink}>
        <span>{orderConfirmationNumber(order.id)}</span>
        <span className="tabular-nums">{formatPrice(order.total_cents)}</span>
      </p>
      {first && (
        <p className="mt-0.5 truncate font-sans text-[11.5px]" style={{ color: "var(--adm-ink-2)" }}>
          {first.quantity} × {first.title}
          {more > 0 ? ` +${more}` : ""}
        </p>
      )}
      <p className="mt-0.5 font-sans text-[11px]" style={{ color: late ? "var(--adm-warn)" : "var(--adm-ink-3)" }}>
        {ageText(hoursBetween(order.updated_at, now))} in this stage{late ? " · late" : ""}
      </p>
    </div>
  );
}
