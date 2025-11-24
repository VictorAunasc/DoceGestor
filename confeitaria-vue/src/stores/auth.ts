import { defineStore } from 'pinia';
import http from '../lib/http';

type LoginPayload = { email: string; password: string };
type RegisterPayload = { name: string; email: string; password: string; confirmPassword?: string; businessName?: string };
type ApiLoginResponse = { success: boolean; message?: string; token?: string; user?: any };
type ApiRegisterResponse = { success: boolean; message?: string; token?: string; user?: any };

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: localStorage.getItem('auth_token') || '',
    user: JSON.parse(localStorage.getItem('auth_user') || 'null') as any | null,
    isLoading: false,
  }),
  getters: { isAuthenticated: (s) => !!s.token },
  actions: {
    _setSession(token?: string, user?: any) {
      this.token = token || '';
      this.user = user || null;
      if (this.token) localStorage.setItem('auth_token', this.token); else localStorage.removeItem('auth_token');
      if (this.user) localStorage.setItem('auth_user', JSON.stringify(this.user)); else localStorage.removeItem('auth_user');
    },
async login(payload: { email: string; password: string }) {
  this.isLoading = true;
  try {
    const { data } = await http.post('/login', payload);

    const token =
      data?.token ??
      data?.access_token ??
      data?.data?.token ??
      null;

    // se o backend não envia "success", assumimos true quando existir token
    const success = typeof data?.success === 'boolean' ? data.success : !!token;

    if (!success || !token) throw new Error(data?.message || 'Falha no login');

    this._setSession(token, data?.user ?? data?.data?.user ?? null);
    return { ok: true, message: data?.message || 'Login realizado' };
  } catch (e: any) {
    return { ok: false, message: e?.response?.data?.message || e.message || 'Erro ao fazer login' };
  } finally {
    this.isLoading = false;
  }
},
    async register(payload: RegisterPayload) {
      this.isLoading = true;
      try {
        const { data } = await http.post<ApiRegisterResponse>('/register', payload);
        if (data?.token) this._setSession(data.token, data.user);
        return { ok: true, message: data?.message || 'Cadastro realizado' };
      } catch (e: any) {
        return { ok: false, message: e?.response?.data?.message || e.message || 'Erro no cadastro' };
      } finally { this.isLoading = false; }
    },
    async logout() {
      try { await http.post('/logout', {}); } catch {}
      this._setSession();
    },
  },
});
