"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast";
import { Plus, Loader2, Phone, Mail, Trash2, UserPlus, Users, Shield } from "lucide-react";
import { TEAM_ROLES } from "@/lib/utils";
import type { TeamMember } from "@/lib/types";

export default function TeamPage() {
  const supabase = createClient();
  const { addToast } = useToast();

  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("coordinator");
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    const { requireUser } = await import("@/lib/auth");
    const user = await requireUser();
    const { data } = await supabase.from("team_members").select("*").eq("agency_id", user.id).order("created_at");
    if (data) setMembers(data);
    setLoading(false);
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    const { requireUser } = await import("@/lib/auth");
    const user = await requireUser();
    const { error } = await supabase.from("team_members").insert({
      agency_id: user.id,
      name: name.trim(),
      phone: phone.trim() || null,
      email: email.trim() || null,
      role,
    });
    if (error) {
      addToast({ title: "Failed to add", description: error.message, variant: "destructive" });
    } else {
      addToast({ title: "Team member added!", variant: "success" });
      setName(""); setPhone(""); setEmail(""); setRole("coordinator");
      setShowForm(false);
      load();
    }
    setSaving(false);
  }

  async function toggleActive(member: TeamMember) {
    await supabase.from("team_members").update({ is_active: !member.is_active }).eq("id", member.id);
    load();
  }

  async function deleteMember(id: string) {
    await supabase.from("team_members").delete().eq("id", id);
    addToast({ title: "Member removed", variant: "success" });
    load();
  }

  if (loading) return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-navy-400" /></div>;

  const activeMembers = members.filter((m) => m.is_active);
  const inactiveMembers = members.filter((m) => !m.is_active);

  return (
    <div className="px-4 pb-24 pt-4">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-navy-900">Team</h1>
          <p className="text-sm text-navy-500">{activeMembers.length} active members</p>
        </div>
        <Button size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus className="mr-1 h-4 w-4" /> Add Member
        </Button>
      </div>

      {/* Add Form */}
      {showForm && (
        <form onSubmit={handleAdd} className="mb-4 rounded-xl bg-white p-4 shadow-sm">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <UserPlus className="h-4 w-4" /> Add Team Member
          </h3>
          <div className="space-y-3">
            <div>
              <Label>Name *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Rajesh Kumar" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Phone</Label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="9876543210" />
              </div>
              <div>
                <Label>Role</Label>
                <select value={role} onChange={(e) => setRole(e.target.value)} className="w-full rounded-lg border border-navy-200 px-3 py-2 text-sm">
                  {TEAM_ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>
            </div>
            <div>
              <Label>Email</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="rajesh@agency.com" />
            </div>
            <div className="flex gap-2">
              <Button type="submit" size="sm" disabled={saving}>
                {saving ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : null} Add
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </div>
        </form>
      )}

      {/* Active Members */}
      <div className="space-y-2">
        {activeMembers.map((member) => {
          const roleStyle = TEAM_ROLES.find((r) => r.value === member.role);
          return (
            <div key={member.id} className="rounded-xl bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-navy-100 text-sm font-bold text-navy-700">
                    {member.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-semibold text-navy-900">{member.name}</h3>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${roleStyle?.color}`}>
                      <Shield className="mr-0.5 inline h-3 w-3" /> {roleStyle?.label}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => toggleActive(member)} className="rounded-lg px-2 py-1 text-xs text-amber-600 hover:bg-amber-50">
                    Deactivate
                  </button>
                  <button onClick={() => deleteMember(member.id)} className="rounded-lg p-1.5 text-red-400 hover:bg-red-50 hover:text-red-600">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="mt-2 flex gap-3 text-xs text-navy-500">
                {member.phone && (
                  <a href={`tel:${member.phone}`} className="flex items-center gap-1 hover:text-navy-700">
                    <Phone className="h-3 w-3" /> {member.phone}
                  </a>
                )}
                {member.email && (
                  <a href={`mailto:${member.email}`} className="flex items-center gap-1 hover:text-navy-700">
                    <Mail className="h-3 w-3" /> {member.email}
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Inactive Members */}
      {inactiveMembers.length > 0 && (
        <div className="mt-6">
          <h2 className="mb-2 text-sm font-semibold text-navy-500">Inactive Members</h2>
          <div className="space-y-2">
            {inactiveMembers.map((member) => (
              <div key={member.id} className="rounded-xl bg-white p-4 opacity-60 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-navy-100 text-sm font-bold text-navy-400">
                      {member.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-semibold text-navy-600">{member.name}</h3>
                      <span className="text-xs text-navy-400">{member.role}</span>
                    </div>
                  </div>
                  <button onClick={() => toggleActive(member)} className="rounded-lg px-2 py-1 text-xs font-medium text-emerald-600 hover:bg-emerald-50">
                    Reactivate
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {members.length === 0 && !showForm && (
        <div className="py-12 text-center">
          <Users className="mx-auto mb-3 h-12 w-12 text-navy-200" />
          <p className="text-sm text-navy-400">No team members yet.</p>
          <p className="text-xs text-navy-400">Add your coordinators, assistants, and planners.</p>
        </div>
      )}
    </div>
  );
}
