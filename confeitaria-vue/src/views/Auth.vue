<script setup lang="ts">
import { reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { toast } from 'vue-sonner';
import { Cake, Mail, Lock, User, Building } from 'lucide-vue-next';

import { useAuthStore } from '../stores/auth';

// UI
import Card from '../components/ui/Card.vue';
import CardHeader from '../components/ui/CardHeader.vue';
import CardContent from '../components/ui/CardContent.vue';
import CardTitle from '../components/ui/CardTitle.vue';
import CardDescription from '../components/ui/CardDescription.vue';
import Input from '../components/ui/Input.vue';
import Label from '../components/ui/Label.vue';
import Tabs from '../components/ui/Tabs.vue';
import TabsList from '../components/ui/TabsList.vue';
import TabsTrigger from '../components/ui/TabsTrigger.vue';
import TabsContent from '../components/ui/TabsContent.vue';

const auth = useAuthStore();
const router = useRouter();
const isLoading = ref(false);

const loginData = reactive({ email: '', password: '' });
const registerData = reactive({
  name: '',
  email: '',
  password: '',
  confirmPassword: '',
  businessName: '',
});

async function handleLogin(e: Event) {
  e.preventDefault();
  isLoading.value = true;
  try {
    const res = await auth.login({
      email: loginData.email,
      password: loginData.password,
    });
    if (res.ok) {
      toast.success(res.message || 'Login realizado');
      router.push({ name: 'home' });
    } else {
      toast.error(res.message || 'Erro ao fazer login. Tente novamente.');
    }
  } finally {
    isLoading.value = false;
  }
}

async function handleRegister(e: Event) {
  e.preventDefault();
  isLoading.value = true;

  if (registerData.password !== registerData.confirmPassword) {
    toast.error('As senhas não coincidem.');
    isLoading.value = false;
    return;
  }
  if (registerData.password.length < 6) {
    toast.error('A senha deve ter pelo menos 6 caracteres.');
    isLoading.value = false;
    return;
  }

  try {
    const res = await auth.register({
      name: registerData.name,
      email: registerData.email,
      password: registerData.password,
      businessName: registerData.businessName,
    });
    if (res.ok) {
      toast.success(res.message || 'Cadastro realizado');
      router.push({ name: 'home' });
    } else {
      toast.error(res.message || 'Erro ao criar conta. Tente novamente.');
    }
  } finally {
    isLoading.value = false;
  }
}
</script>

<template>
  <div class="min-h-screen auth-gradient flex items-center justify-center p-6">
    <!-- largura final do layout -->
    <div class="w-full max-w-[560px]">
      <!-- Logo + título -->
      <div class="text-center mb-8">
        <div class="logo-badge mb-4 mx-auto">
          <Cake class="size-9" />
        </div>
        <h1 class="text-2xl font-semibold text-gray-900">Doce Gestor</h1>
        <p class="text-gray-600 text-sm">Sistema de Gestão para Confeitarias</p>
      </div>

      <!-- Abas (pill) -->
      <Tabs defaultValue="login" class="w-full">
        <TabsList class="tabs-root mb-6 max-w-[520px] mx-auto">
          <TabsTrigger value="login" class="tab-trigger">Entrar</TabsTrigger>
          <TabsTrigger value="register" class="tab-trigger">Cadastrar</TabsTrigger>
        </TabsList>

        <!-- LOGIN -->
        <TabsContent value="login">
          <div class="auth-card p-6">
            <CardHeader class="p-0 mb-4">
              <CardTitle class="text-gray-900 text-lg">Bem-vindo de volta!</CardTitle>
              <CardDescription class="text-gray-600">
                Entre com suas credenciais para acessar o sistema
              </CardDescription>
            </CardHeader>

            <CardContent class="p-0">
              <form @submit="handleLogin" class="space-y-4">
                <div class="relative">
                  <Label for="login-email" class="mb-1 block text-sm">Email</Label>
                  <Mail class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="seu@email.com"
                    class="input pl-10 h-10"
                    v-model="loginData.email"
                    required
                  />
                </div>

                <div class="relative">
                  <Label for="login-password" class="mb-1 block text-sm">Senha</Label>
                  <Lock class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="login-password"
                    type="password"
                    placeholder="••••••••"
                    class="input pl-10 h-10"
                    v-model="loginData.password"
                    required
                  />
                </div>

                <button type="submit" class="btn-primary w-full h-10" :disabled="isLoading">
                  {{ isLoading ? 'Entrando...' : 'Entrar' }}
                </button>
              </form>
            </CardContent>
          </div>
        </TabsContent>

        <!-- CADASTRO -->
        <TabsContent value="register">
          <div class="auth-card p-6">
            <CardHeader class="p-0 mb-4">
              <CardTitle class="text-gray-900 text-lg">Criar nova conta</CardTitle>
              <CardDescription class="text-gray-600">
                Preencha os dados para criar sua conta
              </CardDescription>
            </CardHeader>

            <CardContent class="p-0">
              <form @submit="handleRegister" class="space-y-4">
                <div class="relative">
                  <Label for="register-name" class="mb-1 block text-sm">Nome completo</Label>
                  <User class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="register-name"
                    type="text"
                    placeholder="Seu nome"
                    class="input pl-10 h-10"
                    v-model="registerData.name"
                    required
                  />
                </div>

                <div class="relative">
                  <Label for="register-business" class="mb-1 block text-sm">Nome da Confeitaria</Label>
                  <Building class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="register-business"
                    type="text"
                    placeholder="Nome do seu negócio"
                    class="input pl-10 h-10"
                    v-model="registerData.businessName"
                    required
                  />
                </div>

                <div class="relative">
                  <Label for="register-email" class="mb-1 block text-sm">Email</Label>
                  <Mail class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="register-email"
                    type="email"
                    placeholder="seu@email.com"
                    class="input pl-10 h-10"
                    v-model="registerData.email"
                    required
                  />
                </div>

                <div class="relative">
                  <Label for="register-password" class="mb-1 block text-sm">Senha</Label>
                  <Lock class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="register-password"
                    type="password"
                    placeholder="Mínimo 6 caracteres"
                    class="input pl-10 h-10"
                    v-model="registerData.password"
                    required
                  />
                </div>

                <div class="relative">
                  <Label for="register-confirm" class="mb-1 block text-sm">Confirmar senha</Label>
                  <Lock class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="register-confirm"
                    type="password"
                    placeholder="Digite a senha novamente"
                    class="input pl-10 h-10"
                    v-model="registerData.confirmPassword"
                    required
                  />
                </div>

                <button type="submit" class="btn-primary w-full h-10" :disabled="isLoading">
                  {{ isLoading ? 'Criando conta...' : 'Criar conta' }}
                </button>
              </form>
            </CardContent>
          </div>
        </TabsContent>
      </Tabs>

      <p class="text-center text-sm text-gray-500 mt-6">
        Sistema seguro e fácil de usar para gerenciar sua confeitaria
      </p>
    </div>
  </div>
</template>
