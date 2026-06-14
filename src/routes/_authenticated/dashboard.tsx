import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import {
  createCourse,
  deleteCourse,
  listCourses,
  renameCourse,
} from "@/lib/attendance.api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  BookOpen,
  Plus,
  ArrowRight,
  Pencil,
  Trash2,
  Check,
  X,
  Search,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  ssr: false,
  component: Dashboard,
});

function Dashboard() {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [pendingDelete, setPendingDelete] = useState<{ id: string; name: string } | null>(null);
  const [search, setSearch] = useState("");

  const { data: courses = [], isLoading } = useQuery({
    queryKey: ["courses"],
    queryFn: listCourses,
  });

  const filteredCourses = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return courses;
    return courses.filter((c) => c.name.toLowerCase().includes(q));
  }, [courses, search]);

  const createMut = useMutation({
    mutationFn: (n: string) => createCourse(n),
    onSuccess: () => {
      toast.success("Course added");
      setName("");
      qc.invalidateQueries({ queryKey: ["courses"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const renameMut = useMutation({
    mutationFn: (v: { id: string; name: string }) => renameCourse(v.id, v.name),
    onSuccess: () => {
      toast.success("Course renamed");
      setEditingId(null);
      qc.invalidateQueries({ queryKey: ["courses"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteCourse(id),
    onSuccess: () => {
      toast.success("Course deleted");
      setPendingDelete(null);
      qc.invalidateQueries({ queryKey: ["courses"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const n = name.trim();
    if (!n) return;
    createMut.mutate(n);
  }

  function startEdit(id: string, current: string) {
    setEditingId(id);
    setEditName(current);
  }

  function saveEdit(id: string) {
    const n = editName.trim();
    if (!n) return;
    renameMut.mutate({ id, name: n });
  }

  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-2xl font-semibold tracking-tight">Your courses</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Add a course, then generate a 1-minute QR for students to scan.
        </p>
      </section>

      <Card className="p-4">
        <form onSubmit={submit} className="flex gap-2">
          <Input
            placeholder="Add a new course (e.g. Anatomy 101)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={createMut.isPending}
          />
          <Button type="submit" disabled={createMut.isPending || !name.trim()}>
            <Plus className="h-4 w-4 mr-1" /> Add
          </Button>
        </form>
      </Card>

      <section className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search courses..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : courses.length === 0 ? (
          <Card className="p-10 text-center text-muted-foreground">
            <BookOpen className="h-8 w-8 mx-auto mb-3 opacity-40" />
            No courses yet. Add your first one above.
          </Card>
        ) : filteredCourses.length === 0 ? (
          <Card className="p-10 text-center text-muted-foreground">
            <Search className="h-8 w-8 mx-auto mb-3 opacity-40" />
            No courses match your search.
          </Card>
        ) : (
          filteredCourses.map((c) =>
            editingId === c.id ? (
              <Card key={c.id} className="p-4 flex items-center gap-2">
                <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary grid place-items-center shrink-0">
                  <BookOpen className="h-5 w-5" />
                </div>
                <Input
                  autoFocus
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveEdit(c.id);
                    if (e.key === "Escape") setEditingId(null);
                  }}
                  disabled={renameMut.isPending}
                />
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => saveEdit(c.id)}
                  disabled={renameMut.isPending || !editName.trim()}
                  aria-label="Save"
                >
                  <Check className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setEditingId(null)}
                  disabled={renameMut.isPending}
                  aria-label="Cancel"
                >
                  <X className="h-4 w-4" />
                </Button>
              </Card>
            ) : (
              <Card key={c.id} className="p-0 hover:bg-accent transition-colors">
                <div className="flex items-center justify-between gap-2 p-4">
                  <CourseLink id={c.id} name={c.name} createdAt={c.created_at} />
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        startEdit(c.id, c.name);
                      }}
                      aria-label="Rename course"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setPendingDelete({ id: c.id, name: c.name });
                      }}
                      aria-label="Delete course"
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ),
          )
        )}
      </section>

      <AlertDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => !open && setPendingDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete course?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>{pendingDelete?.name}</strong>.
              Courses that already have sessions or attendance records can't be
              deleted — clear them first.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMut.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleteMut.isPending}
              onClick={() => pendingDelete && deleteMut.mutate(pendingDelete.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMut.isPending ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function CourseLink({
  id,
  name,
  createdAt,
}: {
  id: string;
  name: string;
  createdAt: string;
}) {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      onClick={() => navigate({ to: "/courses/$id", params: { id } })}
      className="flex items-center gap-3 flex-1 min-w-0 text-left"
    >
      <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary grid place-items-center shrink-0">
        <BookOpen className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <div className="font-medium truncate">{name}</div>
        <div className="text-xs text-muted-foreground">
          Added {new Date(createdAt).toLocaleDateString()}
        </div>
      </div>
      <ArrowRight className="h-4 w-4 text-muted-foreground ml-auto" />
    </button>
  );
}
