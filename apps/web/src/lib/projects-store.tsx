import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import type { Project, ProjectStatus } from "@/data/projects"
import { moveProjectInList } from "./project-status"
import { trpc } from "./trpc"

type ProjectsContextValue = {
  projects: Project[]
  isPending: boolean
  isError: boolean
  addProject: (project: Project) => Promise<{ id: string }>
  updateProject: (project: Project) => Promise<{ ok: true }>
  moveProject: (id: string, toStatus: ProjectStatus, toIndex: number) => void
  replaceProjects: (projects: Project[]) => void
  deleteProject: (id: string) => Promise<{ ok: true }>
  findProject: (id: string) => Project | undefined
}

const ProjectsContext = createContext<ProjectsContextValue | null>(null)

export function ProjectsProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const query = useQuery({
    queryKey: ["projects"],
    queryFn: () => trpc.projects.list.query(),
  })
  const projects = useMemo(() => (query.data ?? []) as Project[], [query.data])

  function invalidate() {
    void queryClient.invalidateQueries({ queryKey: ["projects"] })
    void queryClient.invalidateQueries({ queryKey: ["audit"] })
  }

  const create = useMutation({
    mutationFn: (project: Project) => trpc.projects.create.mutate(project),
    onSuccess: invalidate,
    onError: invalidate,
  })
  const update = useMutation({
    mutationFn: (project: Project) => trpc.projects.update.mutate(project),
    onSuccess: invalidate,
    onError: invalidate,
  })
  const move = useMutation({
    mutationFn: (input: { id: string; status: ProjectStatus; index: number }) =>
      trpc.projects.move.mutate(input),
    onSuccess: invalidate,
    onError: invalidate,
  })
  const remove = useMutation({
    mutationFn: (id: string) => trpc.projects.delete.mutate({ id }),
    onSuccess: invalidate,
    onError: invalidate,
  })

  const value = useMemo<ProjectsContextValue>(
    () => ({
      projects,
      isPending: query.isPending,
      isError: query.isError,
      addProject: (project) => create.mutateAsync(project),
      updateProject: (project) => update.mutateAsync(project),
      moveProject: (id, toStatus, toIndex) => {
        const next = moveProjectInList(projects, id, toStatus, toIndex)
        const moved = next.find((p) => p.id === id)
        if (moved) void move.mutateAsync({ id, status: toStatus, index: toIndex })
        queryClient.setQueryData(["projects"], next)
      },
      replaceProjects: (next) => {
        void Promise.all(next.map((project) => update.mutateAsync(project)))
      },
      deleteProject: (id) => remove.mutateAsync(id),
      findProject: (id) => projects.find((p) => p.id === id),
    }),
    [projects, query.isPending, query.isError, create, update, move, remove, queryClient],
  )

  return <ProjectsContext value={value}>{children}</ProjectsContext>
}

export function useProjects() {
  const context = useContext(ProjectsContext)
  if (!context) {
    throw new Error("useProjects must be used inside <ProjectsProvider>")
  }
  return context
}
