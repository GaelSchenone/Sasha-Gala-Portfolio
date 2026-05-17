import { BrowserRouter as Router, Routes, Route} from 'react-router-dom'
import { Home } from './pages/Home'
import { View } from './pages/View'
import { Work } from './pages/Work'
import { Archive } from './pages/Archive'
import { About } from './pages/About'
import { Login } from './pages/Login'
import { Admin } from './pages/Admin'
import { ProjectEditor } from './pages/ProjectEditor'
import { TypographyProvider } from './componentes/TypographyProvider'

function App() {
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
          <Route path="/admin" element={<Admin />} />
          <Route path="/admin/edit/:id" element={<ProjectEditor />} />
        </Routes>
      </Router>
    </TypographyProvider>
  )
}

export default App
