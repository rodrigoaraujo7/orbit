import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react"

import { projects as initialProjects, type Project, type ProjectStatus } from "@/data/projects"
import { recordProjectHistory, withProjectHistory } from "./project-history"
import { moveProjectInList } from "./project-status"

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

/**
 * ponytail: in-memory state, gone on reload. No API yet — once there is one,
 * swap for fetch/mutation keeping this same interface.
 */
export function ProjectsProvider({ children }: { children: ReactNode }) {
  const [projects, setProjects] = useState<Project[]>(initialProjects)

  const value = useMemo<ProjectsContextValue>(
    () => ({
      projects,
      addProject: (project) => setProjects((current) => [project, ...current]),
      updateProject: (project) =>
        setProjects((current) =>
          current.map((p) => (p.id === project.id ? withProjectHistory(p, project) : p))
        ),
      moveProject: (id, toStatus, toIndex) =>
        setProjects((current) =>
          recordProjectHistory(current, moveProjectInList(current, id, toStatus, toIndex))
        ),
      replaceProjects: (next) =>
        setProjects((current) => recordProjectHistory(current, next)),
      deleteProject: (id) =>
        setProjects((current) => current.filter((p) => p.id !== id)),
      findProject: (id) => projects.find((p) => p.id === id),
    }),
    [projects]
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
