import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react"

import { projects as initialProjects, type Project } from "@/data/projects"

type ProjectsContextValue = {
  projects: Project[]
  addProject: (project: Project) => void
  findProject: (id: string) => Project | undefined
}

const ProjectsContext = createContext<ProjectsContextValue | null>(null)

/**
 * ponytail: estado em memória, some no reload. Sem API ainda — quando existir,
 * trocar por fetch/mutation mantendo essa mesma interface.
 */
export function ProjectsProvider({ children }: { children: ReactNode }) {
  const [projects, setProjects] = useState<Project[]>(initialProjects)

  const value = useMemo<ProjectsContextValue>(
    () => ({
      projects,
      addProject: (project) => setProjects((current) => [project, ...current]),
      findProject: (id) => projects.find((p) => p.id === id),
    }),
    [projects]
  )

  return <ProjectsContext value={value}>{children}</ProjectsContext>
}

export function useProjects() {
  const context = useContext(ProjectsContext)
  if (!context) {
    throw new Error("useProjects precisa estar dentro de <ProjectsProvider>")
  }
  return context
}
