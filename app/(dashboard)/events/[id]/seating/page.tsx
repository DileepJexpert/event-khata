"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { ArrowLeft, Plus, Trash2, X, Users, Loader2, Armchair, Pencil, Check } from "lucide-react";
import Link from "next/link";

interface SeatingTable {
  id: string;
  event_id: string;
  name: string;
  capacity: number;
  table_type: "round" | "rectangle" | "long";
  sort_order: number;
  notes: string | null;
  created_at: string;
}

interface Guest {
  id: string;
  event_id: string;
  name: string;
  phone: string | null;
  side: string;
  seating_table_id: string | null;
}

const TABLE_TYPE_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  round: { bg: "bg-blue-50 dark:bg-blue-900/20", text: "text-blue-700 dark:text-blue-300", label: "Round" },
  rectangle: { bg: "bg-amber-50 dark:bg-amber-900/20", text: "text-amber-700 dark:text-amber-300", label: "Rectangle" },
  long: { bg: "bg-emerald-50 dark:bg-emerald-900/20", text: "text-emerald-700 dark:text-emerald-300", label: "Long" },
};

export default function SeatingPage() {
  const supabase = createClient();
  const params = useParams();
  const { addToast } = useToast();
  const eventId = params.id as string;

  const [tables, setTables] = useState<SeatingTable[]>([]);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(true);

  // Add table form
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTableName, setNewTableName] = useState("");
  const [newTableCapacity, setNewTableCapacity] = useState("10");
  const [newTableType, setNewTableType] = useState<string>("round");
  const [addingTable, setAddingTable] = useState(false);

  // Edit table
  const [editingTableId, setEditingTableId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editCapacity, setEditCapacity] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  // Guest assignment dropdown
  const [assigningTableId, setAssigningTableId] = useState<string | null>(null);

  // Delete confirmation
  const [deletingTableId, setDeletingTableId] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const [tablesRes, guestsRes] = await Promise.all([
      supabase
        .from("seating_tables")
        .select("*")
        .eq("event_id", eventId)
        .order("sort_order")
        .order("created_at"),
      supabase
        .from("guests")
        .select("id, event_id, name, phone, side, seating_table_id")
        .eq("event_id", eventId)
        .order("name"),
    ]);
    if (tablesRes.data) setTables(tablesRes.data);
    if (guestsRes.data) setGuests(guestsRes.data);
    setLoading(false);
  }

  async function handleAddTable() {
    if (!newTableName.trim()) return;
    setAddingTable(true);
    const { error } = await supabase.from("seating_tables").insert({
      event_id: eventId,
      name: newTableName.trim(),
      capacity: Number(newTableCapacity) || 10,
      table_type: newTableType,
      sort_order: tables.length,
    });
    if (error) {
      addToast({ title: "Failed to add table", description: error.message, variant: "destructive" });
    } else {
      setNewTableName("");
      setNewTableCapacity("10");
      setNewTableType("round");
      setShowAddForm(false);
      load();
    }
    setAddingTable(false);
  }

  async function handleDeleteTable(tableId: string) {
    // Unassign all guests from this table first
    await supabase
      .from("guests")
      .update({ seating_table_id: null })
      .eq("seating_table_id", tableId);
    const { error } = await supabase.from("seating_tables").delete().eq("id", tableId);
    if (error) {
      addToast({ title: "Failed to delete table", description: error.message, variant: "destructive" });
    } else {
      setDeletingTableId(null);
      load();
    }
  }

  async function handleAssignGuest(guestId: string, tableId: string) {
    const { error } = await supabase
      .from("guests")
      .update({ seating_table_id: tableId })
      .eq("id", guestId);
    if (error) {
      addToast({ title: "Failed to assign guest", description: error.message, variant: "destructive" });
    } else {
      setAssigningTableId(null);
      load();
    }
  }

  async function handleUnassignGuest(guestId: string) {
    const { error } = await supabase
      .from("guests")
      .update({ seating_table_id: null })
      .eq("id", guestId);
    if (error) {
      addToast({ title: "Failed to remove guest", description: error.message, variant: "destructive" });
    } else {
      load();
    }
  }

  function startEditTable(table: SeatingTable) {
    setEditingTableId(table.id);
    setEditName(table.name);
    setEditCapacity(String(table.capacity));
  }

  async function handleSaveEdit(tableId: string) {
    if (!editName.trim()) return;
    setSavingEdit(true);
    const { error } = await supabase
      .from("seating_tables")
      .update({ name: editName.trim(), capacity: Number(editCapacity) || 10 })
      .eq("id", tableId);
    if (error) {
      addToast({ title: "Failed to update table", description: error.message, variant: "destructive" });
    } else {
      setEditingTableId(null);
      load();
    }
    setSavingEdit(false);
  }

  function getInitials(name: string) {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }

  const seatedCount = guests.filter((g) => g.seating_table_id).length;
  const unassignedGuests = guests.filter((g) => !g.seating_table_id);

  if (loading)
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-navy-400" />
      </div>
    );

  return (
    <div className="px-4 pb-24 pt-4">
      {/* Header */}
      <div className="mb-4 flex items-center gap-3">
        <Link
          href={`/events/${eventId}`}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-navy-100"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold">Seating Plan</h1>
          <p className="text-sm text-navy-500">
            {tables.length} Tables &middot; {seatedCount} Seated &middot;{" "}
            {unassignedGuests.length} Unassigned
          </p>
        </div>
        <Button size="sm" onClick={() => setShowAddForm(!showAddForm)}>
          <Plus className="mr-1 h-4 w-4" /> Add Table
        </Button>
      </div>

      {/* Stats row */}
      <div className="mb-4 grid grid-cols-3 gap-2">
        <div className="rounded-xl bg-white p-3 text-center shadow-sm dark:bg-navy-800">
          <p className="text-lg font-bold text-navy-900 dark:text-navy-100">{tables.length}</p>
          <p className="text-[10px] font-medium text-navy-500">Tables</p>
        </div>
        <div className="rounded-xl bg-white p-3 text-center shadow-sm dark:bg-navy-800">
          <p className="text-lg font-bold text-emerald-600">{seatedCount}</p>
          <p className="text-[10px] font-medium text-navy-500">Seated</p>
        </div>
        <div className="rounded-xl bg-white p-3 text-center shadow-sm dark:bg-navy-800">
          <p className="text-lg font-bold text-amber-600">{unassignedGuests.length}</p>
          <p className="text-[10px] font-medium text-navy-500">Unassigned</p>
        </div>
      </div>

      {/* Add Table Form */}
      {showAddForm && (
        <div className="mb-4 space-y-3 rounded-xl bg-white p-4 shadow-sm dark:bg-navy-800">
          <Input
            value={newTableName}
            onChange={(e) => setNewTableName(e.target.value)}
            placeholder="Table name *"
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              type="number"
              value={newTableCapacity}
              onChange={(e) => setNewTableCapacity(e.target.value)}
              placeholder="Capacity"
              min="1"
            />
            <Select value={newTableType} onValueChange={setNewTableType}>
              <SelectTrigger>
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="round">Round</SelectItem>
                <SelectItem value="rectangle">Rectangle</SelectItem>
                <SelectItem value="long">Long</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={handleAddTable}
              disabled={addingTable || !newTableName.trim()}
              size="sm"
              className="flex-1"
            >
              {addingTable ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null} Add Table
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowAddForm(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Table Cards */}
      <div className="space-y-3">
        {tables.map((table) => {
          const tableGuests = guests.filter((g) => g.seating_table_id === table.id);
          const seatsRemaining = table.capacity - tableGuests.length;
          const typeStyle = TABLE_TYPE_STYLES[table.table_type] || TABLE_TYPE_STYLES.round;
          const isEditing = editingTableId === table.id;
          const isAssigning = assigningTableId === table.id;
          const isDeleting = deletingTableId === table.id;

          return (
            <div
              key={table.id}
              className={`rounded-xl bg-white p-4 shadow-sm dark:bg-navy-800 ${typeStyle.bg}`}
            >
              {/* Table Header */}
              <div className="mb-3 flex items-center gap-2">
                <Armchair className={`h-5 w-5 ${typeStyle.text}`} />
                {isEditing ? (
                  <div className="flex flex-1 items-center gap-2">
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="h-8 text-sm"
                    />
                    <Input
                      type="number"
                      value={editCapacity}
                      onChange={(e) => setEditCapacity(e.target.value)}
                      className="h-8 w-16 text-sm"
                      min="1"
                    />
                    <button
                      onClick={() => handleSaveEdit(table.id)}
                      disabled={savingEdit}
                      className="text-emerald-600 hover:text-emerald-700"
                    >
                      {savingEdit ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Check className="h-4 w-4" />
                      )}
                    </button>
                    <button
                      onClick={() => setEditingTableId(null)}
                      className="text-navy-400 hover:text-navy-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex-1">
                      <span className="text-sm font-semibold text-navy-900 dark:text-navy-100">
                        {table.name}
                      </span>
                      <span className="mx-1.5 text-navy-300">&middot;</span>
                      <Badge
                        className={`${typeStyle.bg} ${typeStyle.text} border-0 text-[10px]`}
                      >
                        {typeStyle.label}
                      </Badge>
                      <span className="mx-1.5 text-navy-300">&middot;</span>
                      <span className="text-xs text-navy-500">
                        {table.capacity} seats
                      </span>
                    </div>
                    <button
                      onClick={() => startEditTable(table)}
                      className="text-navy-300 hover:text-navy-600 dark:hover:text-navy-200"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    {isDeleting ? (
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="destructive"
                          className="h-6 px-2 text-xs"
                          onClick={() => handleDeleteTable(table.id)}
                        >
                          Confirm
                        </Button>
                        <button
                          onClick={() => setDeletingTableId(null)}
                          className="text-navy-400 hover:text-navy-600"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeletingTableId(table.id)}
                        className="text-navy-300 hover:text-red-500"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </>
                )}
              </div>

              {/* Assigned Guests */}
              {tableGuests.length > 0 && (
                <div className="mb-2 space-y-1.5">
                  {tableGuests.map((guest) => (
                    <div
                      key={guest.id}
                      className="flex items-center gap-2 rounded-lg bg-white/60 px-2.5 py-1.5 dark:bg-navy-700/50"
                    >
                      <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-navy-100 dark:bg-navy-600">
                        <span className="text-[10px] font-bold text-navy-600 dark:text-navy-200">
                          {getInitials(guest.name)}
                        </span>
                      </div>
                      <span className="flex-1 text-xs font-medium text-navy-800 dark:text-navy-200">
                        {guest.name}
                      </span>
                      <span className="text-[10px] capitalize text-navy-400">{guest.side}</span>
                      <button
                        onClick={() => handleUnassignGuest(guest.id)}
                        className="text-navy-300 hover:text-red-500"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Footer: seats remaining + add guest */}
              <div className="flex items-center justify-between">
                <span className="text-xs text-navy-500">
                  {seatsRemaining > 0 ? (
                    <>
                      <Users className="mr-1 inline h-3 w-3" />
                      {seatsRemaining} seat{seatsRemaining !== 1 ? "s" : ""} remaining
                    </>
                  ) : (
                    <span className="text-amber-600">Table full</span>
                  )}
                </span>
                {seatsRemaining > 0 && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    onClick={() =>
                      setAssigningTableId(isAssigning ? null : table.id)
                    }
                  >
                    <Plus className="mr-1 h-3 w-3" /> Add Guest
                  </Button>
                )}
              </div>

              {/* Guest Assignment Dropdown */}
              {isAssigning && unassignedGuests.length > 0 && (
                <div className="mt-2 max-h-48 overflow-y-auto rounded-lg border border-navy-200 bg-white p-1 dark:border-navy-600 dark:bg-navy-700">
                  {unassignedGuests.map((guest) => (
                    <button
                      key={guest.id}
                      onClick={() => handleAssignGuest(guest.id, table.id)}
                      className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-xs hover:bg-navy-50 dark:hover:bg-navy-600"
                    >
                      <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-navy-100 dark:bg-navy-600">
                        <span className="text-[10px] font-bold text-navy-600 dark:text-navy-200">
                          {getInitials(guest.name)}
                        </span>
                      </div>
                      <span className="flex-1 font-medium text-navy-800 dark:text-navy-200">
                        {guest.name}
                      </span>
                      <span className="capitalize text-navy-400">{guest.side}</span>
                    </button>
                  ))}
                </div>
              )}
              {isAssigning && unassignedGuests.length === 0 && (
                <p className="mt-2 text-center text-xs text-navy-400">
                  All guests have been assigned to tables.
                </p>
              )}
            </div>
          );
        })}

        {tables.length === 0 && !showAddForm && (
          <p className="py-12 text-center text-sm text-navy-400">
            No tables yet. Add your first table to start planning seating!
          </p>
        )}
      </div>

      {/* Unassigned Guests Section */}
      {unassignedGuests.length > 0 && (
        <div className="mt-6">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-navy-900 dark:text-navy-100">
            <Users className="h-4 w-4 text-navy-400" />
            Unassigned Guests
            <Badge variant="secondary" className="ml-1">
              {unassignedGuests.length}
            </Badge>
          </h2>
          <div className="space-y-1.5">
            {unassignedGuests.map((guest) => (
              <div
                key={guest.id}
                className="flex items-center gap-2 rounded-xl bg-white px-3 py-2.5 shadow-sm dark:bg-navy-800"
              >
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-navy-100 dark:bg-navy-700">
                  <span className="text-xs font-bold text-navy-600 dark:text-navy-300">
                    {getInitials(guest.name)}
                  </span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-navy-900 dark:text-navy-100">
                    {guest.name}
                  </p>
                  <p className="text-[10px] capitalize text-navy-400">{guest.side}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
