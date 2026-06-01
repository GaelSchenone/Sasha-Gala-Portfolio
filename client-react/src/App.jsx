import { BrowserRouter as Router, Routes, Route} from 'react-router-dom'
import { useEffect } from 'react'
import { Home } from './pages/Home'
import { View } from './pages/View'
import { Work } from './pages/Work'
import { Archive } from './pages/Archive'
import { About } from './pages/About'
import { Login } from './pages/Login'
import { Admin } from './pages/Admin'
import { ProjectEditor } from './pages/ProjectEditor'
import { NotFound } from './pages/NotFound'
import { TypographyProvider } from './componentes/TypographyProvider'
import { ProtectedRoute } from './componentes/ProtectedRoute'
import { siteConfigService } from './services/api'

function App() {
  useEffect(() => {
    siteConfigService.get()
      .then(data => {
        const name = data.config?.config_data?.name
        if (name) document.title = name
      })
      .catch(() => {})
  }, [])

  return(
    <TypographyProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/Work" element={<Work />} />
          <Route path="/Work/:projectName" element={<View />} />
          <Route path="/Archive" element={<Archive />} />
          <Route path="/About" element={<About />} />
          <Route path="/login" element={<Login />} />
          <Route path="/admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />
          <Route path="/admin/edit/:id" element={<ProtectedRoute><ProjectEditor /></ProtectedRoute>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Router>
    </TypographyProvider>
  )
}

export default App