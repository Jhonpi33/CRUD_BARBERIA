/*
  Instancia única de Axios para toda la app.
  Regla: ningún componente usa fetch/axios suelto; todo pasa por aquí.
*/
import axios from 'axios'

const TOKEN_KEY = 'elysia_token'

const api = axios.create({
  // En desarrollo se usa el proxy /api de Vite; en producción puede
  // configurarse una URL absoluta si el frontend y la API van separados.
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 15000,
})

// Adjunta el token de sesión (si existe) a cada petición.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY)
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Si el backend responde 401, la sesión ya no es válida: limpiamos el token local.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem(TOKEN_KEY)
    }
    return Promise.reject(error)
  }
)

export { TOKEN_KEY }
export default api
