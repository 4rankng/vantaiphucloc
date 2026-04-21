import { ThemeProvider } from '@/themes'
import { AuthProvider } from '@/contexts/AuthContext'
import { RoleSelect } from '@/pages/RoleSelect'

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <RoleSelect />
      </AuthProvider>
    </ThemeProvider>
  )
}
