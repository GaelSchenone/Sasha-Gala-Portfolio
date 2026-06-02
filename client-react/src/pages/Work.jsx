import { Header } from '../componentes/Header'
import './Work.css'
import { WorkItem } from '../componentes/workItem'
import { useProjects } from '../hooks/useProjects'

export function Work() {
  const { projects, loading } = useProjects({ status: 'published', type: 'full' })

  if (loading) return null

  return (
    <>
              <Header />

    <div className="work-body">
      <div className="work-container">
        {projects.map((project) => (
          <WorkItem
            key={project.project_id}
            project_id={project.project_id}
            project_title={project.project_name}
            project_image={project.project_main_image}
            project_stack={project.project_stack}
            project_description={project.project_description}
            project_collaborators={project.project_colaborators}
          />
        ))}
      </div>
    </div>
    
    </>

  )
}
