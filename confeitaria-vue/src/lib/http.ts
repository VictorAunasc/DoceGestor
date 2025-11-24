import axios from 'axios'

const http = axios.create({
  baseURL: 'http://localhost:8000/api', // ajuste se seu back estiver em outra porta
  withCredentials: false,
})

// Interceptor pra anexar o token do localStorage em TODAS as requisições
http.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token')

  if (token) {
    if (!config.headers) config.headers = {}
    config.headers.Authorization = `Bearer ${token}`
  }

  return config
})

export default http

