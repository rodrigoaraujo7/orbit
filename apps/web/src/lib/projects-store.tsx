import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import type { Project, ProjectStatus } from "@/data/projects"
import { recordProjectHistory } from "./project-history"
import { moveProjectInList } from "./project-status"
import { trpc } from "./trpc"

type ProjectsContextValue = {
  projects: Project[]
  addProject: (project: Project) => void
  updateProject: (project: Project) => void
  moveProject: (id: string, toStatus: ProjectStatus, toIndex: number) => void
  replaceProjects: (projects: Project[]) => void
  deleteProject: (id: string) => void
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
  }

  const create = useMutation({
    mutationFn: (project: Project) => trpc.projects.create.mutate(project),
    onSuccess: invalidate,
  })
  const update = useMutation({
    mutationFn: (project: Project) => trpc.projects.update.mutate(project),
    onSuccess: invalidate,
  })
  const move = useMutation({
    mutationFn: (input: { id: string; status: ProjectStatus; index: number }) =>
      trpc.projects.move.mutate(input),
    onSuccess: invalidate,
  })
  const remove = useMutation({
    mutationFn: (id: string) => trpc.projects.delete.mutate({ id }),
    onSuccess: invalidate,
  })

  const value = useMemo<ProjectsContextValue>(
    () => ({
      projects,
      addProject: (project) => create.mutate(project),
      updateProject: (project) => update.mutate(project),
      moveProject: (id, toStatus, toIndex) => {
        const next = moveProjectInList(projects, id, toStatus, toIndex)
        const moved = next.find((p) => p.id === id)
        if (moved) move.mutate({ id, status: toStatus, index: toIndex })
        const recorded = recordProjectHistory(projects, next)
        queryClient.setQueryData(["projects"], recorded)
      },
      replaceProjects: (next) => {
        for (const project of recordProjectHistory(projects, next)) {
          update.mutate(project)
        }
      },
      deleteProject: (id) => remove.mutate(id),
      findProject: (id) => projects.find((p) => p.id === id),
    }),
    [projects, create, update, move, remove, queryClient],
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
